import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingStatus, setTypingStatus] = useState({});

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Connect to socket server
    // Since proxy is configured, we can connect to the same origin
    const newSocket = io({
      auth: { token },
      autoConnect: true,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log("[SocketContext] Connected to real-time chat server.");
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log("[SocketContext] Disconnected from server.");
    });

    newSocket.on('online_users_list', (users) => {
      setOnlineUsers(users);
    });

    newSocket.on('user_status_change', ({ user_id, status }) => {
      setOnlineUsers((prev) => {
        if (status === 'online') {
          if (!prev.includes(user_id)) return [...prev, user_id];
          return prev;
        } else {
          return prev.filter((id) => id !== user_id);
        }
      });
    });

    newSocket.on('user_typing_status', ({ room_id, user_id, username, is_typing }) => {
      setTypingStatus((prev) => {
        const roomTyping = prev[room_id] || {};
        if (is_typing) {
          roomTyping[username] = true;
        } else {
          delete roomTyping[username];
        }
        return {
          ...prev,
          [room_id]: { ...roomTyping }
        };
      });
    });

    setSocket(newSocket);

    // Clean up
    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, token]);

  const emitTyping = (roomId, isTyping) => {
    if (socket && isConnected) {
      socket.emit('typing', { room_id: roomId, is_typing: isTyping });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers, typingStatus, emitTyping }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};
