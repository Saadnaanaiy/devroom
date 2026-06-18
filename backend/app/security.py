import time
import html
import re
from functools import wraps
from flask import request, jsonify, current_app

# --- In-memory rate limiter (sliding window) ---
_limits = {}

def rate_limit(requests=30, window=60, identifier=None):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            key = identifier or f"{request.remote_addr}:{request.endpoint}"
            now = time.time()
            # cleanup old entries
            if key in _limits:
                _limits[key] = [t for t in _limits[key] if now - t < window]
            else:
                _limits[key] = []
            if len(_limits[key]) >= requests:
                return jsonify({'message': 'Too many requests. Please slow down.'}), 429
            _limits[key].append(now)
            return f(*args, **kwargs)
        return wrapped
    return decorator

# --- Input sanitization helpers ---
def sanitize_html(text):
    if not text:
        return text
    return html.escape(str(text), quote=True)

def strip_xss(text):
    if not text:
        return text
    text = str(text)
    text = re.sub(r'<[^>]*>', '', text)
    return text

def validate_password(password):
    if not password or len(password) < 8:
        return 'Password must be at least 8 characters'
    if not re.search(r'[A-Z]', password):
        return 'Password must include an uppercase letter'
    if not re.search(r'[a-z]', password):
        return 'Password must include a lowercase letter'
    if not re.search(r'[0-9]', password):
        return 'Password must include a number'
    if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-]', password):
        return 'Password must include a special character'
    return None

def validate_email(email):
    if not email:
        return 'Email is required'
    pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email.strip()):
        return 'Invalid email format'
    return None

def validate_length(value, field_name, max_len):
    if value and len(str(value)) > max_len:
        return f'{field_name} exceeds maximum length of {max_len} characters'
    return None

# --- Security headers ---
def add_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '0'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ws: wss:; media-src 'self' blob:; frame-src 'none'; object-src 'none'"
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response
