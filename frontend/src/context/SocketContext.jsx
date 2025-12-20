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
      // 1. Initialize connection with better stability settings
      const newSocket = io(API_URL, {
        withCredentials: true,
        query: { userId: user._id },
        transports: ['websocket'], // Prioritize websocket for speed
        reconnectionAttempts: 5,
      });

      setSocket(newSocket);

      // 2. Initial Setup
      newSocket.on('connect', () => {
        console.log("Connected to Aether Signal Grid");
        newSocket.emit('user_online', user._id);
      });

      // 3. LISTEN: Get the full list of online users
      newSocket.on('online_users_list', (users) => {
        setOnlineUsers(users);
      });

      // 4. LISTEN: Real-time status changes
      newSocket.on('user_status_change', ({ userId, isOnline }) => {
        setOnlineUsers(prev => {
          if (isOnline) {
            return prev.includes(userId) ? prev : [...prev, userId];
          }
          return prev.filter(id => id !== userId);
        });
      });

      // 5. Cleanup on logout/unmount
      return () => {
        newSocket.off('connect');
        newSocket.off('online_users_list');
        newSocket.off('user_status_change');
        newSocket.disconnect(); // Use disconnect for a cleaner exit
        setSocket(null);
      };
    } else {
      if (socket) {
        socket.disconnect();
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