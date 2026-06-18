import os
import secrets
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

# Generate strong random defaults only if not set in env
_default_secret = os.environ.get('SECRET_KEY') or secrets.token_hex(32)
_default_jwt = os.environ.get('JWT_SECRET_KEY') or secrets.token_hex(32)
_default_admin = os.environ.get('ADMIN_SECRET_KEY') or secrets.token_hex(16)

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', _default_secret)
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', _default_jwt)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)  # Reduced from 7 days
    ADMIN_SECRET_KEY = os.environ.get('ADMIN_SECRET_KEY', _default_admin)
    
    # Database configuration
    DB_USER = os.environ.get('DB_USER', 'root')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', '')
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_PORT = os.environ.get('DB_PORT', '3306')
    DB_NAME = os.environ.get('DB_NAME', 'devroom')
    DB_SSL = os.environ.get('DB_SSL', 'false').lower() == 'true'
    
    SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'connect_args': {
            'ssl': {'ssl_ca': os.environ.get('DB_SSL_CA', '/etc/ssl/certs/ca-certificates.crt')}
        }
    } if DB_SSL else {}
    
    # Email configuration (Resend)
    RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'noreply@devroom.app')
    DEV_EMAIL_OVERRIDE = os.environ.get('DEV_EMAIL_OVERRIDE', '')  # in dev, redirect all emails here
    
    # Frontend URL(s) for email links and CORS
    # Comma-separated: first URL is primary (used in emails), all are allowed for CORS
    _raw_frontend = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    FRONTEND_URL = _raw_frontend.split(',')[0].strip().rstrip('/')
    CORS_ORIGINS = [o.strip().rstrip('/') for o in _raw_frontend.split(',') if o.strip()]
    
    # Upload limits and paths
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB limit
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
