import sys, os
sys.path.append(os.path.dirname(os.getcwd()))

from backend.app import create_app
from backend.app.models import db, User, Blog, Comment, Like, Rating, SavedBlog, ChatRoomMember, Message, DevRoom, ActivityLog
from datetime import datetime

app = create_app()
with app.app_context():
    user = User.query.get(4)
    if not user:
        print("User 4 not found")
        exit()

    user_id = user.id
    blog_ids = [b.id for b in user.blogs]

    try:
        # Delete comments on user's blogs
        if blog_ids:
            Comment.query.filter(Comment.blog_id.in_(blog_ids)).delete(synchronize_session=False)
            Like.query.filter(Like.blog_id.in_(blog_ids)).delete(synchronize_session=False)
            Rating.query.filter(Rating.blog_id.in_(blog_ids)).delete(synchronize_session=False)
            SavedBlog.query.filter(SavedBlog.blog_id.in_(blog_ids)).delete(synchronize_session=False)

        # Orphan replies
        Comment.query.filter(Comment.parent_id.in_(
            db.session.query(Comment.id).filter(Comment.user_id == user_id)
        )).update({'parent_id': None}, synchronize_session=False)

        Message.query.filter(Message.reply_to_id.in_(
            db.session.query(Message.id).filter(Message.sender_id == user_id)
        )).update({'reply_to_id': None}, synchronize_session=False)

        # Clear activity log
        ActivityLog.query.filter_by(user_id=user_id).update({'user_id': None}, synchronize_session=False)

        # Delete user's records
        Like.query.filter_by(user_id=user_id).delete()
        Rating.query.filter_by(user_id=user_id).delete()
        SavedBlog.query.filter_by(user_id=user_id).delete()
        ChatRoomMember.query.filter_by(user_id=user_id).delete()
        Message.query.filter_by(sender_id=user_id).delete()
        Comment.query.filter_by(user_id=user_id).delete()
        DevRoom.query.filter_by(creator_id=user_id).delete()
        Blog.query.filter_by(author_id=user_id).delete()

        db.session.delete(user)
        db.session.commit()
        print("User 4 deleted successfully")
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
