import { saveMessageToBucket } from '../controllers/chatController.js'; 
import User from '../models/User.js';

let ioInstance; // To store the io instance for the controller to use

export const setupSocketEvents = (io) => {
    ioInstance = io; // Set the instance
    const onlineUsers = new Map(); 

    io.on('connection', (socket) => {
        console.log(`📡 Signal Established: ${socket.id}`);

        // 1. User Presence
        socket.on('user_online', async (userId) => {
            if (!userId) return;
            socket.userId = userId;
            onlineUsers.set(userId, socket.id); 

            await User.findByIdAndUpdate(userId, { "status.isOnline": true });
            
            io.emit('online_users_list', Array.from(onlineUsers.keys()));
            socket.broadcast.emit('user_status_change', { userId, isOnline: true });
        });

        // 2. Chat Room Management
        socket.on('join_chat', (chatId) => {
            socket.join(chatId.toString());
            console.log(`👤 User joined room: ${chatId}`);
        });

        socket.on('leave_chat', (chatId) => {
            socket.leave(chatId.toString());
            console.log(`👤 User left room: ${chatId}`);
        });

        // 3. Real-time Messaging
        socket.on('send_message', async (data) => {
            const { chatId, senderId, text, _id: tempId } = data;

            try {
                // Save to DB (The controller now handles the sidebar_update emit)
                const savedMsg = await saveMessageToBucket(chatId, senderId, text);

                const messagePayload = {
                    ...data,
                    _id: savedMsg._id, 
                    timestamp: savedMsg.timestamp
                };

                // Update Chat Window for Recipient
                socket.to(chatId.toString()).emit('receive_message', messagePayload);

                // Acknowledge back to Sender
                socket.emit('message_ack', { 
                    tempId: tempId, 
                    realId: savedMsg._id 
                });

                // Note: We removed the manual sidebar_update here because 
                // chatController.saveMessageToBucket now does it more reliably.

            } catch (err) {
                console.error("❌ Socket Transmission Error:", err);
                socket.emit('error', { message: "Signal failed to save" });
            }
        });

        // 4. Live Typing Indicator
        socket.on('typing', ({ chatId, typing }) => {
            socket.to(chatId.toString()).emit('typing_status', { chatId, typing });
        });

        // 5. Deletion Sync
        socket.on('delete_message', ({ chatId, messageId }) => {
            // This handles the immediate UI removal for the other person
            socket.to(chatId.toString()).emit('message_deleted', { messageId, chatId });
        });

        // 6. Disconnection
        socket.on('disconnect', async () => {
            if (socket.userId) {
                onlineUsers.delete(socket.userId);
                
                await User.findByIdAndUpdate(socket.userId, { 
                    "status.isOnline": false, 
                    "status.lastSeen": new Date() 
                });

                io.emit('online_users_list', Array.from(onlineUsers.keys()));
                io.emit('user_status_change', { userId: socket.userId, isOnline: false });
                console.log(`🔌 Signal Lost: ${socket.userId}`);
            }
        });
    });
};

// This allows the Controller to send signals
export const getIO = () => {
    if (!ioInstance) {
        throw new Error("Socket.io not initialized!");
    }
    return ioInstance;
};