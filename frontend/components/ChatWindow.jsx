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

  // Load history from Bucket
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/chats/${chat._id}`, { withCredentials: true });
        setMessages(res.data);
      } catch (err) { console.error(err); }
    };
    fetchMessages();
    socket?.emit('join_chat', chat._id);
  }, [chat, socket]);

  // Listen for real-time messages
  useEffect(() => {
    if (!socket) return;
    socket.on('receive_message', (msg) => {
      if (msg.chatId === chat._id) {
        setMessages(prev => [...prev, msg]);
      }
    });
    return () => socket.off('receive_message');
  }, [socket, chat]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgData = {
      chatId: chat._id,
      senderId: user._id,
      text: newMessage,
    };

    socket.emit('send_message', msgData);
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
          <h2 className="font-bold text-xl">{chat.participants[0]?.username}</h2>
        </div>
        <ShieldCheck className="text-zinc-600 w-5 h-5" />
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.senderId === user._id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] p-4 rounded-3xl text-sm ${
              m.senderId === user._id 
              ? 'bg-blue-600 text-white rounded-tr-none' 
              : 'bg-zinc-900 text-zinc-100 rounded-tl-none border border-white/5'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-6 bg-zinc-950/50">
        <div className="relative">
          <input 
            type="text"
            className="w-full bg-zinc-900 border border-white/10 rounded-[2rem] py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="Transmit message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 rounded-full hover:bg-blue-500 transition-colors">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </form>
    </div>
  );
}