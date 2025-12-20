import React, { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react';
import axios from 'axios';
import { Search, UserPlus, Loader2, CheckCheck, MessageSquarePlus, MoreVertical, Trash2, ShieldAlert } from 'lucide-react';
import { useSocket } from '../src/context/SocketContext';
import { useAuth } from '../src/context/AuthContext';

// --- Sub-Component: ChatItem (With Delete Menu) ---
const ChatItem = memo(({ chat, isActive, isOnline, onClick, formatTime, currentUser, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef();
  const otherUser = chat.participants.find(p => p._id !== currentUser?._id);

  // Close menu on outside click
  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleAction = (e, action) => {
    e.stopPropagation(); // Don't open the chat when clicking menu
    setShowMenu(false);
    action();
  };

  const formatUnreadCount = (count) => {
    if (!count || count <= 0) return null;
    return count > 99 ? "99+" : count;
  };

  return (
    <div 
      onClick={onClick}
      className={`group flex items-center gap-4 px-6 py-4 cursor-pointer border-l-[3px] transition-all duration-200 relative ${
        isActive ? 'bg-blue-600/10 border-blue-600' : 'border-transparent hover:bg-white/[0.03]'
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold border ${
          isActive ? 'bg-blue-600 border-white/20 text-white' : 'bg-zinc-800 border-white/5 text-blue-500'
        }`}>
          {otherUser?.username?.[0].toUpperCase() || "?"}
        </div>
        {isOnline && (
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-[3px] border-[#070707]" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <h3 className={`font-bold truncate text-[14px] ${isActive ? 'text-white' : 'text-zinc-200'}`}>
            {otherUser?.username || "Unknown User"}
          </h3>
          <span className="text-[10px] text-zinc-500 font-medium">{formatTime(chat.updatedAt)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <p className={`text-xs truncate max-w-[140px] ${isActive ? 'text-blue-100/80' : 'text-zinc-500'}`}>
            {chat.lastMessage?.text || "New Signal established"}
          </p>
          
          <div className="flex items-center gap-2">
            {/* Hidden by default, shows on hover or when menu open */}
            <div className="relative" ref={menuRef}>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className={`p-1 rounded-md hover:bg-white/10 transition-opacity ${showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <MoreVertical className="w-4 h-4 text-zinc-500" />
              </button>

              {showMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-40 bg-[#121212] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl">
                  <button 
                    onClick={(e) => handleAction(e, () => onDelete(chat._id))}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs text-red-500 hover:bg-red-500/10 transition-colors font-bold uppercase tracking-tighter"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Signal
                  </button>
                </div>
              )}
            </div>

            {formatUnreadCount(chat.unreadCount) && !isActive && (
              <div className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] h-[18px] flex items-center justify-center">
                {formatUnreadCount(chat.unreadCount)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// --- Main Sidebar Component ---
export default function Sidebar({ setSelectedChat, selectedChat }) {
  const { user: currentUser } = useAuth();
  const { socket, onlineUsers } = useSocket();

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const API_URL = useMemo(() => import.meta.env.VITE_BACKEND_URL || "http://localhost:5000", []);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/chats`, { withCredentials: true });
        setConversations(res.data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchChats();
  }, [API_URL]);

  // Handle Sidebar Deletion
  const deleteConversationLocally = async (chatId) => {
    try {
      await axios.delete(`${API_URL}/api/chats/${chatId}`, { withCredentials: true });
      setConversations(prev => prev.filter(c => c._id !== chatId));
      if (selectedChat?._id === chatId) setSelectedChat(null);
    } catch (err) {
      console.error("Deletion failed", err);
    }
  };

  const handleChatClick = useCallback((chat) => {
    setSelectedChat(chat);
    setConversations(prev => prev.map(c => c._id === chat._id ? { ...c, unreadCount: 0 } : c));
  }, [setSelectedChat]);

  const formatTime = (date) => {
    if (!date) return "";
    const now = new Date();
    const msgDate = new Date(date);
    const diffInDays = Math.floor((now - msgDate) / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffInDays === 1) return "Yesterday";
    return msgDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  // Socket logic remains same...
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (msg) => {
        setConversations(prev => {
            const idx = prev.findIndex(c => c._id === msg.chatId);
            if (idx !== -1) {
                const updated = { ...prev[idx], lastMessage: msg, updatedAt: new Date().toISOString() };
                if (selectedChat?._id !== msg.chatId && msg.senderId !== currentUser?._id) {
                    updated.unreadCount = (updated.unreadCount || 0) + 1;
                }
                return [updated, ...prev.filter((_, i) => i !== idx)];
            }
            return prev;
        });
    };
    socket.on('receive_message', handleUpdate);
    return () => socket.off('receive_message', handleUpdate);
  }, [socket, selectedChat, currentUser]);

  return (
    <div className="flex flex-col h-full bg-[#070707] border-r border-white/5 w-[360px] relative">
      {/* Header & Search... (Keep your existing search UI here) */}
      <div className="p-6 pb-4">
         <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-black italic tracking-tighter text-white uppercase">Aether</h2>
           <MessageSquarePlus className="w-5 h-5 text-zinc-400 cursor-pointer hover:text-blue-500 transition-colors" />
         </div>
         <div className="relative group">
           <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${search ? 'text-blue-500' : 'text-zinc-600'}`} />
           <input 
             type="text" 
             placeholder="Search signals..."
             className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-zinc-700"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
         </div>
      </div>

      <div className="flex-1 overflow-y-auto mt-2 custom-scrollbar">
        {loading ? (
          <div className="p-6 space-y-4">{/* skeleton */}</div>
        ) : conversations.length > 0 ? (
          conversations.map((chat) => (
            <ChatItem 
              key={chat._id}
              chat={chat}
              currentUser={currentUser}
              isActive={selectedChat?._id === chat._id}
              isOnline={onlineUsers.includes(chat.participants.find(p => p._id !== currentUser?._id)?._id)}
              onClick={() => handleChatClick(chat)}
              formatTime={formatTime}
              onDelete={deleteConversationLocally}
            />
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-30">
            <ShieldAlert className="w-12 h-12 mb-2 text-zinc-700" />
            <p className="text-[10px] font-black uppercase tracking-widest">No Active Signals</p>
          </div>
        )}
      </div>
    </div>
  );
}