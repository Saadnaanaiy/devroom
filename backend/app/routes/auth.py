import os
from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import jwt
from datetime import datetime, timedelta
from functools import wraps
from backend.app.models import db, User, ActivityLog
from backend.config import Config
from backend.app.security import rate_limit, validate_password, validate_email, validate_length

auth_bp = Blueprint('auth', __name__)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Token format is invalid (Bearer <token>)'}), 401
                
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
            
        try:
            data = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
            current_user = User.query.get(data['id'])
            if not current_user:
                return jsonify({'message': 'User not found!'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid!'}), 401
            
        return f(current_user, *args, **kwargs)
        
    return decorated

def generate_token(user):
    payload = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role': user.role,
        'exp': datetime.utcnow() + Config.JWT_ACCESS_TOKEN_EXPIRES
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")

@auth_bp.route('/register', methods=['POST'])
@rate_limit(requests=3, window=300)
def register():
    is_multipart = request.content_type and 'multipart/form-data' in request.content_type
    
    if is_multipart:
        data = request.form
        avatar_file = request.files.get('avatar')
    else:
        data = request.get_json()
        avatar_file = None
        
    if not data:
        return jsonify({'message': 'No input data provided'}), 400
        
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password')
    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()
    phone = (data.get('phone') or '').strip()
    admin_key = data.get('admin_key', '')
    
    if not all([username, email, password, first_name, last_name]):
        return jsonify({'message': 'Missing required fields'}), 400
    
    val_error = validate_email(email)
    if val_error:
        return jsonify({'message': val_error}), 400
    
    val_error = validate_password(password)
    if val_error:
        return jsonify({'message': val_error}), 400
    
    for field, name, maxlen in [
        (username, 'Username', 80), (first_name, 'First name', 80),
        (last_name, 'Last name', 80), (phone, 'Phone', 20)
    ]:
        err = validate_length(field, name, maxlen)
        if err:
            return jsonify({'message': err}), 400
    
    if User.query.filter((User.username == username) | (User.email == email)).first():
        return jsonify({'message': 'Username or Email already registered'}), 409
        
    avatar_url = ''
    if avatar_file and avatar_file.filename and '.' in avatar_file.filename:
        ext = avatar_file.filename.rsplit('.', 1)[1].lower()
        if ext in Config.ALLOWED_EXTENSIONS:
            filename = secure_filename(avatar_file.filename)
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
            unique_filename = f"avatar_{timestamp}_{filename}"
            file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
            avatar_file.save(file_path)
            avatar_url = f"/static/uploads/{unique_filename}"
    elif data.get('avatar_url'):
        avatar_url = data.get('avatar_url')
        
    role = 'user'
    if admin_key and admin_key == Config.ADMIN_SECRET_KEY:
        role = 'admin'
        
    password_hash = generate_password_hash(password)
    new_user = User(
        username=username,
        email=email,
        password_hash=password_hash,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        role=role,
        avatar_url=avatar_url
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    log = ActivityLog(user_id=new_user.id, username=new_user.username, action='register', details='New user registered')
    db.session.add(log)
    db.session.commit()
    from backend.app.sockets import broadcast_activity
    broadcast_activity('register', new_user.username, 'New user registered')
    
    from backend.app.email_utils import send_verification_email
    token = jwt.encode({
        'user_id': new_user.id,
        'type': 'email_verification',
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, Config.JWT_SECRET_KEY, algorithm="HS256")
    sent, _ = send_verification_email(new_user.email, new_user.first_name, token)
    if not sent:
        return jsonify({
            'message': 'Account created. Could not send verification email. Try requesting a new one from your profile.',
            'user': new_user.to_dict()
        }), 201

    return jsonify({
        'message': 'Account created. Please check your email to verify your account.',
        'user': new_user.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
@rate_limit(requests=10, window=60)
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Username/Email and Password are required'}), 400
        
    identifier = data.get('username')
    password = data.get('password')
    
    user = User.query.filter((User.username == identifier) | (User.email == identifier)).first()
    
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'message': 'Invalid credentials'}), 401
        
    log = ActivityLog(user_id=user.id, username=user.username, action='login', details='User logged in')
    db.session.add(log)
    db.session.commit()
    from backend.app.sockets import broadcast_activity
    broadcast_activity('login', user.username, 'User logged in')
    
    token = generate_token(user)
    
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_me(current_user):
    return jsonify({'user': current_user.to_dict()}), 200

@auth_bp.route('/send-verification', methods=['POST'])
@token_required
@rate_limit(requests=2, window=300)
def send_verification(current_user):
    if current_user.is_verified:
        return jsonify({'message': 'Email already verified'}), 400

    from backend.app.email_utils import send_verification_email

    token = jwt.encode({
        'user_id': current_user.id,
        'type': 'email_verification',
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, Config.JWT_SECRET_KEY, algorithm="HS256")

    sent, _ = send_verification_email(current_user.email, current_user.first_name, token)
    if not sent:
        return jsonify({'message': 'Failed to send verification email. Please try again later.'}), 500

    return jsonify({'message': 'Verification email sent'}), 200


@auth_bp.route('/verify-email/<token>', methods=['GET'])
@rate_limit(requests=5, window=60)
def verify_email(token):
    try:
        data = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        if data.get('type') != 'email_verification':
            return jsonify({'message': 'Invalid token type'}), 400
    except jwt.ExpiredSignatureError:
        return jsonify({'message': 'Verification link has expired. Request a new one.'}), 400
    except jwt.InvalidTokenError:
        return jsonify({'message': 'Invalid verification token'}), 400

    user = User.query.get(data['user_id'])
    if not user:
        return jsonify({'message': 'User not found'}), 404
    if user.is_verified:
        return jsonify({'message': 'Email already verified'}), 200

    user.is_verified = True
    db.session.commit()
    return jsonify({'message': 'Email verified successfully'}), 200


@auth_bp.route('/forgot-password', methods=['POST'])
@rate_limit(requests=2, window=300)
def forgot_password():
    data = request.get_json()
    if not data or not data.get('email'):
        return jsonify({'message': 'Email is required'}), 400

    user = User.query.filter_by(email=data['email'].strip().lower()).first()
    if not user:
        return jsonify({'message': 'If that email is registered, a reset link has been sent.'}), 200

    from backend.app.email_utils import send_password_reset_email

    token = jwt.encode({
        'user_id': user.id,
        'type': 'password_reset',
        'exp': datetime.utcnow() + timedelta(hours=1)
    }, Config.JWT_SECRET_KEY, algorithm="HS256")

    sent, _ = send_password_reset_email(user.email, user.first_name, token)
    if not sent:
        return jsonify({'message': 'If that email is registered, a reset link has been sent.'}), 200

    return jsonify({'message': 'If that email is registered, a reset link has been sent.'}), 200


@auth_bp.route('/reset-password/<token>', methods=['POST'])
@rate_limit(requests=3, window=300)
def reset_password(token):
    try:
        data = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        if data.get('type') != 'password_reset':
            return jsonify({'message': 'Invalid token type'}), 400
    except jwt.ExpiredSignatureError:
        return jsonify({'message': 'Reset link has expired. Request a new one.'}), 400
    except jwt.InvalidTokenError:
        return jsonify({'message': 'Invalid reset token'}), 400

    req_data = request.get_json()
    if not req_data or not req_data.get('password'):
        return jsonify({'message': 'Password is required'}), 400

    new_password = req_data['password']
    val_error = validate_password(new_password)
    if val_error:
        return jsonify({'message': val_error}), 400

    user = User.query.get(data['user_id'])
    if not user:
        return jsonify({'message': 'User not found'}), 404

    user.password_hash = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({'message': 'Password reset successfully'}), 200


@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No input data provided'}), 400

    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()
    phone = (data.get('phone') or '').strip()

    if not first_name or not last_name:
        return jsonify({'message': 'First name and last name are required'}), 400
    
    for field, name, maxlen in [
        (first_name, 'First name', 80), (last_name, 'Last name', 80), (phone, 'Phone', 20)
    ]:
        err = validate_length(field, name, maxlen)
        if err:
            return jsonify({'message': err}), 400

    current_user.first_name = first_name
    current_user.last_name = last_name
    current_user.phone = phone if phone else None
    db.session.commit()

    return jsonify({
        'message': 'Profile updated successfully',
        'user': current_user.to_dict()
    }), 200


IMAGE_MAGIC_BYTES = {
    b'\x89PNG\r\n\x1a\n': 'png',
    b'\xff\xd8\xff': 'jpg',
    b'GIF87a': 'gif',
    b'GIF89a': 'gif',
    b'RIFF': 'webp',
}

def get_image_ext(data):
    for magic, ext in IMAGE_MAGIC_BYTES.items():
        if data.startswith(magic):
            return ext
    return None


@auth_bp.route('/upload-avatar', methods=['POST'])
@token_required
def upload_avatar(current_user):
    if 'avatar' not in request.files:
        return jsonify({'message': 'No avatar file provided'}), 400
        
    file = request.files['avatar']
    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400

    header = file.read(32)
    file.seek(0)
    ext = get_image_ext(header)
    if not ext or ext not in Config.ALLOWED_EXTENSIONS:
        return jsonify({'message': 'Invalid image file'}), 400
    
    filename = secure_filename(file.filename)
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')
    unique_filename = f"avatar_{timestamp}.{ext}"
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
    file.save(file_path)
    
    if current_user.avatar_url and current_user.avatar_url.startswith('/static/uploads/'):
        old_file = os.path.join(current_app.config['BASE_DIR'], current_user.avatar_url.lstrip('/'))
        if os.path.exists(old_file):
            try:
                os.remove(old_file)
            except Exception:
                pass
                
    current_user.avatar_url = f"/static/uploads/{unique_filename}"
    db.session.commit()
    
    return jsonify({
        'message': 'Avatar uploaded successfully',
        'avatar_url': current_user.avatar_url,
        'user': current_user.to_dict()
    }), 200
