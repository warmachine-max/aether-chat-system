import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Circle, UserPlus, Loader2 } from 'lucide-react';
import { useSocket } from '../src/context/SocketContext'; // Ensure path is correct
import { useAuth } from '../src/context/AuthContext';

export default function Sidebar({ setSelectedChat, selectedChat }) {
  const { user: currentUser } = useAuth();
  const { onlineUsers } = useSocket();

  // States
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // 1. FETCH CONVERSATIONS (Your existing chats)
  useEffect(() => {
     const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    const fetchChats = async () => {
      try {
              const res = await axios.get(`${API_URL}/api/chats`, { 
          withCredentials: true 
        });
        setConversations(res.data);
      } catch (err) {
        console.error("Error loading chats:", err);
      }
    };
    fetchChats();
  }, [selectedChat]); // Refresh list when switching or starting a chat

  // 2. GLOBAL SEARCH LOGIC (Username or Email)
  useEffect(() => {
    const searchUsers = async () => {
      if (search.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await axios.get(`http://localhost:5000/api/auth/users?search=${search}`, { withCredentials: true });
        // Filter out your own account from results
        setSearchResults(res.data.filter(u => u._id !== currentUser?._id));
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 400);
    return () => clearTimeout(debounce);
  }, [search, currentUser]);

  // 3. START/ACCESS CHAT FUNCTION
  const startChat = async (recipientId) => {
    try {
      const res = await axios.post('http://localhost:5000/api/chats/access', 
        { recipientId }, 
        { withCredentials: true }
      );
      setSelectedChat(res.data); // Open the window
      setSearch(''); // Clear search UI
      setSearchResults([]);
    } catch (err) {
      console.error("Failed to establish signal");
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/50 border-r border-white/5 w-[350px] relative">
      {/* Header & Search Bar */}
      <div className="p-6">
        <h2 className="text-2xl font-black italic mb-6 tracking-tighter">MESSAGES</h2>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text"
            placeholder="Search name or email..."
            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* --- SEARCH RESULTS OVERLAY --- */}
      {search.length > 0 && (
        <div className="absolute top-24 left-4 right-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 max-h-[300px] overflow-y-auto">
          {isSearching ? (
            <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-blue-500 w-5 h-5" /></div>
          ) : searchResults.length > 0 ? (
            searchResults.map(u => (
              <div 
                key={u._id} 
                onClick={() => startChat(u._id)}
                className="p-4 hover:bg-white/5 cursor-pointer flex items-center gap-3 border-b border-white/5 last:border-0"
              >
                <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400 font-bold">
                  {u.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{u.username}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{u.email}</div>
                </div>
                <UserPlus className="w-4 h-4 text-zinc-500" />
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">No signals found</div>
          )}
        </div>
      )}

      {/* --- CONVERSATION LIST --- */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-6">
        {conversations.length > 0 ? (
          conversations.map((chat) => {
            // CRITICAL: Filter to find the participant that is NOT the current user
            const otherUser = chat.participants.find(p => p._id !== currentUser?._id);
            const isOnline = onlineUsers.includes(otherUser?._id);

            return (
              <div 
                key={chat._id}
                onClick={() => setSelectedChat(chat)}
                className={`group flex items-center gap-4 p-4 rounded-[2rem] cursor-pointer transition-all ${
                  selectedChat?._id === chat._id ? 'bg-blue-600 shadow-lg shadow-blue-600/20' : 'hover:bg-white/5'
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform">
                    <span className="text-lg font-bold">{otherUser?.username?.[0].toUpperCase() || "?"}</span>
                  </div>
                  {isOnline && (
                    <Circle className="absolute -bottom-1 -right-1 w-4 h-4 fill-green-500 text-zinc-950 stroke-[3px]" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{otherUser?.username || "Unknown User"}</h3>
                  <p className={`text-xs truncate ${selectedChat?._id === chat._id ? 'text-blue-100' : 'text-zinc-500'}`}>
                    {chat.lastMessage?.text || "New Signal Established"}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="mt-10 text-center opacity-20">
            <p className="text-xs font-bold uppercase tracking-tighter">No Active Signals</p>
          </div>
        )}
      </div>
    </div>
  );
}