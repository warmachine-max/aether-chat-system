import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Send, Phone, Video, MoreVertical, Trash2, Eraser } from 'lucide-react';
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

  // 2. Real-time Listeners
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      if (msg.chatId === chat._id) {
        setMessages((prev) => {
          // Logic: If we sent the message, we already have it in state via optimistic update.
          // We match by timestamp and text to prevent duplicates for our own messages.
          const isDuplicate = prev.some(m => 
            (msg._id && m._id === msg._id) || 
            (m.senderId === msg.senderId && m.text === msg.text && m.timestamp === msg.timestamp)
          );
          if (isDuplicate) {
             // Update the existing optimistic message with the real DB ID
             return prev.map(m => (m.timestamp === msg.timestamp && !m._id) ? { ...m, _id: msg._id } : m);
          };
          return [...prev, msg];
        });
        setOtherUserTyping(false);
      }
    };

    const handleDelete = ({ messageId }) => {
      setMessages((prev) => prev.filter(m => m._id !== messageId));
    };

    const handleTyping = ({ chatId, typing }) => {
      if (chatId === chat._id) setOtherUserTyping(typing);
    };

    socket.on('receive_message', handleMessage);
    socket.on('message_deleted', handleDelete);
    socket.on('typing_status', handleTyping);

    return () => {
      socket.off('receive_message', handleMessage);
      socket.off('message_deleted', handleDelete);
      socket.off('typing_status', handleTyping);
    };
  }, [socket, chat._id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherUserTyping]);

  // 3. Action Handlers
  const handleSend = async (e) => {
    e.preventDefault();
    const cleanMsg = newMessage.trim();
    if (!cleanMsg || !socket) return;

    const timestamp = new Date().toISOString();
    const msgData = {
      chatId: chat._id,
      senderId: user._id,
      recipientId: otherUser?._id,
      text: cleanMsg,
      timestamp: timestamp,
      // Create a temporary ID so the Trash Icon shows up immediately!
      _id: `temp-${Date.now()}` 
    };

    socket.emit('send_message', msgData);
    setMessages((prev) => [...prev, msgData]); 
    setNewMessage('');
    setIsTyping(false);
    socket.emit('typing', { chatId: chat._id, typing: false });
  };

  const deleteMsg = async (messageId) => {
    // If it's a temp ID, we can't delete from DB yet, so we just filter locally
    if (messageId.toString().startsWith('temp-')) {
        setMessages(prev => prev.filter(m => m._id !== messageId));
        return;
    }

    try {
      const res = await axios.delete(`${API_URL}/api/chats/${chat._id}/message/${messageId}`, { withCredentials: true });
      
      // Update local UI
      setMessages(prev => prev.filter(m => m._id !== messageId));
      
      // If the backend says it was an 'unsend' (you were the sender), tell the other user
      if (res.data.action === "unsend") {
        socket.emit('delete_message', { chatId: chat._id, messageId });
      }
    } catch (err) { console.error("Delete failed"); }
  };

  const getMessageDateLabel = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return "Today";
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-zinc-100 relative">
      {/* Header (Same as before) */}
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
            <MoreVertical className="w-4 h-4 cursor-pointer" onClick={() => setShowMenu(!showMenu)} />
            {showMenu && (
                <div className="absolute right-0 top-10 w-48 bg-zinc-900 border border-white/10 rounded-xl py-2 z-50">
                    <button onClick={() => {}} className="w-full px-4 py-2 text-left text-xs flex items-center gap-3 hover:bg-white/5"><Eraser className="w-3.5 h-3.5" /> Clear History</button>
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
                  <span className="bg-zinc-900/50 text-zinc-500 text-[10px] px-3 py-1 rounded-full border border-white/5">
                    {getMessageDateLabel(m.timestamp)}
                  </span>
                </div>
              )}
              
              <div className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} ${showTime ? 'mb-4' : 'mb-1'} w-full animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`flex items-center gap-2 max-w-[85%] relative ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                  
                  {/* TRASH ICON: Now shows for both sides! */}
                  {m._id && (
                    <button 
                      onClick={() => deleteMsg(m._id)}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/5 rounded-full transition-all text-zinc-600 hover:text-red-500"
                      title={isMe ? "Unsend for everyone" : "Delete for me"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className={`px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed transition-all ${
                    isMe ? 'bg-blue-600 text-white rounded-tr-none' 
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
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-6">
        <div className="relative flex items-center gap-3 max-w-5xl mx-auto w-full">
          <input 
            type="text"
            className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm text-white shadow-2xl"
            placeholder="Write a message..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              if(!isTyping) {
                setIsTyping(true);
                socket?.emit('typing', { chatId: chat._id, typing: true });
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