import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { useSocket } from '../src/context/SocketContext';
import axios from 'axios';

export default function Chat() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [conversations, setConversations] = useState([]);

  // Fetch sidebar data on mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/chats', { withCredentials: true });
        setConversations(res.data);
      } catch (err) {
        console.error("Failed to load chats");
      }
    };
    fetchConversations();
  }, []);

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden">
      {/* Sidebar - Fixed Width */}
      <div className="w-full md:w-[350px] border-r border-white/5 bg-zinc-950/50 backdrop-blur-xl">
        <Sidebar 
          conversations={conversations} 
          setSelectedChat={setSelectedChat} 
          selectedChat={selectedChat}
        />
      </div>

      {/* Chat Window - Flexible Width */}
      <div className="flex-1 flex flex-col relative">
        {selectedChat ? (
          <ChatWindow chat={selectedChat} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full opacity-20">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full blur-2xl animate-pulse mb-4" />
            <h2 className="text-xl font-black italic tracking-tighter">SELECT A SIGNAL</h2>
            <p className="text-sm">End-to-end encryption active</p>
          </div>
        )}
      </div>
    </div>
  );
}