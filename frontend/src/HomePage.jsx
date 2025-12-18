import { useAuth } from './context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, MessageSquare, Shield, Zap, LayoutDashboard, User as UserIcon,ArrowRight } from 'lucide-react';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
      const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    try {
      // CRITICAL: withCredentials ensures the cookie is sent to be cleared
     await axios.post(`${API_URL}/api/auth/logout`, 
  { userId: user?._id }, 
  { withCredentials: true }
);
    } catch (err) {
      console.error("Backend logout failed", err);
    } finally {
      logout(); 
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      {/* --- Modern Sidebar / Nav --- */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/20 backdrop-blur-xl px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            <Zap size={18} fill="white" />
          </div>
          <span className="text-xl font-black tracking-tighter italic">AETHER</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-1 text-zinc-400 text-sm font-medium bg-white/5 px-4 py-2 rounded-full border border-white/5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
            System Online
          </div>
          <button
            onClick={handleLogout}
            className="group flex items-center gap-2 bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 px-5 py-2 rounded-2xl text-sm font-bold transition-all border border-white/5 hover:border-red-500/30"
          >
            <span>LOGOUT</span>
            <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </nav>

      {/* --- Main Content Area --- */}
      <main className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto">
        
        {/* Welcome Header */}
        <header className="mb-12">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-tight">
            HELLO, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500">
              {user?.username?.toUpperCase() || 'AGENT'}
            </span>
          </h1>
          <p className="text-zinc-500 font-medium max-w-xl text-lg">
            Welcome to your encrypted command center. All systems are operational and secure.
          </p>
        </header>

        {/* --- BENTO GRID LAYOUT --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Large Chat Action Card */}
          <div 
            onClick={() => navigate('/chat')}
            className="md:col-span-2 group relative overflow-hidden bg-zinc-900/40 border border-white/10 rounded-[2.5rem] p-8 hover:border-blue-500/50 transition-all cursor-pointer shadow-2xl"
          >
            <div className="relative z-10 flex flex-col h-full justify-between min-h-[240px]">
              <div>
                <MessageSquare className="text-blue-500 mb-4" size={40} />
                <h2 className="text-3xl font-bold mb-2">Neural Chat</h2>
                <p className="text-zinc-400">Launch real-time end-to-end encrypted conversations.</p>
              </div>
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm tracking-widest mt-8">
                INITIALIZE INTERFACE <ArrowRight size={16} />
              </div>
            </div>
            {/* Hover Background Glow */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] group-hover:bg-blue-600/20 transition-all" />
          </div>

          {/* Profile Bento */}
          <div className="bg-zinc-900/40 border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center">
             <div className="w-24 h-24 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full flex items-center justify-center border border-white/10 mb-6 shadow-inner">
                <UserIcon size={40} className="text-zinc-500" />
             </div>
             <h3 className="font-bold text-xl">{user?.username}</h3>
             <p className="text-zinc-500 text-sm mb-6">{user?.email}</p>
             <button className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold tracking-widest transition-all">
               EDIT PROFILE
             </button>
          </div>

          {/* Status Stats Bento */}
          <div className="bg-zinc-900/40 border border-white/10 rounded-[2.5rem] p-8">
            <Shield className="text-purple-500 mb-4" size={28} />
            <h4 className="text-zinc-400 text-xs font-bold tracking-widest mb-1">SECURITY STATUS</h4>
            <div className="text-2xl font-bold">Grade A+</div>
            <div className="mt-4 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-blue-500 to-purple-600" />
            </div>
          </div>

          {/* Quick Stats Bento */}
          <div className="bg-zinc-900/40 border border-white/10 rounded-[2.5rem] p-8">
            <LayoutDashboard className="text-indigo-500 mb-4" size={28} />
            <h4 className="text-zinc-400 text-xs font-bold tracking-widest mb-1">ACTIVE SESSIONS</h4>
            <div className="text-4xl font-black">01</div>
          </div>

        </div>
      </main>
    </div>
  );
}