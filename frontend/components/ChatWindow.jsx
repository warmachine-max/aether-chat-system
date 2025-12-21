import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Send, MoreVertical, Trash2, Eraser, Loader2, ShieldCheck } from 'lucide-react';
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
  const [isDeleting, setIsDeleting] = useState(null); 
  
  const scrollRef = useRef();
  const menuRef = useRef();

  // Safely find the recipient
  const otherUser = useMemo(() => 
    chat.participants.find(p => p._id !== user._id), 
  [chat, user._id]);

  const isOtherUserOnline = onlineUsers.includes(otherUser?._id);
  const API_URL = useMemo(() => import.meta.env.VITE_BACKEND_URL || "http://localhost:5000", []);

  // Close context menu on click outside
  useEffect(() => {
    const closeMenu = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  // 1. Fetch History & Join Room
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

  // 2. Real-time Socket Listeners
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      if (msg.chatId === chat._id) {
        setMessages((prev) => {
          const isDuplicate = prev.some(m => m._id === msg._id);
          if (isDuplicate) return prev;
          return [...prev, msg];
        });
        setOtherUserTyping(false);
      }
    };

    const handleDelete = ({ messageId }) => {
      // This only triggers when the OTHER person unsends THEIR message
      setMessages((prev) => prev.filter(m => m._id !== messageId));
    };

    const handleTyping = ({ chatId, typing }) => {
      if (chatId === chat._id) setOtherUserTyping(typing);
    };

    const handleAck = ({ tempId, realId }) => {
      setMessages((prev) => 
        prev.map(m => m._id === tempId ? { ...m, _id: realId } : m)
      );
    };

    socket.on('receive_message', handleMessage);
    socket.on('message_deleted', handleDelete);
    socket.on('typing_status', handleTyping);
    socket.on('message_ack', handleAck);

    return () => {
      socket.off('receive_message', handleMessage);
      socket.off('message_deleted', handleDelete);
      socket.off('typing_status', handleTyping);
      socket.off('message_ack', handleAck);
    };
  }, [socket, chat._id]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherUserTyping]);

  // 3. Action Handlers
  const handleSend = async (e) => {
    e.preventDefault();
    const cleanMsg = newMessage.trim();
    if (!cleanMsg || !socket) return;

    const tempId = `temp-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    const msgData = {
      chatId: chat._id,
      senderId: user._id,
      recipientId: otherUser?._id,
      text: cleanMsg,
      timestamp: timestamp,
      _id: tempId 
    };

    setMessages((prev) => [...prev, msgData]); 
    socket.emit('send_message', msgData);
    
    setNewMessage('');
    setIsTyping(false);
    socket.emit('typing', { chatId: chat._id, typing: false });
  };

  const deleteMsg = async (messageId) => {
    if (messageId.toString().startsWith('temp-')) return;
    
    setIsDeleting(messageId);
    try {
      const res = await axios.delete(`${API_URL}/api/chats/${chat._id}/message/${messageId}`, { withCredentials: true });
      
      // Update UI locally for current user
      setMessages(prev => prev.filter(m => m._id !== messageId));
      
      // If backend confirms "unsend", notify the other participant via socket
      if (res.data.action === "unsend") {
        socket.emit('delete_message', { chatId: chat._id, messageId });
      }
      // Note: If action is "delete", we don't emit anything (Delete for Me logic)
    } catch (err) { 
        console.error("Delete operation failed"); 
    } finally {
        setIsDeleting(null);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Wipe your local history? (Other user keeps their copy)")) return;
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
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] text-zinc-100 relative">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
      `}</style>

      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center backdrop-blur-xl bg-black/40 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 bg-zinc-900 rounded-full flex items-center justify-center border border-white/10 font-bold text-blue-500">
              {otherUser?.username?.[0].toUpperCase() || "?"}
            </div>
            {isOtherUserOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050505]" />}
          </div>
          <div>
            <h2 className="font-bold text-sm tracking-tight">{otherUser?.username || "Secure Line"}</h2>
            <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-blue-500/50" />
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">
                    {isOtherUserOnline ? 'Active Connection' : 'End-to-End Encrypted'}
                </p>
            </div>
          </div>
        </div>
        
        <div className="relative" ref={menuRef}>
            <MoreVertical className="w-4 h-4 text-zinc-500 cursor-pointer hover:text-white transition-colors" onClick={() => setShowMenu(!showMenu)} />
            {showMenu && (
                <div className="absolute right-0 top-10 w-48 bg-zinc-900 border border-white/10 rounded-xl py-2 z-[100] shadow-2xl overflow-hidden">
                    <button onClick={handleClearHistory} className="w-full px-4 py-3 text-left text-[11px] font-bold flex items-center gap-3 hover:bg-white/5 text-red-400 uppercase tracking-tighter">
                        <Eraser className="w-3.5 h-3.5" /> Clear History
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar space-y-1">
        {messages.map((m, i) => {
          const isMe = m.senderId === user._id;
          const showTime = i === messages.length - 1 || messages[i+1]?.senderId !== m.senderId;
          const showDateDivider = i === 0 || getMessageDateLabel(m.timestamp) !== getMessageDateLabel(messages[i-1].timestamp);

          return (
            <React.Fragment key={m._id || i}>
              {showDateDivider && (
                <div className="flex justify-center my-8">
                  <span className="bg-zinc-900 text-zinc-500 text-[10px] px-4 py-1 rounded-full uppercase tracking-widest font-bold border border-white/5">
                    {getMessageDateLabel(m.timestamp)}
                  </span>
                </div>
              )}
              
              <div className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} ${showTime ? 'mb-4' : 'mb-0.5'}`}>
                <div className={`flex items-center gap-2 max-w-[85%] ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                  
                  {/* Delete button: Now visible for BOTH your messages and theirs */}
                  {m._id && !m._id.toString().startsWith('temp-') && (
                    <button 
                      onClick={() => deleteMsg(m._id)}
                      disabled={isDeleting === m._id}
                      className={`opacity-0 group-hover:opacity-100 p-2 hover:bg-white/5 rounded-full transition-all text-zinc-600 hover:text-red-500 disabled:opacity-50 ${isMe ? 'order-first' : 'order-last'}`}
                      title={isMe ? "Unsend for everyone" : "Delete for me only"}
                    >
                      {isDeleting === m._id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  <div className={`px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed ${
                    isMe ? 'bg-blue-600 text-white rounded-tr-none' 
                         : 'bg-zinc-900 text-zinc-100 rounded-tl-none border border-white/5'
                  }`}>
                    {m.text}
                  </div>
                </div>
                {showTime && (
                  <span className="text-[9px] text-zinc-600 mt-1 px-1 font-bold">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
        {otherUserTyping && (
          <div className="flex gap-1 p-3 bg-zinc-900/30 rounded-xl w-fit animate-pulse ml-1">
            <div className="w-1.5 h-1.5 bg-blue-500/50 rounded-full" />
            <div className="w-1.5 h-1.5 bg-blue-500/50 rounded-full" />
            <div className="w-1.5 h-1.5 bg-blue-500/50 rounded-full" />
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-6 bg-gradient-to-t from-black to-transparent">
        <div className="relative flex items-center gap-3 max-w-5xl mx-auto w-full">
          <input 
            type="text"
            className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm text-white placeholder:text-zinc-700"
            placeholder="Transmit signal..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              if(!isTyping) {
                setIsTyping(true);
                socket?.emit('typing', { chatId: chat._id, typing: true });
              }
            }}
            onBlur={() => {
                setIsTyping(false);
                socket?.emit('typing', { chatId: chat._id, typing: false });
            }}
          />
          <button type="submit" disabled={!newMessage.trim()} className="absolute right-2 p-3 bg-blue-600 rounded-xl hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50 disabled:bg-zinc-800">
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </form>
    </div>
  );
}