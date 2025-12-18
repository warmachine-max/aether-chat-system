import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Send, ShieldCheck, Info, Phone, Video } from 'lucide-react';
import { useSocket } from '../src/context/SocketContext';
import { useAuth } from '../src/context/AuthContext';

export default function ChatWindow({ chat }) {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const scrollRef = useRef();

  const otherUser = useMemo(() => 
    chat.participants.find(p => p._id !== user._id), 
  [chat, user._id]);

  const isOtherUserOnline = onlineUsers.includes(otherUser?._id);

  // 1. Fetch History
  useEffect(() => {
    const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    const fetchMessages = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/chats/${chat._id}`, { withCredentials: true });
        setMessages(res.data);
      } catch (err) { console.error(err); }
    };
    fetchMessages();
    socket?.emit('join_chat', chat._id);
  }, [chat._id, socket]);

  // 2. Updated Socket Listener with De-duplication
  useEffect(() => {
    if (!socket) return;

    socket.on('receive_message', (msg) => {
      if (msg.chatId === chat._id) {
        setMessages((prev) => {
          // CHECK FOR DUPLICATE: Don't add if message with same text and sender exists in last 2 seconds
          const isDuplicate = prev.some(m => 
            m.text === msg.text && 
            m.senderId === msg.senderId &&
            Math.abs(new Date(m.timestamp) - new Date(msg.timestamp)) < 2000
          );
          
          if (isDuplicate) return prev;
          return [...prev, msg];
        });
        setOtherUserTyping(false);
      }
    });

    socket.on('typing_status', ({ chatId, typing }) => {
      if (chatId === chat._id) setOtherUserTyping(typing);
    });

    return () => {
      socket.off('receive_message');
      socket.off('typing_status');
    };
  }, [socket, chat._id]);

  // 3. Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherUserTyping]);

  // 4. Helper to format dates for dividers
  const getMessageDateLabel = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { chatId: chat._id, typing: true });
    }
    
    const lastTypingTime = new Date().getTime();
    setTimeout(() => {
      const timeNow = new Date().getTime();
      if (timeNow - lastTypingTime >= 2000 && isTyping) {
        socket.emit('typing', { chatId: chat._id, typing: false });
        setIsTyping(false);
      }
    }, 2000);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgData = {
      chatId: chat._id,
      senderId: user._id,
      text: newMessage,
      timestamp: new Date().toISOString(),
    };

    socket.emit('send_message', msgData);
    socket.emit('typing', { chatId: chat._id, typing: false });
    
    // Optimistic Update (Add locally first for speed)
    setMessages((prev) => [...prev, msgData]);
    setNewMessage('');
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-zinc-100">
      {/* --- Top Bar --- */}
      <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center backdrop-blur-xl bg-black/40 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-white/10 font-bold text-blue-500">
              {otherUser?.username?.[0].toUpperCase()}
            </div>
            {isOtherUserOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050505]" />
            )}
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-tight">{otherUser?.username || "Secure Line"}</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">
              {isOtherUserOnline ? 'Online' : 'Encrypted'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-zinc-500">
           <Phone className="w-4 h-4 hover:text-blue-400 cursor-pointer transition-colors" />
           <Video className="w-4 h-4 hover:text-blue-400 cursor-pointer transition-colors" />
           <Info className="w-4 h-4 hover:text-blue-400 cursor-pointer transition-colors" />
        </div>
      </div>

      {/* --- Message Container --- */}
      <div className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar">
        {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                <ShieldCheck className="w-12 h-12 mb-4 text-zinc-700" />
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold">Encrypted Signal Established</p>
            </div>
        )}

        {messages.map((m, i) => {
          const isMe = m.senderId === user._id;
          const showTime = i === messages.length - 1 || messages[i+1]?.senderId !== m.senderId;
          const time = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          // Logic for Date Dividers
          const currentDateLabel = getMessageDateLabel(m.timestamp);
          const previousDateLabel = i > 0 ? getMessageDateLabel(messages[i-1].timestamp) : null;
          const showDateDivider = currentDateLabel !== previousDateLabel;

          return (
            <React.Fragment key={i}>
              {showDateDivider && (
                <div className="flex justify-center my-6">
                  <span className="bg-zinc-900/50 text-zinc-500 text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-bold border border-white/5">
                    {currentDateLabel}
                  </span>
                </div>
              )}
              
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${showTime ? 'mb-4' : 'mb-1'}`}>
                <div className={`px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed transition-all shadow-md ${
                  isMe 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-zinc-900 text-zinc-100 rounded-tl-none border border-white/5'
                }`}>
                  {m.text}
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
            <div className="bg-zinc-900 border border-white/5 px-4 py-3 rounded-2xl rounded-tl-none">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* --- Input Area --- */}
      <form onSubmit={handleSend} className="p-6 bg-transparent">
        <div className="relative flex items-center gap-3 max-w-5xl mx-auto w-full">
          <input 
            type="text"
            className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-sm text-white placeholder:text-zinc-600 shadow-2xl"
            placeholder="Write a message..."
            value={newMessage}
            onChange={handleInputChange}
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="absolute right-2 p-3 bg-blue-600 rounded-xl hover:bg-blue-500 disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </form>
    </div>
  );
}