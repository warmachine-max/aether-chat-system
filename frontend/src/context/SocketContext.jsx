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
      // 1. Initialize connection
      const newSocket = io(API_URL, {
        withCredentials: true,
        query: { userId: user._id },
        transports: ['websocket', 'polling']
      });

      setSocket(newSocket);

      // 2. Signal Presence
      newSocket.emit('user_online', user._id);

      // 3. LISTEN: Get the full list of online users immediately upon connection
      // This ensures the sidebar has green dots right away
      newSocket.on('online_users_list', (users) => {
        setOnlineUsers(users);
      });

      // 4. LISTEN: Real-time status changes (User logs in/out)
      newSocket.on('user_status_change', ({ userId, isOnline }) => {
        setOnlineUsers(prev => {
          if (isOnline) {
            return prev.includes(userId) ? prev : [...prev, userId];
          }
          return prev.filter(id => id !== userId);
        });
      });

      return () => {
        newSocket.off('online_users_list');
        newSocket.off('user_status_change');
        newSocket.close();
      };
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