import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Send, ShieldCheck, Info, Phone, Video, MoreVertical, Trash2, Eraser } from 'lucide-react';
import { useSocket } from '../src/context/SocketContext';
import { useAuth } from '../src/context/AuthContext';

export default function ChatWindow({ chat }) {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const scrollRef = useRef();
  const menuRef = useRef();

  const otherUser = useMemo(() => 
    chat.participants.find(p => p._id !== user._id), 
  [chat, user._id]);

  const isOtherUserOnline = onlineUsers.includes(otherUser?._id);
  const API_URL = useMemo(() => import.meta.env.VITE_BACKEND_URL || "http://localhost:5000", []);

  // Close header menu on click outside
  useEffect(() => {
    const closeMenu = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  // 1. Fetch History
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/chats/${chat._id}`, { withCredentials: true });
        setMessages(res.data);
      } catch (err) { console.error("History fetch error:", err); }
    };
    
    fetchMessages();
    socket?.emit('join_chat', chat._id);
    return () => socket?.emit('leave_chat', chat._id);
  }, [chat._id, socket, API_URL]);

  // 2. Real-time Listeners (Including Deletion)
  useEffect(() => {
    if (!socket) return;

    socket.on('receive_message', (msg) => {
      if (msg.chatId === chat._id) {
        setMessages((prev) => [...prev, msg]);
        setOtherUserTyping(false);
      }
    });

    socket.on('message_deleted', ({ messageId }) => {
      setMessages((prev) => prev.filter(m => m._id !== messageId));
    });

    socket.on('typing_status', ({ chatId, typing }) => {
      if (chatId === chat._id) setOtherUserTyping(typing);
    });

    return () => {
      socket.off('receive_message');
      socket.off('message_deleted');
      socket.off('typing_status');
    };
  }, [socket, chat._id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherUserTyping]);

  // 3. Action Handlers
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    const msgData = {
      chatId: chat._id,
      senderId: user._id,
      recipientId: otherUser?._id,
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    socket.emit('send_message', msgData);
    setMessages((prev) => [...prev, msgData]);
    setNewMessage('');
    socket.emit('typing', { chatId: chat._id, typing: false });
  };

  const deleteMsg = async (messageId) => {
    try {
      await axios.delete(`${API_URL}/api/chats/${chat._id}/message/${messageId}`, { withCredentials: true });
      setMessages(prev => prev.filter(m => m._id !== messageId));
      socket.emit('delete_message', { chatId: chat._id, messageId });
    } catch (err) { console.error("Delete failed"); }
  };

  const clearChat = async () => {
    if (!window.confirm("Purge all local message history?")) return;
    try {
      await axios.delete(`${API_URL}/api/chats/${chat._id}/clear`, { withCredentials: true });
      setMessages([]);
      setShowMenu(false);
    } catch (err) { console.error("Clear failed"); }
  };

  const getMessageDateLabel = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Today";
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-zinc-100 relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center backdrop-blur-xl bg-black/40 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-white/10 font-bold text-blue-500">
              {otherUser?.username?.[0].toUpperCase()}
            </div>
            {isOtherUserOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050505]" />}
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-tight">{otherUser?.username || "Secure Line"}</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">{isOtherUserOnline ? 'Online' : 'Encrypted'}</p>
          </div>
        </div>

        <div className="flex items-center gap-5 text-zinc-500 relative" ref={menuRef}>
          <Phone className="w-4 h-4 hover:text-blue-400 cursor-pointer transition-colors" />
          <Video className="w-4 h-4 hover:text-blue-400 cursor-pointer transition-colors" />
          <MoreVertical 
            className={`w-4 h-4 cursor-pointer transition-colors ${showMenu ? 'text-white' : 'hover:text-blue-400'}`} 
            onClick={() => setShowMenu(!showMenu)}
          />
          
          {showMenu && (
            <div className="absolute right-0 top-10 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
              <button onClick={clearChat} className="w-full px-4 py-2.5 text-left text-xs font-bold uppercase tracking-tighter flex items-center gap-3 hover:bg-white/5 text-zinc-300">
                <Eraser className="w-3.5 h-3.5 text-blue-500" /> Clear History
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar">
        {messages.map((m, i) => {
          const isMe = m.senderId === user._id;
          const showTime = i === messages.length - 1 || messages[i+1]?.senderId !== m.senderId;
          const time = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const showDateDivider = i === 0 || getMessageDateLabel(m.timestamp) !== getMessageDateLabel(messages[i-1].timestamp);

          return (
            <React.Fragment key={m._id || i}>
              {showDateDivider && (
                <div className="flex justify-center my-6">
                  <span className="bg-zinc-900/50 text-zinc-500 text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-bold border border-white/5">
                    {getMessageDateLabel(m.timestamp)}
                  </span>
                </div>
              )}
              
              <div className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} ${showTime ? 'mb-4' : 'mb-1'}`}>
                <div className="flex items-center gap-2 max-w-[80%] relative">
                  {/* UN-SEND BUTTON (Shows on Hover for sender) */}
                  {isMe && m._id && (
                    <button 
                      onClick={() => deleteMsg(m._id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded-lg transition-all text-zinc-600 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className={`px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed ${
                    isMe ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-900/20' 
                         : 'bg-zinc-900 text-zinc-100 rounded-tl-none border border-white/5'
                  }`}>
                    {m.text}
                  </div>
                </div>
                {showTime && (
                  <span className="text-[9px] text-zinc-600 mt-1 px-1 font-bold uppercase tracking-tighter">
                    {time}
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
        {otherUserTyping && (
          <div className="flex flex-col items-start mb-4">
            <div className="bg-zinc-900 border border-white/5 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1.5">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-6 bg-transparent">
        <div className="relative flex items-center gap-3 max-w-5xl mx-auto w-full">
          <input 
            type="text"
            className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm text-white placeholder:text-zinc-600"
            placeholder="Write a message..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              if(!isTyping) {
                setIsTyping(true);
                socket.emit('typing', { chatId: chat._id, typing: true });
              }
            }}
          />
          <button type="submit" disabled={!newMessage.trim()} className="absolute right-2 p-3 bg-blue-600 rounded-xl hover:bg-blue-500 disabled:opacity-30 transition-all active:scale-95">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </form>
    </div>
  );
}