from flask import Blueprint, request, jsonify
from sqlalchemy import func, text
from datetime import datetime, timedelta
from backend.app.models import db, User, Blog, Comment, Like, Rating, SavedBlog, ChatRoomMember, Message, ChatRoom, DevRoom, ActivityLog
from backend.app.routes.auth import token_required

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/stats', methods=['GET'])
@token_required
def get_admin_stats(current_user):
    if current_user.role != 'admin':
        return jsonify({'message': 'Admin only'}), 403

    total_users = User.query.count()
    total_dev_rooms = DevRoom.query.count()
    total_messages = Message.query.count()
    total_channels = ChatRoom.query.filter_by(type='channel').count()

    # Recent dev rooms
    recent_rooms = DevRoom.query.order_by(DevRoom.created_at.desc()).limit(10).all()

    # Recent users
    recent_users = User.query.order_by(User.created_at.desc()).limit(10).all()

    return jsonify({
        'stats': {
            'total_users': total_users,
            'total_dev_rooms': total_dev_rooms,
            'total_messages': total_messages,
            'total_channels': total_channels
        },
        'recent_rooms': [r.to_dict() for r in recent_rooms],
        'recent_users': [u.to_dict() for u in recent_users]
    }), 200

@admin_bp.route('/activity-log', methods=['GET'])
@token_required
def get_activity_log(current_user):
    if current_user.role != 'admin':
        return jsonify({'message': 'Admin only'}), 403

    logs = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(100).all()
    return jsonify([log.to_dict() for log in logs]), 200

@admin_bp.route('/trends', methods=['GET'])
@token_required
def get_trends(current_user):
    if current_user.role != 'admin':
        return jsonify({'message': 'Admin only'}), 403

    now = datetime.utcnow()
    thirty_days_ago = now - timedelta(days=30)

    # Users over time (last 30 days)
    users_over_time = db.session.execute(
        text("""
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM users
            WHERE created_at >= :start
            GROUP BY DATE(created_at)
            ORDER BY date
        """), {'start': thirty_days_ago}
    ).fetchall()

    # Messages over time (last 30 days)
    messages_over_time = db.session.execute(
        text("""
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM messages
            WHERE created_at >= :start
            GROUP BY DATE(created_at)
            ORDER BY date
        """), {'start': thirty_days_ago}
    ).fetchall()

    # Dev rooms over time (last 30 days)
    rooms_over_time = db.session.execute(
        text("""
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM dev_rooms
            WHERE created_at >= :start
            GROUP BY DATE(created_at)
            ORDER BY date
        """), {'start': thirty_days_ago}
    ).fetchall()

    # Fill in missing dates with 0
    def fill_dates(data, total_days=30):
        result = {}
        for row in data:
            date_str = row[0].strftime('%Y-%m-%d') if hasattr(row[0], 'strftime') else str(row[0])
            result[date_str] = row[1]
        filled = []
        for i in range(total_days - 1, -1, -1):
            d = (now - timedelta(days=i)).strftime('%Y-%m-%d')
            filled.append({'date': d, 'count': result.get(d, 0)})
        return filled

    return jsonify({
        'users_over_time': fill_dates(users_over_time),
        'messages_over_time': fill_dates(messages_over_time),
        'rooms_over_time': fill_dates(rooms_over_time)
    }), 200

@admin_bp.route('/users', methods=['GET'])
@token_required
def get_all_users(current_user):
    if current_user.role != 'admin':
        return jsonify({'message': 'Admin only'}), 403
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users]), 200

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@token_required
def update_user(current_user, user_id):
    if current_user.role != 'admin':
        return jsonify({'message': 'Admin only'}), 403
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}
    try:
        if 'username' in data and data['username'].strip():
            existing = User.query.filter(User.username == data['username'].strip(), User.id != user_id).first()
            if existing:
                return jsonify({'message': 'Username already taken'}), 409
            user.username = data['username'].strip()
        if 'email' in data and data['email'].strip():
            existing = User.query.filter(User.email == data['email'].strip(), User.id != user_id).first()
            if existing:
                return jsonify({'message': 'Email already registered'}), 409
            user.email = data['email'].strip()
        if 'first_name' in data and data['first_name'].strip():
            user.first_name = data['first_name'].strip()
        if 'last_name' in data and data['last_name'].strip():
            user.last_name = data['last_name'].strip()
        if 'role' in data and data['role'] in ('admin', 'user'):
            user.role = data['role']
        db.session.commit()
        log = ActivityLog(user_id=current_user.id, username=current_user.username, action='update_user', details=f'Updated user #{user_id}')
        db.session.add(log)
        db.session.commit()
        return jsonify(user.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Failed to update user: {str(e)}'}), 500

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@token_required
def delete_user(current_user, user_id):
    if current_user.role != 'admin':
        return jsonify({'message': 'Admin only'}), 403
    if user_id == current_user.id:
        return jsonify({'message': 'Cannot delete yourself'}), 400
    try:
        user = User.query.get_or_404(user_id)
        blog_ids = [b.id for b in user.blogs]

        if blog_ids:
            db.session.execute(text("SET FOREIGN_KEY_CHECKS=0"))
            Comment.query.filter(Comment.blog_id.in_(blog_ids)).delete(synchronize_session=False)
            db.session.execute(text("SET FOREIGN_KEY_CHECKS=1"))
            Like.query.filter(Like.blog_id.in_(blog_ids)).delete(synchronize_session=False)
            Rating.query.filter(Rating.blog_id.in_(blog_ids)).delete(synchronize_session=False)
            SavedBlog.query.filter(SavedBlog.blog_id.in_(blog_ids)).delete(synchronize_session=False)

        ActivityLog.query.filter_by(user_id=user_id).update({'user_id': None}, synchronize_session=False)

        Like.query.filter_by(user_id=user_id).delete()
        Rating.query.filter_by(user_id=user_id).delete()
        SavedBlog.query.filter_by(user_id=user_id).delete()

        dm_rooms = ChatRoom.query.join(ChatRoomMember).filter(
            ChatRoomMember.user_id == user_id,
            ChatRoom.type == 'direct'
        ).all()
        for room in dm_rooms:
            db.session.delete(room)

        ChatRoomMember.query.filter_by(user_id=user_id).delete()
        db.session.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        Message.query.filter_by(sender_id=user_id).delete(synchronize_session=False)
        Comment.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        db.session.execute(text("SET FOREIGN_KEY_CHECKS=1"))
        DevRoom.query.filter_by(creator_id=user_id).delete()
        Blog.query.filter_by(author_id=user_id).delete()

        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'User deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500
