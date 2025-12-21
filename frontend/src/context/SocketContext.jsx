import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext'; // To get the logged-in user's ID

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const { user } = useAuth(); // Assuming your AuthContext provides 'user'

    useEffect(() => {
        if (user?._id) {
            // 1. Initialize Connection
            const newSocket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5000", {
                withCredentials: true,
                transports: ['websocket']
            });

            // 2. Announce Presence
            newSocket.emit('user_online', user._id);

            // 3. Listen for Global Status Updates
            newSocket.on('online_users_list', (users) => {
                setOnlineUsers(users);
            });

            newSocket.on('user_status_change', ({ userId, isOnline }) => {
                setOnlineUsers(prev => {
                    if (isOnline && !prev.includes(userId)) return [...prev, userId];
                    if (!isOnline) return prev.filter(id => id !== userId);
                    return prev;
                });
            });

            setSocket(newSocket);

            // 4. Cleanup on Logout/Unmount
            return () => {
                newSocket.off('online_users_list');
                newSocket.off('user_status_change');
                newSocket.disconnect();
            };
        } else {
            // Disconnect if user logs out
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
        }
    }, [user?._id]);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
};