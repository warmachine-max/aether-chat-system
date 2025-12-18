import { useAuth } from './context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LogOut, MessageSquare, Shield, Zap, 
  User as UserIcon, ArrowRight, Activity, 
  Settings, Globe 
} from 'lucide-react';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    try {
      await axios.post(`${API_URL}/api/auth/logout`, { userId: user?._id }, { withCredentials: true });
    } catch (err) {
      console.error("Backend logout failed", err);
    } finally {
      logout(); 
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-blue-500/30 overflow-x-hidden font-sans">
      
      {/* --- Ambient Background: Cinematic Glows --- */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px] mix-blend-screen" />
        {/* Grain Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      {/* --- Navbar: Ultra-Minimalist --- */}
      <nav className="fixed top-0 w-full z-50 px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            <Zap size={20} fill="black" />
          </div>
          <span className="text-xl font-black tracking-[0.2em] uppercase">Aether</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Secure Link Active</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-3 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 rounded-xl transition-all border border-transparent hover:border-red-500/20"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      {/* --- Main Dashboard --- */}
      <main className="relative pt-40 pb-20 px-6 max-w-6xl mx-auto">
        
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <div className="text-blue-500 font-mono text-xs tracking-[0.5em] mb-4 uppercase opacity-70">
              Authorized Personnel Only
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none uppercase">
              Welcome, <br />
              <span className="text-zinc-500">{user?.username || 'Agent'}</span>
            </h1>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-4xl font-light tracking-tighter text-zinc-600">12:00:00</div>
            <div className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mt-2">Local Instance Time</div>
          </div>
        </div>

        {/* --- Grid Layout --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Main Chat Hero Card */}
          <div 
            onClick={() => navigate('/chat')}
            className="md:col-span-3 group relative overflow-hidden bg-gradient-to-br from-zinc-900/80 to-black border border-white/5 rounded-[2rem] p-10 transition-all cursor-pointer hover:border-blue-500/40"
          >
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-8 border border-blue-500/20">
                  <MessageSquare size={24} className="text-blue-500" />
                </div>
                <h2 className="text-4xl font-bold tracking-tight mb-4">Initialize Signal</h2>
                <p className="text-zinc-400 max-w-sm text-lg leading-relaxed">
                  Start an end-to-end encrypted session. No logs, no traces, just pure communication.
                </p>
              </div>
              
              <div className="mt-12 flex items-center gap-4 group-hover:gap-6 transition-all text-blue-400 font-bold uppercase tracking-[0.2em] text-xs">
                Enter Terminal <ArrowRight size={18} />
              </div>
            </div>
            {/* Background Accent */}
            <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-blue-600/5 blur-[100px] group-hover:bg-blue-600/10 transition-all" />
          </div>

          {/* Identity Card */}
          <div className="md:col-span-1 bg-zinc-900/30 border border-white/5 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-zinc-800 rounded-3xl rotate-12 absolute inset-0 opacity-20 border border-white/10" />
              <div className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center border border-white/10 relative z-10 shadow-2xl">
                <UserIcon size={32} className="text-zinc-600" />
              </div>
            </div>
            <div className="font-mono text-[10px] text-zinc-500 tracking-[0.3em] uppercase mb-1">Authenticated As</div>
            <h3 className="font-bold text-lg mb-6">{user?.username}</h3>
            <button className="flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-400 hover:text-white transition-colors">
              <Settings size={14} /> ACCOUNT SETTINGS
            </button>
          </div>

          {/* Mini Stats Grid */}
          <div className="bg-zinc-900/30 border border-white/5 rounded-[2rem] p-6 flex flex-col justify-between group hover:bg-zinc-900/50 transition-all">
            <Activity size={20} className="text-green-500" />
            <div>
              <div className="text-2xl font-bold">99.9%</div>
              <div className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Uptime</div>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-white/5 rounded-[2rem] p-6 flex flex-col justify-between hover:bg-zinc-900/50 transition-all">
            <Shield size={20} className="text-blue-500" />
            <div>
              <div className="text-2xl font-bold">AES-256</div>
              <div className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Encryption</div>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-white/5 rounded-[2rem] p-6 flex flex-col justify-between hover:bg-zinc-900/50 transition-all">
            <Globe size={20} className="text-purple-500" />
            <div>
              <div className="text-2xl font-bold">Global</div>
              <div className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Availability</div>
            </div>
          </div>

          <div className="bg-blue-600 rounded-[2rem] p-6 flex flex-col justify-center items-center text-center group cursor-pointer hover:bg-blue-500 transition-all shadow-[0_20px_40px_rgba(37,99,235,0.2)]">
            <span className="text-[10px] font-black tracking-widest uppercase text-blue-200 mb-1">New Update</span>
            <div className="font-bold text-sm">v2.0.4 AVAILABLE</div>
          </div>

        </div>
      </main>
    </div>
  );
}