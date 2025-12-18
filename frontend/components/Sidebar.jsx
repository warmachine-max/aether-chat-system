import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Circle, UserPlus, Loader2, CheckCheck } from 'lucide-react';
import { useSocket } from '../src/context/SocketContext';
import { useAuth } from '../src/context/AuthContext';

export default function Sidebar({ setSelectedChat, selectedChat }) {
  const { user: currentUser } = useAuth();
  const { onlineUsers } = useSocket();

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Helper to format time like WhatsApp
  const formatTime = (date) => {
    if (!date) return "";
    const now = new Date();
    const msgDate = new Date(date);
    const diffInDays = Math.floor((now - msgDate) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return msgDate.toLocaleDateString([], { weekday: 'short' });
    return msgDate.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  useEffect(() => {
    const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    const fetchChats = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/chats`, { withCredentials: true });
        setConversations(res.data);
      } catch (err) { console.error("Error loading chats:", err); }
    };
    fetchChats();
  }, [selectedChat, search]); // Re-fetch on chat select or search clear

  // Search Logic (Keep your existing debounce logic here)
  useEffect(() => {
    const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    const searchUsers = async () => {
      if (search.trim().length < 2) { setSearchResults([]); return; }
      setIsSearching(true);
      try {
        const res = await axios.get(`${API_URL}/api/auth/users?search=${search}`, { withCredentials: true });
        setSearchResults(res.data.filter(u => u._id !== currentUser?._id));
      } catch (err) { console.error("Search error:", err); } finally { setIsSearching(false); }
    };
    const debounce = setTimeout(searchUsers, 400);
    return () => clearTimeout(debounce);
  }, [search, currentUser]);

  const startChat = async (recipientId) => {
    const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    try {
      const res = await axios.post(`${API_URL}/api/chats/access`, { recipientId }, { withCredentials: true });
      setSelectedChat(res.data);
      setSearch('');
      setSearchResults([]);
    } catch (err) { console.error("Failed to establish signal"); }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-r border-white/5 w-[380px] relative">
      {/* Header */}
      <div className="p-6 pb-2">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black italic tracking-tighter text-white">AETHER</h2>
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-400">
            {currentUser?.username[0].toUpperCase()}
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${search ? 'text-blue-500' : 'text-zinc-500'}`} />
          <input 
            type="text"
            placeholder="Search conversations..."
            className="w-full bg-zinc-900/80 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:bg-zinc-900 transition-all placeholder:text-zinc-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* --- SEARCH RESULTS OVERLAY --- */}
      {search.length > 0 && (
        <div className="absolute top-32 left-4 right-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 max-h-[400px] overflow-y-auto backdrop-blur-xl bg-opacity-95">
          {isSearching ? (
            <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500 w-6 h-6" /></div>
          ) : searchResults.length > 0 ? (
            searchResults.map(u => (
              <div key={u._id} onClick={() => startChat(u._id)} className="p-4 hover:bg-white/5 cursor-pointer flex items-center gap-3 border-b border-white/5 last:border-0 transition-colors">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">{u.username[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white">{u.username}</div>
                  <div className="text-[11px] text-zinc-500">{u.email}</div>
                </div>
                <UserPlus className="w-4 h-4 text-blue-500" />
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-zinc-600 text-[10px] font-bold uppercase tracking-widest">No Signals Found</div>
          )}
        </div>
      )}

      {/* --- CONVERSATION LIST --- */}
      <div className="flex-1 overflow-y-auto mt-4 custom-scrollbar">
        {conversations.length > 0 ? (
          conversations.map((chat) => {
            const otherUser = chat.participants.find(p => p._id !== currentUser?._id);
            const isOnline = onlineUsers.includes(otherUser?._id);
            const isActive = selectedChat?._id === chat._id;

            return (
              <div 
                key={chat._id}
                onClick={() => setSelectedChat(chat)}
                className={`flex items-center gap-4 px-6 py-4 cursor-pointer border-l-4 transition-all ${
                  isActive ? 'bg-blue-600/10 border-blue-600' : 'border-transparent hover:bg-white/[0.02]'
                }`}
              >
                {/* Avatar with Online Glow */}
                <div className="relative flex-shrink-0">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold border ${
                    isActive ? 'bg-blue-600 border-white/20' : 'bg-zinc-900 border-white/5'
                  }`}>
                    {otherUser?.username?.[0].toUpperCase()}
                  </div>
                  {isOnline && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-[#0a0a0a] shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                  )}
                </div>
                
                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-bold truncate text-[15px] ${isActive ? 'text-white' : 'text-zinc-200'}`}>
                      {otherUser?.username || "Unknown"}
                    </h3>
                    <span className="text-[10px] text-zinc-500 font-medium ml-2">
                      {formatTime(chat.updatedAt)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className={`text-xs truncate max-w-[180px] ${isActive ? 'text-blue-100' : 'text-zinc-500'}`}>
                      {chat.lastMessage?.text || "New Signal established"}
                    </p>
                    
                    {/* Unread Badge (Simulated) */}
                    {!isActive && chat.unreadCount > 0 && (
                      <div className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {chat.unreadCount}
                      </div>
                    )}
                    {isActive && <CheckCheck className="w-3 h-3 text-blue-400" />}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20 px-10 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Void Detected - Start a Signal</p>
          </div>
        )}
      </div>
    </div>
  );
}