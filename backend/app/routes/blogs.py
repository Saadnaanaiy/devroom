import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from datetime import datetime
from backend.app.models import db, Blog, Comment, Like, Rating, SavedBlog, ActivityLog
from backend.app.routes.auth import token_required
from backend.app.security import rate_limit, validate_length
from backend.app.routes.auth import IMAGE_MAGIC_BYTES, get_image_ext
from backend.config import Config

blogs_bp = Blueprint('blogs', __name__)

@blogs_bp.route('', methods=['GET'])
def get_all_blogs():
    category = request.args.get('category')
    query = Blog.query
    if category:
        query = query.filter(Blog.category == category)
    blogs = query.order_by(Blog.created_at.desc()).all()
    return jsonify([blog.to_dict() for blog in blogs]), 200

@blogs_bp.route('/<int:blog_id>', methods=['GET'])
def get_blog(blog_id):
    blog = Blog.query.get_or_404(blog_id)
    
    # Check if current user has liked, rated or saved (optional auth)
    has_liked = False
    has_saved = False
    user_rating = 0
    
    auth_header = request.headers.get('Authorization')
    if auth_header and len(auth_header.split(" ")) > 1:
        try:
            token = auth_header.split(" ")[1]
            import jwt
            from backend.config import Config
            data = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
            user_id = data['id']
            
            has_liked = Like.query.filter_by(user_id=user_id, blog_id=blog_id).first() is not None
            has_saved = SavedBlog.query.filter_by(user_id=user_id, blog_id=blog_id).first() is not None
            rating_entry = Rating.query.filter_by(user_id=user_id, blog_id=blog_id).first()
            if rating_entry:
                user_rating = rating_entry.rating
        except Exception:
            pass # Ignore token issues on read-only endpoints

    # Build nested comments list
    comments = Comment.query.filter_by(blog_id=blog_id, parent_id=None).order_by(Comment.created_at.asc()).all()
    
    def get_comment_tree(comment_list):
        tree = []
        for comment in comment_list:
            comment_dict = comment.to_dict()
            if comment.replies:
                comment_dict['replies'] = get_comment_tree(comment.replies)
            else:
                comment_dict['replies'] = []
            tree.append(comment_dict)
        return tree
        
    comments_tree = get_comment_tree(comments)
    
    blog_data = blog.to_dict()
    blog_data['user_interactions'] = {
        'liked': has_liked,
        'saved': has_saved,
        'rating': user_rating
    }
    blog_data['comments_tree'] = comments_tree
    
    return jsonify(blog_data), 200

@blogs_bp.route('', methods=['POST'])
@token_required
def create_blog(current_user):
    if current_user.role != 'admin':
        return jsonify({'message': 'Access forbidden: Admins only'}), 403
        
    is_multipart = request.content_type and 'multipart/form-data' in request.content_type
    
    if is_multipart:
        data = request.form
        cover_file = request.files.get('cover_image')
    else:
        data = request.get_json()
        cover_file = None
        
    if not data:
        return jsonify({'message': 'No input data provided'}), 400
        
    title = data.get('title')
    summary = data.get('summary')
    content = data.get('content')
    category = data.get('category', 'General')
    
    if not all([title, summary, content]):
        return jsonify({'message': 'Missing required fields (title, summary, content)'}), 400

    for field, name, maxlen in [
        (title, 'Title', 255), (summary, 'Summary', 1000), (content, 'Content', 100000), (category, 'Category', 80)
    ]:
        err = validate_length(field, name, maxlen)
        if err:
            return jsonify({'message': err}), 400
        
    cover_image_url = ''
    if cover_file:
        header = cover_file.read(32)
        cover_file.seek(0)
        ext = get_image_ext(header)
        if ext and ext in Config.ALLOWED_EXTENSIONS:
            filename = secure_filename(cover_file.filename)
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
            unique_filename = f"blog_{timestamp}_{filename}"
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            cover_file.save(file_path)
            cover_image_url = f"/static/uploads/{unique_filename}"
    elif data.get('cover_image'):
        cover_image_url = data.get('cover_image')
        
    new_blog = Blog(
        author_id=current_user.id,
        title=title,
        summary=summary,
        content=content,
        cover_image=cover_image_url,
        category=category
    )
    
    db.session.add(new_blog)
    db.session.commit()
    
    log = ActivityLog(user_id=current_user.id, username=current_user.username, action='create_blog', details=f'Created blog: {title}')
    db.session.add(log)
    db.session.commit()
    from backend.app.sockets import broadcast_activity
    broadcast_activity('create_blog', current_user.username, f'Created blog: {title}')
    
    return jsonify({
        'message': 'Blog created successfully',
        'blog': new_blog.to_dict()
    }), 201

@blogs_bp.route('/<int:blog_id>', methods=['PUT'])
@token_required
def update_blog(current_user, blog_id):
    if current_user.role != 'admin':
        return jsonify({'message': 'Access forbidden: Admins only'}), 403
        
    blog = Blog.query.get_or_404(blog_id)
    
    is_multipart = request.content_type and 'multipart/form-data' in request.content_type
    if is_multipart:
        data = request.form
        cover_file = request.files.get('cover_image')
    else:
        data = request.get_json()
        cover_file = None
        
    if not data:
        return jsonify({'message': 'No input data provided'}), 400
        
    blog.title = data.get('title', blog.title)
    blog.summary = data.get('summary', blog.summary)
    blog.content = data.get('content', blog.content)
    blog.category = data.get('category', blog.category)

    for field, name, maxlen in [
        (blog.title, 'Title', 255), (blog.summary, 'Summary', 1000), (blog.category, 'Category', 80)
    ]:
        err = validate_length(field, name, maxlen)
        if err:
            return jsonify({'message': err}), 400
    
    if cover_file:
        header = cover_file.read(32)
        cover_file.seek(0)
        ext = get_image_ext(header)
        if ext and ext in Config.ALLOWED_EXTENSIONS:
            filename = secure_filename(cover_file.filename)
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
            unique_filename = f"blog_{timestamp}_{filename}"
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            cover_file.save(file_path)
            
            if blog.cover_image and blog.cover_image.startswith('/static/uploads/'):
                old_file = os.path.join(current_app.config['BASE_DIR'], blog.cover_image.lstrip('/'))
                if os.path.exists(old_file):
                    try:
                        os.remove(old_file)
                    except Exception:
                        pass
            blog.cover_image = f"/static/uploads/{unique_filename}"
    elif 'cover_image' in data and data.get('cover_image') != blog.cover_image:
        blog.cover_image = data.get('cover_image')
        
    db.session.commit()
    return jsonify({
        'message': 'Blog updated successfully',
        'blog': blog.to_dict()
    }), 200

@blogs_bp.route('/<int:blog_id>', methods=['DELETE'])
@token_required
def delete_blog(current_user, blog_id):
    if current_user.role != 'admin':
        return jsonify({'message': 'Access forbidden: Admins only'}), 403
        
    blog = Blog.query.get_or_404(blog_id)
    
    # Delete cover image if local
    if blog.cover_image and blog.cover_image.startswith('/static/uploads/'):
        file_path = os.path.join(current_app.config['BASE_DIR'], blog.cover_image.lstrip('/'))
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

    # Orphan comment replies before deleting
    Comment.query.filter(Comment.parent_id.in_(
        db.session.query(Comment.id).filter(Comment.blog_id == blog_id)
    )).update({'parent_id': None}, synchronize_session=False)

    # Delete related records to avoid FK violations
    Comment.query.filter_by(blog_id=blog_id).delete()
    Like.query.filter_by(blog_id=blog_id).delete()
    Rating.query.filter_by(blog_id=blog_id).delete()
    SavedBlog.query.filter_by(blog_id=blog_id).delete()
                
    db.session.delete(blog)
    db.session.commit()
    return jsonify({'message': 'Blog deleted successfully'}), 200

@blogs_bp.route('/<int:blog_id>/like', methods=['POST'])
@token_required
def toggle_like(current_user, blog_id):
    Blog.query.get_or_404(blog_id)
    like = Like.query.filter_by(user_id=current_user.id, blog_id=blog_id).first()
    
    if like:
        db.session.delete(like)
        db.session.commit()
        return jsonify({'message': 'Blog unliked', 'liked': False}), 200
    else:
        new_like = Like(user_id=current_user.id, blog_id=blog_id)
        db.session.add(new_like)
        db.session.commit()
        return jsonify({'message': 'Blog liked', 'liked': True}), 200

@blogs_bp.route('/<int:blog_id>/save', methods=['POST'])
@token_required
def toggle_save(current_user, blog_id):
    Blog.query.get_or_404(blog_id)
    save = SavedBlog.query.filter_by(user_id=current_user.id, blog_id=blog_id).first()
    
    if save:
        db.session.delete(save)
        db.session.commit()
        return jsonify({'message': 'Blog unsaved', 'saved': False}), 200
    else:
        new_save = SavedBlog(user_id=current_user.id, blog_id=blog_id)
        db.session.add(new_save)
        db.session.commit()
        return jsonify({'message': 'Blog saved', 'saved': True}), 200

@blogs_bp.route('/<int:blog_id>/rate', methods=['POST'])
@token_required
@rate_limit(requests=10, window=60)
def rate_blog(current_user, blog_id):
    Blog.query.get_or_404(blog_id)
    data = request.get_json()
    
    if not data or 'rating' not in data:
        return jsonify({'message': 'Rating score is required'}), 400
        
    rating_score = int(data['rating'])
    if rating_score < 1 or rating_score > 5:
        return jsonify({'message': 'Rating must be between 1 and 5'}), 400
        
    rating_entry = Rating.query.filter_by(user_id=current_user.id, blog_id=blog_id).first()
    
    if rating_entry:
        rating_entry.rating = rating_score
    else:
        rating_entry = Rating(user_id=current_user.id, blog_id=blog_id, rating=rating_score)
        db.session.add(rating_entry)
        
    db.session.commit()
    
    # Fetch updated average
    blog = Blog.query.get(blog_id)
    all_ratings = [r.rating for r in blog.ratings]
    avg_rating = sum(all_ratings) / len(all_ratings) if all_ratings else 0
    
    return jsonify({
        'message': 'Blog rated successfully',
        'rating': rating_score,
        'rating_avg': round(avg_rating, 2),
        'ratings_count': len(all_ratings)
    }), 200

@blogs_bp.route('/<int:blog_id>/comment', methods=['POST'])
@token_required
@rate_limit(requests=5, window=30)
def post_comment(current_user, blog_id):
    Blog.query.get_or_404(blog_id)
    data = request.get_json()
    
    if not data or not data.get('content'):
        return jsonify({'message': 'Comment content cannot be empty'}), 400
        
    content = data.get('content')
    parent_id = data.get('parent_id')
    
    if not content or not content.strip():
        return jsonify({'message': 'Comment content cannot be empty'}), 400
    
    err = validate_length(content, 'Comment', 5000)
    if err:
        return jsonify({'message': err}), 400
    
    if parent_id:
        parent_comment = Comment.query.get(parent_id)
        if not parent_comment or parent_comment.blog_id != blog_id:
            return jsonify({'message': 'Invalid parent comment ID'}), 400
            
    new_comment = Comment(
        blog_id=blog_id,
        user_id=current_user.id,
        parent_id=parent_id,
        content=content
    )
    
    db.session.add(new_comment)
    db.session.commit()
    
    log = ActivityLog(user_id=current_user.id, username=current_user.username, action='comment', details='Posted a comment on a blog')
    db.session.add(log)
    db.session.commit()
    from backend.app.sockets import broadcast_activity
    broadcast_activity('comment', current_user.username, 'Posted a comment on a blog')
    
    return jsonify({
        'message': 'Comment added successfully',
        'comment': new_comment.to_dict()
    }), 201

@blogs_bp.route('/saved', methods=['GET'])
@token_required
def get_saved_blogs(current_user):
    saves = SavedBlog.query.filter_by(user_id=current_user.id).order_by(SavedBlog.created_at.desc()).all()
    saved_blogs = [save.blog.to_dict() for save in saves]
    return jsonify(saved_blogs), 200

@blogs_bp.route('/liked', methods=['GET'])
@token_required
def get_liked_blogs(current_user):
    from backend.app.models import Like
    likes = Like.query.filter_by(user_id=current_user.id).order_by(Like.created_at.desc()).all()
    liked_blogs = [like.blog.to_dict() for like in likes]
    return jsonify(liked_blogs), 200


@blogs_bp.route('/categories', methods=['GET'])
def get_categories():
    categories = db.session.query(Blog.category).distinct().order_by(Blog.category).all()
    return jsonify([c[0] for c in categories if c[0]]), 200
