import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, ShieldCheck, Hash } from 'lucide-react';
import { useSocket } from '../src/context/SocketContext';
import { useAuth } from '../src/context/AuthContext';

export default function ChatWindow({ chat }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef();

  // 1. Load history from Bucket
  useEffect(() => {
    const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/chats/${chat._id}`, {
          withCredentials: true,
        });
        setMessages(res.data);
      } catch (err) {
        console.error("Fetch Messages Error:", err);
      }
    };
    fetchMessages();
    socket?.emit('join_chat', chat._id);
  }, [chat._id, socket]); // Added chat._id to dependency for stability

  // 2. Listen for real-time messages
  useEffect(() => {
    if (!socket) return;
    socket.on('receive_message', (msg) => {
      // Only add if it belongs to this chat and isn't a duplicate of our own local update
      if (msg.chatId === chat._id) {
        setMessages((prev) => {
          // Check if message already exists (prevents double messages for the sender)
          const exists = prev.find(m => m.timestamp === msg.timestamp && m.text === msg.text);
          return exists ? prev : [...prev, msg];
        });
      }
    });
    return () => socket.off('receive_message');
  }, [socket, chat._id]);

  // 3. Auto-scroll to bottom whenever messages change
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgData = {
      chatId: chat._id,
      senderId: user._id,
      text: newMessage,
      timestamp: new Date().toISOString(), // Generate timestamp immediately
    };

    // Emit to server
    socket.emit('send_message', msgData);

    // Update UI instantly for the sender (Zero-lag)
    setMessages((prev) => [...prev, msgData]);
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      {/* Top Bar */}
      <div className="p-6 border-b border-white/5 flex justify-between items-center backdrop-blur-md bg-black/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-900 rounded-xl border border-white/10">
            <Hash className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className="font-bold text-xl">
            {chat.participants.find(p => p._id !== user._id)?.username || "Chat"}
          </h2>
        </div>
        <ShieldCheck className="text-zinc-600 w-5 h-5" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m, i) => {
          const isMe = m.senderId === user._id;
          const time = m.timestamp 
            ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            : "";

          return (
            <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[70%] p-4 rounded-3xl text-sm ${
                isMe 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-zinc-900 text-zinc-100 rounded-tl-none border border-white/5'
              }`}>
                {m.text}
              </div>
              {/* Timestamp label */}
              <span className="text-[10px] text-zinc-500 mt-1 px-2 uppercase tracking-widest font-medium">
                {time}
              </span>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-6 bg-zinc-950/50">
        <div className="relative">
          <input 
            type="text"
            className="w-full bg-zinc-900 border border-white/10 rounded-[2rem] py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder:text-zinc-600"
            placeholder="Transmit message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button 
            type="submit" 
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 rounded-full hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </form>
    </div>
  );
}