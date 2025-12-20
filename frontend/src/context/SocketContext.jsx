import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext'; // Using your context
import axios from 'axios';

export default function Sidebar({ onSelectChat, selectedChatId }) {
  const [conversations, setConversations] = useState([]);
  const { socket } = useSocket();

  const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  // 1. Initial Load of conversations
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/chats`, { withCredentials: true });
        setConversations(res.data);
      } catch (err) { console.error("Sidebar load error:", err); }
    };
    fetchChats();
  }, [API_URL]);

  // 2. The "Live" Magic: Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (payload) => {
      setConversations((prev) => {
        // Find the index of the chat that received a message
        const index = prev.findIndex(c => c._id === payload.chatId);

        if (index !== -1) {
          // CLONE AND UPDATE: Move existing chat to top
          const updatedList = [...prev];
          const chatToUpdate = { ...updatedList[index] };

          // Update message preview
          chatToUpdate.lastMessage = payload;
          
          // Increment unread count ONLY if we aren't currently looking at that chat
          if (selectedChatId !== payload.chatId) {
            chatToUpdate.unreadCount = (chatToUpdate.unreadCount || 0) + 1;
          }

          // Move to index 0 (Top of the sidebar)
          updatedList.splice(index, 1);
          return [chatToUpdate, ...updatedList];
        } else {
          // NEW CONVERSATION: If someone new messages you, 
          // fetch the sidebar again to get the full chat object
          fetchSidebarData(); 
          return prev;
        }
      });
    };

    const fetchSidebarData = async () => {
        const res = await axios.get(`${API_URL}/api/chats`, { withCredentials: true });
        setConversations(res.data);
    };

    // Listen for events from your socketHandler.js
    socket.on('sidebar_update', handleUpdate);
    socket.on('receive_message', handleUpdate);

    return () => {
      socket.off('sidebar_update', handleUpdate);
      socket.off('receive_message', handleUpdate);
    };
  }, [socket, selectedChatId, API_URL]);

  return (
    <div className="sidebar-container">
      {conversations.map((chat) => (
        <div 
          key={chat._id}
          onClick={() => onSelectChat(chat)}
          className={`chat-item ${selectedChatId === chat._id ? 'active' : ''}`}
        >
          <div className="chat-info">
            <span className="name">{chat.participants[0].username}</span>
            {chat.unreadCount > 0 && <span className="badge">{chat.unreadCount}</span>}
          </div>
          <p className="preview">{chat.lastMessage?.text}</p>
        </div>
      ))}
    </div>
  );
}