import os
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from backend.config import Config, BASE_DIR
from backend.app.models import db
from backend.app.security import add_security_headers

# Initialize extensions
cors_origins = Config.CORS_ORIGINS if Config.CORS_ORIGINS else ['http://localhost:5173']
socketio = SocketIO(cors_allowed_origins=cors_origins)

def create_database_if_not_exists():
    """Auto-detects and creates the MySQL database if it does not exist."""
    db_user = Config.DB_USER
    db_password = Config.DB_PASSWORD
    db_host = Config.DB_HOST
    db_port = Config.DB_PORT
    db_name = Config.DB_NAME
    
    server_uri = f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/"
    
    try:
        engine = create_engine(server_uri)
        with engine.connect() as conn:
            conn.execute(text("CREATE DATABASE IF NOT EXISTS `{}`".format(db_name.replace('`', '``'))))
            conn.commit()
            print(f"[*] Database '{db_name}' verified / created successfully.")
    except SQLAlchemyError as e:
        print(f"[!] Warning: Could not auto-create database '{db_name}'. Error: {e}")

def create_app():
    # Attempt database creation first
    create_database_if_not_exists()
    
    app = Flask(__name__, static_folder=os.path.join(BASE_DIR, 'static'), static_url_path='/static')
    app.config.from_object(Config)
    app.config['BASE_DIR'] = BASE_DIR
    
    # Configure CORS — allow frontend origins (comma-separated in env)
    CORS(app, resources={r"/api/*": {"origins": cors_origins}}, supports_credentials=True)
    app.config['FRONTEND_URL'] = Config.FRONTEND_URL
    
    # Security headers on all responses
    app.after_request(add_security_headers)
    
    # Initialize extensions
    db.init_app(app)
    socketio.init_app(app)
    
    # Ensure static upload folder exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Register Blueprints
    from backend.app.routes.auth import auth_bp
    from backend.app.routes.blogs import blogs_bp
    from backend.app.routes.chat import chat_bp
    from backend.app.routes.devrooms import devrooms_bp
    from backend.app.routes.admin import admin_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(blogs_bp, url_prefix='/api/blogs')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(devrooms_bp, url_prefix='/api/devrooms')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    # Register WebSocket Event Listeners
    from backend.app.sockets import init_socket_events
    init_socket_events(socketio)
    
    with app.app_context():
        # Automatically create MySQL tables if they don't exist
        try:
            db.create_all()
            print("[*] Database tables created successfully.")
        except Exception as e:
            print(f"[!] Error creating database tables: {e}")

        # Migration: add is_protected column if missing
        try:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE chat_rooms ADD COLUMN is_protected BOOLEAN DEFAULT FALSE"))
                conn.commit()
                print("[*] Migration: added is_protected column to chat_rooms.")
        except Exception:
            pass  # Column already exists

        # Migration: add reply_to_id column to messages table if missing
        try:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE messages ADD COLUMN reply_to_id INTEGER DEFAULT NULL"))
                conn.commit()
                print("[*] Migration: added reply_to_id column to messages.")
        except Exception:
            pass  # Column already exists

        # Migration: add is_verified column to users table if missing
        try:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE"))
                conn.commit()
                print("[*] Migration: added is_verified column to users.")
        except Exception:
            pass  # Column already exists

        # Migration: add category column to blogs table if missing
        try:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE blogs ADD COLUMN category VARCHAR(80) DEFAULT 'General' NOT NULL"))
                conn.commit()
                print("[*] Migration: added category column to blogs.")
        except Exception:
            pass  # Column already exists

        # Seed default channels (#general)
        from backend.app.routes.chat import seed_default_channels
        seed_default_channels()
            
    return app
