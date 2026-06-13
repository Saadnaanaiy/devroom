from flask import Blueprint, request, jsonify
from backend.app.models import db, DevRoom, ActivityLog
from backend.app.routes.auth import token_required

devrooms_bp = Blueprint('devrooms', __name__)

@devrooms_bp.route('', methods=['GET'])
@token_required
def get_dev_rooms(current_user):
    rooms = DevRoom.query.order_by(DevRoom.created_at.desc()).all()
    return jsonify([r.to_dict() for r in rooms]), 200

@devrooms_bp.route('', methods=['POST'])
@token_required
def create_dev_room(current_user):
    data = request.get_json() or {}
    name = data.get('name')
    if not name:
        return jsonify({'message': 'Room name is required'}), 400

    room = DevRoom(
        name=name,
        description=data.get('description', ''),
        github_url=data.get('github_url', ''),
        creator_id=current_user.id
    )
    db.session.add(room)
    db.session.commit()

    # Log activity
    log = ActivityLog(user_id=current_user.id, username=current_user.username, action='create_dev_room', details=f'Created dev room: {name}')
    db.session.add(log)
    db.session.commit()
    from backend.app.sockets import broadcast_activity
    broadcast_activity('create_dev_room', current_user.username, f'Created dev room: {name}')

    # Notify admins via broadcast (handled in sockets)
    from backend.app.sockets import broadcast_admin_event
    broadcast_admin_event({
        'type': 'dev_room_created',
        'room': room.to_dict(),
        'user': current_user.username
    })

    return jsonify(room.to_dict()), 201

@devrooms_bp.route('/<int:room_id>', methods=['GET'])
@token_required
def get_dev_room(current_user, room_id):
    room = DevRoom.query.get_or_404(room_id)
    return jsonify(room.to_dict()), 200

@devrooms_bp.route('/<int:room_id>', methods=['PUT'])
@token_required
def update_dev_room(current_user, room_id):
    room = DevRoom.query.get_or_404(room_id)
    if current_user.role != 'admin' and room.creator_id != current_user.id:
        return jsonify({'message': 'Not authorized'}), 403
    data = request.get_json() or {}
    # Non-admin creators can only edit name
    if current_user.role != 'admin' and room.creator_id == current_user.id:
        if 'name' in data and data['name'].strip():
            room.name = data['name'].strip()
        if 'description' in data or 'github_url' in data:
            return jsonify({'message': 'Only admins can edit description and github_url'}), 403
    else:
        if 'name' in data and data['name'].strip():
            room.name = data['name'].strip()
        if 'description' in data:
            room.description = data['description'].strip()
        if 'github_url' in data:
            room.github_url = data['github_url'].strip()
    db.session.commit()

    log = ActivityLog(user_id=current_user.id, username=current_user.username, action='update_dev_room', details=f'Updated dev room: {room.name}')
    db.session.add(log)
    db.session.commit()

    return jsonify(room.to_dict()), 200

@devrooms_bp.route('/<int:room_id>', methods=['DELETE'])
@token_required
def delete_dev_room(current_user, room_id):
    room = DevRoom.query.get_or_404(room_id)
    if current_user.role != 'admin':
        return jsonify({'message': 'Not authorized'}), 403
    db.session.delete(room)
    db.session.commit()

    log = ActivityLog(user_id=current_user.id, username=current_user.username, action='delete_dev_room', details=f'Deleted dev room: {room.name}')
    db.session.add(log)
    db.session.commit()
    from backend.app.sockets import broadcast_activity
    broadcast_activity('delete_dev_room', current_user.username, f'Deleted dev room: {room.name}')

    from backend.app.sockets import broadcast_admin_event
    broadcast_admin_event({
        'type': 'dev_room_deleted',
        'room_id': room_id,
        'user': current_user.username
    })

    return jsonify({'message': 'Room deleted'}), 200
