import React, { useState, useEffect, useMemo, memo, useCallback, useRef } from 'react';
import axios from 'axios';
import { Search, UserPlus, Loader2, MessageSquarePlus, MoreVertical, Trash2, ShieldAlert } from 'lucide-react';
import { useSocket } from '../src/context/SocketContext';
import { useAuth } from '../src/context/AuthContext';

const ChatItem = memo(({ chat, isActive, isOnline, onClick, formatTime, currentUser, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef();
  
  const otherUser = useMemo(() => 
    chat.participants?.find(p => p._id !== currentUser?._id), 
  [chat.participants, currentUser?._id]);

  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

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
          <span className="text-[10px] text-zinc-500 font-medium whitespace-nowrap">
            {chat.updatedAt ? formatTime(chat.updatedAt) : ""}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <p className={`text-xs truncate max-w-[140px] italic ${isActive ? 'text-blue-100/80' : 'text-zinc-500'}`}>
            {chat.lastMessage?.text || "No recent signals"}
          </p>
          
          <div className="flex items-center gap-2">
            <div className="relative" ref={menuRef}>
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className={`p-1 rounded-md hover:bg-white/10 transition-opacity ${showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <MoreVertical className="w-4 h-4 text-zinc-500" />
              </button>

              {showMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-44 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(chat._id); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-[10px] text-red-500 hover:bg-red-500/10 transition-colors font-black uppercase tracking-widest"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Terminate Signal
                  </button>
                </div>
              )}
            </div>

            {chat.unreadCount > 0 && !isActive && (
              <div className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] h-[18px] flex items-center justify-center shadow-lg shadow-blue-600/20">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default function Sidebar({ setSelectedChat, selectedChat }) {
  const { user: currentUser } = useAuth();
  const { socket, onlineUsers } = useSocket();

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  // Use a Ref for the current selectedChat to avoid stale closure in socket listeners
  const selectedChatRef = useRef(selectedChat);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  const API_URL = useMemo(() => import.meta.env.VITE_BACKEND_URL || "http://localhost:5000", []);

  const fetchSidebarData = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/chats`, { withCredentials: true });
      setConversations(res.data);
    } catch (err) { console.error("History sync failed", err); } 
    finally { setLoading(false); }
  }, [API_URL]);

  useEffect(() => {
    fetchSidebarData();
  }, [fetchSidebarData]);

  // Search Logic
  useEffect(() => {
    const searchUsers = async () => {
      if (search.trim().length < 2) { setSearchResults([]); return; }
      setIsSearching(true);
      try {
        const res = await axios.get(`${API_URL}/api/chats/users/search?query=${search}`, { withCredentials: true });
        setSearchResults(res.data);
      } catch (err) { console.error(err); } 
      finally { setIsSearching(false); }
    };
    const debounce = setTimeout(searchUsers, 350);
    return () => clearTimeout(debounce);
  }, [search, API_URL]);

  const startNewChat = async (recipientId) => {
    try {
      const res = await axios.post(`${API_URL}/api/chats/access`, { recipientId }, { withCredentials: true });
      setSelectedChat(res.data);
      setSearch('');
      setSearchResults([]);
      setConversations(prev => [res.data, ...prev.filter(c => c._id !== res.data._id)]);
    } catch (err) { console.error("Signal establishment failed"); }
  };

  const deleteChat = async (chatId) => {
    if (!window.confirm("Terminate this signal?")) return;
    try {
      await axios.delete(`${API_URL}/api/chats/${chatId}`, { withCredentials: true });
      setConversations(prev => prev.filter(c => c._id !== chatId));
      if (selectedChat?._id === chatId) setSelectedChat(null);
    } catch (err) { console.error("Termination failed"); }
  };

  const handleChatClick = useCallback((chat) => {
    setSelectedChat(chat);
    setConversations(prev => prev.map(c => c._id === chat._id ? { ...c, unreadCount: 0 } : c));
  }, [setSelectedChat]);

  // --- Live Socket Listeners (FIXED) ---
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (msg) => {
      setConversations(prev => {
        const idx = prev.findIndex(c => c._id === msg.chatId);
        
        if (idx !== -1) {
          const updatedChat = { 
            ...prev[idx], 
            lastMessage: msg, 
            updatedAt: new Date().toISOString() 
          };

          // Use Ref to check if chat is active to avoid stale logic
          if (selectedChatRef.current?._id !== msg.chatId && msg.senderId !== currentUser?._id) {
            updatedChat.unreadCount = (updatedChat.unreadCount || 0) + 1;
          }

          const filtered = prev.filter(c => c._id !== msg.chatId);
          return [updatedChat, ...filtered];
        } else {
          // If the chat isn't in the list, refresh everything
          fetchSidebarData();
          return prev;
        }
      });
    };

    const handleGlobalDelete = (payload) => {
      // payload should contain { chatId, messageId }
      setConversations(prev => prev.map(c => {
        if (c.lastMessage?._id === payload.messageId) {
          return { ...c, lastMessage: { ...c.lastMessage, text: "Signal withdrawn" } };
        }
        return c;
      }));
    };

    socket.on('sidebar_update', handleUpdate);
    socket.on('message_deleted', handleGlobalDelete);

    return () => {
      socket.off('sidebar_update', handleUpdate);
      socket.off('message_deleted', handleGlobalDelete);
    };
  }, [socket, currentUser?._id, fetchSidebarData]); 

  return (
    <div className="flex flex-col h-full bg-[#070707] border-r border-white/5 w-[360px] relative select-none">
      <div className="p-6 pb-4">
        <div className="flex justify-between items-center mb-6 px-1">
          <h2 className="text-xl font-black italic tracking-tighter text-white uppercase flex items-center gap-2">
            Aether <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          </h2>
          <MessageSquarePlus className="w-5 h-5 text-zinc-500 cursor-pointer hover:text-white transition-colors" />
        </div>
        
        <div className="relative group">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${search ? 'text-blue-500' : 'text-zinc-600'}`} />
          <input 
            type="text" 
            placeholder="Search signals..."
            className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/40 placeholder:text-zinc-700 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {search.length > 0 && (
        <div className="absolute top-[135px] left-4 right-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-[150] max-h-[400px] overflow-hidden backdrop-blur-2xl flex flex-col">
          {isSearching ? (
            <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-500 w-5 h-5" /></div>
          ) : searchResults.length > 0 ? (
            <div className="overflow-y-auto">
              {searchResults.map(u => (
                <div key={u._id} onClick={() => startNewChat(u._id)} className="p-4 hover:bg-white/[0.03] cursor-pointer flex items-center gap-3 border-b border-white/5 last:border-0 transition-colors">
                  <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-blue-500 font-bold border border-white/5 text-sm">{u.username[0].toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{u.username}</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-tighter truncate">{u.email}</div>
                  </div>
                  <UserPlus className="w-4 h-4 text-zinc-600" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest">Signal Not Found</div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto mt-2 custom-scrollbar">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-16 bg-zinc-900/50 animate-pulse rounded-2xl" />)}
          </div>
        ) : conversations.length > 0 ? (
          conversations.map((chat) => (
            <ChatItem 
              key={chat._id}
              chat={chat}
              currentUser={currentUser}
              isActive={selectedChat?._id === chat._id}
              isOnline={onlineUsers.includes(chat.participants?.find(p => p._id !== currentUser?._id)?._id)}
              onClick={() => handleChatClick(chat)}
              formatTime={(date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              onDelete={deleteChat}
            />
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20 px-10 text-center grayscale">
            <ShieldAlert className="w-12 h-12 mb-3 text-zinc-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Grid Silent</p>
          </div>
        )}
      </div>
    </div>
  );
}