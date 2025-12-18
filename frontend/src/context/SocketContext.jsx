import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    if (user) {
      // Initialize connection
      const newSocket = io(API_URL, {
  withCredentials: true,
  query: { userId: user._id },
  transports: ['websocket', 'polling'] // Recommended for better compatibility with Render
});

      setSocket(newSocket);

      // Tell backend we are online
      newSocket.emit('user_online', user._id);

      // Listen for global status updates (Green dots)
      newSocket.on('user_status_change', ({ userId, isOnline }) => {
        setOnlineUsers(prev => {
          if (isOnline) return [...new Set([...prev, userId])];
          return prev.filter(id => id !== userId);
        });
      });

      return () => newSocket.close();
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};