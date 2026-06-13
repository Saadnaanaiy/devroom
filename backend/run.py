import sys
import os

# Add the parent directory to the system path so Python can find the backend module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import create_app, socketio

app = create_app()

if __name__ == '__main__':
    # Run the SocketIO development server on port 5000
    print("[*] Starting DevRoom Flask + SocketIO backend on http://localhost:5000...")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
