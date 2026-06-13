from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from backend.app.security import sanitize_html

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='user')  # 'admin' or 'user'
    avatar_url = db.Column(db.String(255), nullable=True, default='')
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    blogs = db.relationship('Blog', backref='author', lazy=True)
    comments = db.relationship('Comment', backref='user', lazy=True)
    likes = db.relationship('Like', backref='user', lazy=True)
    ratings = db.relationship('Rating', backref='user', lazy=True)
    saves = db.relationship('SavedBlog', backref='user', lazy=True)
    room_memberships = db.relationship('ChatRoomMember', backref='user', lazy=True)
    messages = db.relationship('Message', backref='sender', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'role': self.role,
            'avatar_url': self.avatar_url,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else ''
        }

class Blog(db.Model):
    __tablename__ = 'blogs'
    
    id = db.Column(db.Integer, primary_key=True)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    summary = db.Column(db.Text, nullable=False)
    content = db.Column(db.Text, nullable=False)
    cover_image = db.Column(db.String(255), nullable=True, default='')
    category = db.Column(db.String(80), nullable=False, default='General')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    comments = db.relationship('Comment', backref='blog', cascade='all, delete-orphan', lazy=True)
    likes = db.relationship('Like', backref='blog', cascade='all, delete-orphan', lazy=True)
    ratings = db.relationship('Rating', backref='blog', cascade='all, delete-orphan', lazy=True)
    saves = db.relationship('SavedBlog', backref='blog', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        all_ratings = [r.rating for r in self.ratings]
        avg_rating = sum(all_ratings) / len(all_ratings) if all_ratings else 0
        return {
            'id': self.id,
            'author_id': self.author_id,
            'author_username': sanitize_html(self.author.username) if self.author else '[deleted]',
            'author_avatar': self.author.avatar_url if self.author else '',
            'title': sanitize_html(self.title),
            'summary': sanitize_html(self.summary),
            'content': sanitize_html(self.content),
            'cover_image': self.cover_image,
            'category': sanitize_html(self.category),
            'likes_count': len(self.likes),
            'rating_avg': round(avg_rating, 2),
            'ratings_count': len(all_ratings),
            'comments_count': len(self.comments),
            'created_at': self.created_at.isoformat() if self.created_at else ''
        }

class Comment(db.Model):
    __tablename__ = 'comments'
    
    id = db.Column(db.Integer, primary_key=True)
    blog_id = db.Column(db.Integer, db.ForeignKey('blogs.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('comments.id'), nullable=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Self-referential relationship for nested comments
    replies = db.relationship('Comment', backref=db.backref('parent', remote_side=[id]), cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'blog_id': self.blog_id,
            'user_id': self.user_id,
            'username': sanitize_html(self.user.username) if self.user else '[deleted]',
            'avatar_url': self.user.avatar_url if self.user else '',
            'parent_id': self.parent_id,
            'content': sanitize_html(self.content),
            'created_at': self.created_at.isoformat() if self.created_at else ''
        }

class Like(db.Model):
    __tablename__ = 'likes'
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    blog_id = db.Column(db.Integer, db.ForeignKey('blogs.id'), primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Rating(db.Model):
    __tablename__ = 'ratings'
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    blog_id = db.Column(db.Integer, db.ForeignKey('blogs.id'), primary_key=True)
    rating = db.Column(db.Integer, nullable=False)  # 1 to 5
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SavedBlog(db.Model):
    __tablename__ = 'saved_blogs'
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    blog_id = db.Column(db.Integer, db.ForeignKey('blogs.id'), primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class DevRoom(db.Model):
    __tablename__ = 'dev_rooms'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    github_url = db.Column(db.String(500), nullable=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    creator = db.relationship('User', backref='dev_rooms', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': sanitize_html(self.name),
            'description': sanitize_html(self.description) if self.description else '',
            'github_url': sanitize_html(self.github_url) if self.github_url else '',
            'creator_id': self.creator_id,
            'creator_name': sanitize_html(f"{self.creator.first_name} {self.creator.last_name}") if self.creator else 'Deleted User',
            'creator_username': sanitize_html(self.creator.username) if self.creator else '[deleted]',
            'creator_avatar': self.creator.avatar_url if self.creator else '',
            'created_at': self.created_at.isoformat() if self.created_at else ''
        }

class ChatRoom(db.Model):
    __tablename__ = 'chat_rooms'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=True)  # Name for channels, nullable for DMs
    type = db.Column(db.String(20), default='channel')  # 'channel' or 'direct'
    is_protected = db.Column(db.Boolean, default=False)  # Protected channels (e.g. #general) cannot be deleted
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    members = db.relationship('ChatRoomMember', backref='room', cascade='all, delete-orphan', lazy=True)
    messages = db.relationship('Message', backref='room', cascade='all, delete-orphan', lazy=True)

    def to_dict(self, current_user_id=None):
        room_dict = {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'is_protected': self.is_protected,
            'created_at': self.created_at.isoformat()
        }
        
        # If it's a DM room, we customize the room name for the current user
        if self.type == 'direct' and current_user_id:
            other_member = None
            for m in self.members:
                if m.user_id != current_user_id:
                    other_member = m.user
                    break
            if other_member:
                room_dict['name'] = f"{other_member.first_name} {other_member.last_name}" if other_member.first_name else 'Unknown User'
                room_dict['avatar_url'] = other_member.avatar_url or ''
                room_dict['other_user_id'] = other_member.id
                room_dict['other_user_status'] = 'offline'
            else:
                room_dict['name'] = 'Deleted User'
        
        return room_dict

class ChatRoomMember(db.Model):
    __tablename__ = 'chat_room_members'
    
    room_id = db.Column(db.Integer, db.ForeignKey('chat_rooms.id'), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

class ActivityLog(db.Model):
    __tablename__ = 'activity_log'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    username = db.Column(db.String(80))
    action = db.Column(db.String(50))  # register, login, create_blog, comment, like, save, rate, create_channel, send_message, create_dev_room, delete_dev_room
    details = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.username,
            'action': self.action,
            'details': self.details,
            'created_at': self.created_at.isoformat() if self.created_at else ''
        }

class Message(db.Model):
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('chat_rooms.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message_type = db.Column(db.String(20), default='text')  # 'text', 'code', 'image'
    content = db.Column(db.Text, nullable=False)
    reply_to_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    reply_to = db.relationship('Message', remote_side=[id], backref='replies')

    def to_dict(self):
        d = {
            'id': self.id,
            'room_id': self.room_id,
            'sender_id': self.sender_id,
            'sender_username': sanitize_html(self.sender.username) if self.sender else '[deleted]',
            'sender_avatar': self.sender.avatar_url if self.sender else '',
            'sender_name': sanitize_html(f"{self.sender.first_name} {self.sender.last_name}") if self.sender else 'Deleted User',
            'message_type': self.message_type,
            'content': sanitize_html(self.content),
            'reply_to_id': self.reply_to_id,
            'created_at': self.created_at.isoformat() if self.created_at else ''
        }
        if self.reply_to:
            d['reply_to'] = {
                'id': self.reply_to.id,
                'sender_id': self.reply_to.sender_id,
                'sender_username': sanitize_html(self.reply_to.sender.username) if self.reply_to.sender else '[deleted]',
                'content': sanitize_html(self.reply_to.content[:100]) + ('...' if len(self.reply_to.content) > 100 else ''),
                'message_type': self.reply_to.message_type
            }
        return d
