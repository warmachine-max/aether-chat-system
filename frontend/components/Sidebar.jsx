import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import axios from 'axios';
import { Search, UserPlus, Loader2, CheckCheck, MessageSquarePlus } from 'lucide-react';
import { useSocket } from '../src/context/SocketContext';
import { useAuth } from '../src/context/AuthContext';

// --- Sub-Component: ChatItem (Optimized with Memo) ---
const ChatItem = memo(({ chat, isActive, isOnline, onClick, formatTime, currentUser }) => {
  const otherUser = chat.participants.find(p => p._id !== currentUser?._id);
  
  // Logic: Formatter for unread counts (e.g., 10 -> 9+, 100 -> 99+)
  const formatUnreadCount = (count) => {
    if (!count || count <= 0) return null;
    if (count > 99) return "99+";
    if (count > 9) return "9+";
    return count;
  };

  const unreadDisplay = formatUnreadCount(chat.unreadCount);

  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-4 px-6 py-4 cursor-pointer border-l-[3px] transition-all duration-200 ${
        isActive 
          ? 'bg-blue-600/10 border-blue-600' 
          : 'border-transparent hover:bg-white/[0.03] active:scale-[0.98]'
      }`}
    >
      <div className="relative flex-shrink-0">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold border transition-colors ${
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
          <span className="text-[10px] text-zinc-500 font-medium whitespace-nowrap">
            {formatTime(chat.updatedAt)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <p className={`text-xs truncate max-w-[150px] ${isActive ? 'text-blue-100/80' : 'text-zinc-500'}`}>
            {chat.lastMessage?.text || "New Signal established"}
          </p>
          
          <div className="flex items-center gap-2">
            {isActive ? (
              <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
            ) : unreadDisplay ? (
              <div className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] h-[18px] flex items-center justify-center shadow-lg shadow-blue-600/20 border border-white/10 animate-in zoom-in duration-300">
                {unreadDisplay}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});

// --- Main Component: Sidebar ---
export default function Sidebar({ setSelectedChat, selectedChat }) {
  const { user: currentUser } = useAuth();
  const { socket, onlineUsers } = useSocket();

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const API_URL = useMemo(() => import.meta.env.VITE_BACKEND_URL || "http://localhost:5000", []);

  // 1. Initial Fetch of Conversations
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/chats`, { withCredentials: true });
        setConversations(res.data);
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, [API_URL]);

  // 2. Real-time Message/Unread Handling (Socket)
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      setConversations((prev) => {
        const updatedList = prev.map((chat) => {
          if (chat._id === msg.chatId) {
            const isCurrentlyOpen = selectedChat?._id === chat._id;
            const isSentByMe = msg.senderId === currentUser?._id;

            return {
              ...chat,
              lastMessage: msg,
              updatedAt: new Date().toISOString(),
              // Only increment if chat isn't open and I'm not the one who sent it
              unreadCount: (isCurrentlyOpen || isSentByMe) 
                ? 0 
                : (chat.unreadCount || 0) + 1
            };
          }
          return chat;
        });
        
        // Move latest chat to the top
        return [...updatedList].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };

    socket.on('receive_message', handleMessage);
    return () => socket.off('receive_message', handleMessage);
  }, [socket, selectedChat, currentUser?._id]);

  // 3. Search Users Logic (Debounced)
  useEffect(() => {
    const searchUsers = async () => {
      if (search.trim().length < 2) { setSearchResults([]); return; }
      setIsSearching(true);
      try {
        const res = await axios.get(`${API_URL}/api/auth/users?search=${search}`, { withCredentials: true });
        setSearchResults(res.data.filter(u => u._id !== currentUser?._id));
      } catch (err) { console.error(err); } 
      finally { setIsSearching(false); }
    };
    const debounce = setTimeout(searchUsers, 400);
    return () => clearTimeout(debounce);
  }, [search, currentUser?._id, API_URL]);

  // Action: Open a chat and reset unread badge locally
  const handleChatClick = useCallback((chat) => {
    setSelectedChat(chat);
    setConversations(prev => prev.map(c => 
      c._id === chat._id ? { ...c, unreadCount: 0 } : c
    ));
  }, [setSelectedChat]);

  const startNewChat = async (recipientId) => {
    try {
      const res = await axios.post(`${API_URL}/api/chats/access`, { recipientId }, { withCredentials: true });
      setSelectedChat(res.data);
      setSearch('');
      setSearchResults([]);
      // Refresh list or manually add the new chat to state
      setConversations(prev => {
        const exists = prev.find(c => c._id === res.data._id);
        if (exists) return prev;
        return [res.data, ...prev];
      });
    } catch (err) { console.error("Failed to establish signal"); }
  };

  const formatTime = (date) => {
    if (!date) return "";
    const now = new Date();
    const msgDate = new Date(date);
    const diffInDays = Math.floor((now - msgDate) / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) return msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffInDays === 1) return "Yesterday";
    return msgDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#070707] border-r border-white/5 w-[360px] relative">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <h2 className="text-xl font-black italic tracking-tighter text-white uppercase">Aether</h2>
          </div>
          <button className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-400">
            <MessageSquarePlus className="w-5 h-5" />
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="relative group">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-all duration-300 ${search ? 'text-blue-500 scale-110' : 'text-zinc-600'}`} />
          <input 
            type="text"
            placeholder="Search signals..."
            className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-zinc-900/80 transition-all text-white placeholder:text-zinc-700"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Search Overlay Results */}
      {search.length > 0 && (
        <div className="absolute top-28 left-4 right-4 bg-zinc-900/95 border border-white/10 rounded-2xl shadow-2xl z-50 max-h-[400px] overflow-y-auto backdrop-blur-xl">
          {isSearching ? (
            <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500 w-5 h-5" /></div>
          ) : searchResults.length > 0 ? (
            searchResults.map(u => (
              <div key={u._id} onClick={() => startNewChat(u._id)} className="p-4 hover:bg-blue-600/10 cursor-pointer flex items-center gap-3 border-b border-white/5 last:border-0">
                <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-blue-500 font-bold border border-white/5">{u.username[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-bold text-white">{u.username}</div>
                  <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-tighter">{u.email}</div>
                </div>
                <UserPlus className="w-4 h-4 text-zinc-600 hover:text-blue-500 transition-colors" />
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest">No Signals Found</div>
          )}
        </div>
      )}

      {/* Main Conversations List */}
      <div className="flex-1 overflow-y-auto mt-2 custom-scrollbar">
        {loading ? (
          [1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
              <div className="w-12 h-12 bg-zinc-900 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-zinc-900 rounded w-1/3" />
                <div className="h-2 bg-zinc-800 rounded w-2/3" />
              </div>
            </div>
          ))
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
            />
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center px-10 text-center space-y-4 opacity-30">
             <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center">
                <Search className="w-5 h-5 text-zinc-700" />
             </div>
            <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">Void Detected</p>
          </div>
        )}
      </div>
    </div>
  );
}