import os
from flask import Blueprint, request, jsonify, current_app
from backend.app.models import db, ChatRoom, ChatRoomMember, Message, User, ActivityLog
from backend.app.routes.auth import token_required
from backend.app.security import rate_limit
from backend.app.routes.auth import IMAGE_MAGIC_BYTES, get_image_ext
from backend.config import Config

chat_bp = Blueprint('chat', __name__)

def seed_default_channels():
    from backend.config import Config as AppConfig
    # Delete all unprotected channels and recreate #general
    old_channels = ChatRoom.query.filter_by(type='channel').all()
    for ch in old_channels:
        if not ch.is_protected:
            # Delete associated messages and members
            Message.query.filter_by(room_id=ch.id).delete()
            ChatRoomMember.query.filter_by(room_id=ch.id).delete()
            db.session.delete(ch)

    # Ensure #general exists
    general = ChatRoom.query.filter_by(name='general', type='channel').first()
    if not general:
        general = ChatRoom(name='general', type='channel', is_protected=True)
        db.session.add(general)
    else:
        general.is_protected = True

    db.session.commit()

@chat_bp.route('/rooms', methods=['GET'])
@token_required
def get_rooms(current_user):
    # All users can see channels now
    channels = ChatRoom.query.filter_by(type='channel').all()
    channels_data = [ch.to_dict(current_user.id) for ch in channels]

    # Fetch direct message rooms where the user is a member
    memberships = ChatRoomMember.query.filter_by(user_id=current_user.id).all()
    dm_rooms_data = []

    for member in memberships:
        room = member.room
        if room.type == 'direct':
            # Skip orphaned DM rooms (shouldn't happen, but safety net)
            if len(room.members) < 2:
                continue
            dm_rooms_data.append(room.to_dict(current_user.id))

    return jsonify({
        'channels': channels_data,
        'dms': dm_rooms_data
    }), 200


@chat_bp.route('/rooms', methods=['POST'])
@token_required
def create_channel(current_user):
    # Admin-only channel creation
    if current_user.role != 'admin':
        return jsonify({'message': 'Only admins can create channels'}), 403

    data = request.get_json() or {}
    name = data.get('name')
    if not name:
        return jsonify({'message': 'Channel name is required'}), 400

    # Ensure unique channel name
    if ChatRoom.query.filter_by(name=name, type='channel').first():
        return jsonify({'message': 'Channel with that name already exists'}), 409

    new_channel = ChatRoom(name=name, type='channel')
    db.session.add(new_channel)
    db.session.commit()

    log = ActivityLog(user_id=current_user.id, username=current_user.username, action='create_channel', details=f'Created channel: #{name}')
    db.session.add(log)
    db.session.commit()
    from backend.app.sockets import broadcast_activity
    broadcast_activity('create_channel', current_user.username, f'Created channel: #{name}')

    return jsonify(new_channel.to_dict(current_user.id)), 201

@chat_bp.route('/rooms/<int:room_id>/messages', methods=['GET'])
@token_required
def get_room_messages(current_user, room_id):
    room = ChatRoom.query.get_or_404(room_id)

    # If room is a DM, verify the user is a member
    if room.type == 'direct':
        member = ChatRoomMember.query.filter_by(room_id=room_id, user_id=current_user.id).first()
        if not member:
            return jsonify({'message': 'Access forbidden: You are not a member of this chat'}), 403

    # Fetch last 100 messages, oldest to newest
    messages = Message.query.filter_by(room_id=room_id).order_by(Message.created_at.desc()).limit(100).all()
    # Reverse to return oldest first
    messages_data = [msg.to_dict() for msg in reversed(messages)]

    return jsonify(messages_data), 200

@chat_bp.route('/rooms/direct', methods=['POST'])
@token_required
def create_direct_room(current_user):
    data = request.get_json()
    if not data or not data.get('recipient_id'):
        return jsonify({'message': 'Recipient ID is required'}), 400

    recipient_id = int(data['recipient_id'])
    if recipient_id == current_user.id:
        return jsonify({'message': 'Cannot create a DM with yourself'}), 400

    # Verify recipient exists
    recipient = User.query.get_or_404(recipient_id)

    # Check if a direct room already exists between current_user and recipient
    # Find all direct rooms for current_user
    user_rooms = ChatRoomMember.query.filter_by(user_id=current_user.id).all()
    room_ids = [ur.room_id for ur in user_rooms]

    # Check if recipient is in any of those rooms
    existing_member = ChatRoomMember.query.filter(
        ChatRoomMember.room_id.in_(room_ids),
        ChatRoomMember.user_id == recipient_id
    ).first()

    if existing_member:
        # Verify the room type is actually direct
        existing_room = ChatRoom.query.get(existing_member.room_id)
        if existing_room.type == 'direct':
            return jsonify(existing_room.to_dict(current_user.id)), 200

    # Create new DM room
    new_room = ChatRoom(type='direct')
    db.session.add(new_room)
    db.session.commit()

    # Add members
    member_1 = ChatRoomMember(room_id=new_room.id, user_id=current_user.id)
    member_2 = ChatRoomMember(room_id=new_room.id, user_id=recipient_id)
    db.session.add_all([member_1, member_2])
    db.session.commit()

    return jsonify(new_room.to_dict(current_user.id)), 201

@chat_bp.route('/upload', methods=['POST'])
@token_required
@rate_limit(requests=10, window=60)
def upload_chat_image(current_user):
    if 'file' not in request.files:
        return jsonify({'message': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400

    header = file.read(32)
    file.seek(0)
    ext = get_image_ext(header)
    if not ext or ext not in Config.ALLOWED_EXTENSIONS:
        return jsonify({'message': 'Invalid image file'}), 400

    from werkzeug.utils import secure_filename
    from datetime import datetime

    filename = secure_filename(file.filename)
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
    unique_filename = f"chat_{timestamp}.{ext}"
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
    file.save(file_path)

    file_url = f"/static/uploads/{unique_filename}"
    return jsonify({'file_url': file_url}), 200

@chat_bp.route('/users', methods=['GET'])
@token_required
def get_users_list(current_user):
    users = User.query.filter(User.id != current_user.id).all()
    return jsonify([u.to_dict() for u in users]), 200

@chat_bp.route('/rooms/<int:room_id>', methods=['PUT'])
@token_required
def update_channel(current_user, room_id):
    if current_user.role != 'admin':
        return jsonify({'message': 'Admins only'}), 403
    room = ChatRoom.query.get_or_404(room_id)
    if room.type != 'channel':
        return jsonify({'message': 'Not a channel'}), 400
    data = request.get_json() or {}
    name = data.get('name')
    if not name or not name.strip():
        return jsonify({'message': 'Channel name is required'}), 400
    if ChatRoom.query.filter(ChatRoom.name == name.strip(), ChatRoom.type == 'channel', ChatRoom.id != room_id).first():
        return jsonify({'message': 'Channel name already exists'}), 409
    room.name = name.strip()
    db.session.commit()
    log = ActivityLog(user_id=current_user.id, username=current_user.username, action='update_channel', details=f'Renamed channel: #{room.name}')
    db.session.add(log)
    db.session.commit()
    from backend.app.sockets import broadcast_activity
    broadcast_activity('update_channel', current_user.username, f'Renamed channel: #{room.name}')
    return jsonify(room.to_dict(current_user.id)), 200

@chat_bp.route('/rooms/<int:room_id>', methods=['DELETE'])
@token_required
def delete_channel(current_user, room_id):
    if current_user.role != 'admin':
        return jsonify({'message': 'Admins only'}), 403
    room = ChatRoom.query.get_or_404(room_id)
    if room.type != 'channel':
        return jsonify({'message': 'Not a channel'}), 400
    if room.is_protected:
        return jsonify({'message': 'Protected channels cannot be deleted'}), 403
    Message.query.filter_by(room_id=room_id).delete()
    ChatRoomMember.query.filter_by(room_id=room_id).delete()
    db.session.delete(room)
    db.session.commit()
    log = ActivityLog(user_id=current_user.id, username=current_user.username, action='delete_channel', details=f'Deleted channel: #{room.name}')
    db.session.add(log)
    db.session.commit()
    from backend.app.sockets import broadcast_activity
    broadcast_activity('delete_channel', current_user.username, f'Deleted channel: #{room.name}')
    return jsonify({'message': 'Channel deleted'}), 200

@chat_bp.route('/messages/<int:room_id>', methods=['DELETE'])
@token_required
def clear_chat_messages(current_user, room_id):
    room = ChatRoom.query.get_or_404(room_id)
    if current_user.role != 'admin' and room.type != 'direct':
        return jsonify({'message': 'Not authorized'}), 403
    if room.type == 'direct':
        member = ChatRoomMember.query.filter_by(room_id=room_id, user_id=current_user.id).first()
        if not member:
            return jsonify({'message': 'Not authorized'}), 403
    Message.query.filter_by(room_id=room_id).delete()
    db.session.commit()
    return jsonify({'message': 'Chat cleared'}), 200
