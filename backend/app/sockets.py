from flask import request, session
from flask_socketio import emit, join_room, leave_room
import jwt
import time
from backend.config import Config
from backend.app.models import db, User, Message, ChatRoom, ChatRoomMember, ActivityLog
from backend.app.security import validate_length

# In-memory rate limiter per user per room (send_message)
_last_msg_time = {}

# Dictionary to track online users: {user_id: set(sid)}
# One user can have multiple sockets open (multiple tabs)
online_users = {}

# Track screen broadcasters per dev room: {dev_room_id: user_id}
broadcasters = {}
broadcaster_names = {}

def get_user_from_token(token):
    try:
        data = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        return User.query.get(data['id'])
    except Exception:
        return None

def init_socket_events(socketio):
    global _socketio_instance
    _socketio_instance = socketio
    
    @socketio.on('connect')
    def handle_connect(auth=None):
        token = None
        # Check token in auth payload (Standard socket.io client) or query params
        if auth and 'token' in auth:
            token = auth['token']
        else:
            # Fallback to query parameters
            token = request.args.get('token')
            
        if not token:
            print("[SocketIO] Connect rejected: No token provided.")
            return False  # Reject connection
            
        user = get_user_from_token(token)
        if not user:
            print("[SocketIO] Connect rejected: Invalid token.")
            return False  # Reject connection
            
        # Store user details in socket session context
        session['user_id'] = user.id
        session['username'] = user.username
        session['name'] = f"{user.first_name} {user.last_name}"
        
        # Track socket session id (sid)
        sid = request.sid
        if user.id not in online_users:
            online_users[user.id] = set()
            
        online_users[user.id].add(sid)
        
        # Notify others that this user went online
        socketio.emit('user_status_change', {
            'user_id': user.id,
            'status': 'online',
            'username': user.username
        })
        
        print(f"[SocketIO] Connected: {user.username} (sid: {sid}). Online users: {list(online_users.keys())}")
        
        # Send current online users list back to the connecting client
        emit('online_users_list', list(online_users.keys()))

    @socketio.on('disconnect')
    def handle_disconnect():
        user_id = session.get('user_id')
        sid = request.sid

        # Clean up any active broadcast by this user
        if user_id:
            for rid, bid in list(broadcasters.items()):
                if bid == user_id:
                    del broadcasters[rid]
                    broadcaster_names.pop(rid, None)
                    room_str = f"devroom_{rid}"
                    socketio.emit('broadcast_stopped', {}, room=room_str)
                    break
        
        if user_id in online_users:
            if sid in online_users[user_id]:
                online_users[user_id].remove(sid)
                
            if len(online_users[user_id]) == 0:
                del online_users[user_id]
                # Notify others user went offline
                socketio.emit('user_status_change', {
                    'user_id': user_id,
                    'status': 'offline',
                    'username': session.get('username')
                })
                
        print(f"[SocketIO] Disconnected: sid {sid}. Remaining online users: {list(online_users.keys())}")

    @socketio.on('join')
    def handle_join(data):
        room_id = data.get('room_id')
        if not room_id:
            return
            
        room_id_str = str(room_id)
        user_id = session.get('user_id')
        
        # Security check: if DM room, make sure user is a member
        room = ChatRoom.query.get(room_id)
        if room and room.type == 'direct':
            member = ChatRoomMember.query.filter_by(room_id=room_id, user_id=user_id).first()
            if not member:
                emit('error', {'message': 'Unauthorized to join this room.'})
                return
                
        join_room(room_id_str)
        print(f"[SocketIO] User {session.get('username')} joined room {room_id_str}")

    @socketio.on('leave')
    def handle_leave(data):
        room_id = data.get('room_id')
        if not room_id:
            return
        room_id_str = str(room_id)
        leave_room(room_id_str)
        print(f"[SocketIO] User {session.get('username')} left room {room_id_str}")

    @socketio.on('send_message')
    def handle_send_message(data):
        room_id = data.get('room_id')
        content = data.get('content')
        message_type = data.get('message_type', 'text')
        reply_to_id = data.get('reply_to_id')
        
        user_id = session.get('user_id')
        if not room_id or not content or not user_id:
            return
        
        # Rate limit: max 1 message per 300ms per room
        now = time.time()
        key = f"{user_id}:{room_id}"
        if key in _last_msg_time and now - _last_msg_time[key] < 0.3:
            return
        _last_msg_time[key] = now
        
        # Validate content length
        err = validate_length(content, 'Message', 10000)
        if err:
            emit('error', {'message': err})
            return
        
        # Security check: if DM room, verify membership
        room = ChatRoom.query.get(room_id)
        if not room:
            emit('error', {'message': 'Room not found.'})
            return
            
        if room.type == 'direct':
            member = ChatRoomMember.query.filter_by(room_id=room_id, user_id=user_id).first()
            if not member:
                emit('error', {'message': 'Unauthorized to message in this room.'})
                return
                
        # Validate reply_to_id if provided
        if reply_to_id:
            parent = Message.query.get(reply_to_id)
            if not parent or parent.room_id != room_id:
                reply_to_id = None
                
        # Save message to database
        new_msg = Message(
            room_id=room_id,
            sender_id=user_id,
            message_type=message_type,
            content=content,
            reply_to_id=reply_to_id
        )
        db.session.add(new_msg)
        db.session.commit()
        
        # Broadcast the message to all users in the room
        room_id_str = str(room_id)
        socketio.emit('new_message', new_msg.to_dict(), room=room_id_str)

        # Log message activity
        username = session.get('username')
        log = ActivityLog(user_id=user_id, username=username, action='send_message', details=f'Sent a message in room {room_id}')
        db.session.add(log)
        db.session.commit()
        broadcast_activity('send_message', username, f'Sent a message')
        
        # Trigger typing indicator false just in case
        socketio.emit('user_typing_status', {
            'room_id': room_id,
            'user_id': user_id,
            'username': session.get('username'),
            'is_typing': False
        }, room=room_id_str, include_self=False)

    @socketio.on('typing')
    def handle_typing(data):
        room_id = data.get('room_id')
        is_typing = data.get('is_typing', False)
        user_id = session.get('user_id')
        
        if not room_id or not user_id:
            return
            
        room_id_str = str(room_id)
        
        # Broadcast typing status to everyone else in the room
        socketio.emit('user_typing_status', {
            'room_id': room_id,
            'user_id': user_id,
            'username': session.get('username'),
            'is_typing': is_typing
        }, room=room_id_str, include_self=False)
        
    @socketio.on('check_online_status')
    def handle_check_status(data):
        target_user_id = data.get('user_id')
        if not target_user_id:
            return
        status = 'online' if target_user_id in online_users else 'offline'
        emit('user_status_response', {
            'user_id': target_user_id,
            'status': status
        })

    # ── Screen Broadcasting (Dev Rooms) ──────────────────────────────────
    @socketio.on('join_dev_room')
    def handle_join_dev_room(data):
        room_id = data.get('room_id')
        if not room_id:
            return
        room_str = f"devroom_{room_id}"
        join_room(room_str)
        # Notify room that user joined
        socketio.emit('dev_room_user_joined', {
            'user_id': session.get('user_id'),
            'username': session.get('username')
        }, room=room_str, include_self=False)
        # Tell the new user who's broadcasting (if anyone)
        rid = int(room_id)
        if rid in broadcasters:
            emit('broadcast_started', {
                'broadcaster_id': broadcasters[rid],
                'broadcaster_username': broadcaster_names.get(rid, '')
            })

    @socketio.on('leave_dev_room')
    def handle_leave_dev_room(data):
        room_id = data.get('room_id')
        if not room_id:
            return
        room_str = f"devroom_{room_id}"
        leave_room(room_str)
        socketio.emit('dev_room_user_left', {
            'user_id': session.get('user_id'),
            'username': session.get('username')
        }, room=room_str, include_self=False)

    @socketio.on('start_broadcast')
    def handle_start_broadcast(data):
        room_id = data.get('room_id')
        user_id = session.get('user_id')
        if not room_id or not user_id:
            return
        rid = int(room_id)
        if rid in broadcasters:
            emit('error', {'message': 'Someone is already broadcasting in this room'})
            return
        broadcasters[rid] = user_id
        broadcaster_names[rid] = session.get('username')
        room_str = f"devroom_{room_id}"
        socketio.emit('broadcast_started', {
            'broadcaster_id': user_id,
            'broadcaster_username': session.get('username')
        }, room=room_str)

    @socketio.on('stop_broadcast')
    def handle_stop_broadcast(data):
        room_id = data.get('room_id')
        user_id = session.get('user_id')
        if not room_id or not user_id:
            return
        rid = int(room_id)
        if rid in broadcasters and broadcasters[rid] == user_id:
            del broadcasters[rid]
            broadcaster_names.pop(rid, None)
            room_str = f"devroom_{room_id}"
            socketio.emit('broadcast_stopped', {}, room=room_str)

    @socketio.on('request_offer')
    def handle_request_offer(data):
        room_id = data.get('room_id')
        if not room_id:
            return
        room_str = f"devroom_{room_id}"
        socketio.emit('request_offer', {
            'requester_id': session.get('user_id'),
            'requester_name': session.get('username')
        }, room=room_str, include_self=False)

    # WebRTC signaling relay
    @socketio.on('broadcast_offer')
    def handle_broadcast_offer(data):
        room_id = data.get('room_id')
        offer = data.get('offer')
        target_id = data.get('target_id')
        if not room_id or not offer:
            return
        room_str = f"devroom_{room_id}"
        socketio.emit('broadcast_offer', {
            'offer': offer,
            'from_id': session.get('user_id'),
            'target_id': target_id
        }, room=room_str, include_self=False)

    @socketio.on('broadcast_answer')
    def handle_broadcast_answer(data):
        room_id = data.get('room_id')
        answer = data.get('answer')
        if not room_id or not answer:
            return
        room_str = f"devroom_{room_id}"
        socketio.emit('broadcast_answer', {
            'answer': answer,
            'from_id': session.get('user_id')
        }, room=room_str, include_self=False)

    @socketio.on('broadcast_ice_candidate')
    def handle_broadcast_ice(data):
        room_id = data.get('room_id')
        candidate = data.get('candidate')
        target_id = data.get('target_id')
        if not room_id or not candidate:
            return
        room_str = f"devroom_{room_id}"
        socketio.emit('broadcast_ice_candidate', {
            'candidate': candidate,
            'from_id': session.get('user_id'),
            'target_id': target_id
        }, room=room_str, include_self=False)

def broadcast_activity(action, username=None, details=None):
    """Broadcast user activity to all connected clients (admin dashboard listens)."""
    if _socketio_instance:
        from datetime import datetime
        data = {
            'action': action,
            'username': username or 'system',
            'details': details or '',
            'time': datetime.now().strftime('%H:%M:%S')
        }
        _socketio_instance.emit('user_activity', data)

# Expose for admin broadcast from other modules
_socketio_instance = None

def get_socketio():
    return _socketio_instance

def broadcast_admin_event(event_data):
    if _socketio_instance:
        _socketio_instance.emit('admin_event', event_data)
