import React, { useState } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { 
  User, Shield, Key, ArrowLeft, 
  Check, Camera, Smartphone, Globe,
  RefreshCw, Lock, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Profile() {
  const { user, setUser } = useAuth(); // Ensure your AuthContext provides setUser
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('identity');
  
  // --- Form State ---
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  // --- Handle Update Logic ---
  const handleUpdateProfile = async () => {
    setLoading(true);
    setStatusMsg({ type: '', text: '' });
    try {
      const res = await axios.put(
        `${API_URL}/api/users/profile`, 
        formData, 
        { withCredentials: true }
      );
      
      // Update Global Auth State
      setUser(res.data); 
      setStatusMsg({ type: 'success', text: 'PROTOCOL UPDATED: IDENTITY SYNCED' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'UPDATE FAILED: SECURITY BREACH OR SERVER ERROR' });
    } finally {
      setLoading(false);
      // Clear message after 3 seconds
      setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 px-8 py-6 bg-black/20 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')}
          className="group flex items-center gap-2 text-zinc-500 hover:text-white transition-all text-xs font-black tracking-widest"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          BACK TO COMMAND
        </button>
        
        {/* Success/Error Toast Notification */}
        {statusMsg.text && (
          <div className={`text-[10px] font-black tracking-[0.2em] px-4 py-1 rounded-full border animate-in fade-in zoom-in ${
            statusMsg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'
          }`}>
            {statusMsg.text}
          </div>
        )}

        <div className="hidden md:block text-[10px] font-black text-zinc-500 tracking-[0.4em] uppercase">Security Level: Authorized</div>
      </header>

      <main className="pt-32 pb-32 px-6 max-w-5xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          
          {/* Sidebar Navigation */}
          <nav className="md:col-span-3 space-y-2">
            {[
              { id: 'identity', label: 'Identity', icon: User },
              { id: 'security', label: 'Security', icon: Shield },
              { id: 'sessions', label: 'Active Nodes', icon: Smartphone }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                  activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.2)]' 
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Tab Content */}
          <div className="md:col-span-9">
            {activeTab === 'identity' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <section>
                  <h2 className="text-3xl font-black tracking-tight mb-8 uppercase italic">User Identity</h2>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-8 p-8 bg-zinc-900/30 border border-white/5 rounded-[2.5rem]">
                    <div className="relative group">
                      <div className="w-32 h-32 bg-zinc-800 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl transition-transform group-hover:scale-95 overflow-hidden">
                        <User size={48} className="text-zinc-600" />
                      </div>
                      <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <Camera size={24} />
                      </div>
                    </div>
                    
                    <div className="flex-1 text-center sm:text-left">
                      <div className="text-[10px] font-black text-blue-500 tracking-widest uppercase mb-1">Status: Operational</div>
                      <h3 className="text-2xl font-bold mb-2 text-white">{user?.username}</h3>
                      <p className="text-zinc-500 text-sm font-medium">{user?.email}</p>
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-6 bg-zinc-900/30 border border-white/5 rounded-3xl">
                    <label className="text-[10px] font-black text-zinc-500 tracking-widest uppercase block mb-2">Display Name</label>
                    <input 
                      type="text" 
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="p-6 bg-zinc-900/30 border border-white/5 rounded-3xl opacity-60">
                    <label className="text-[10px] font-black text-zinc-500 tracking-widest uppercase block mb-2">System Email</label>
                    <input 
                      type="email" 
                      disabled
                      value={formData.email}
                      className="w-full bg-transparent border-none px-0 py-3 text-sm text-zinc-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="p-8 bg-zinc-900/30 border border-white/5 rounded-[2.5rem]">
                <h3 className="text-xl font-bold mb-6">Security Override</h3>
                <p className="text-zinc-500 text-sm mb-8 italic">Changing your master password will revoke current session keys.</p>
                <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-xl border border-white/10 text-[10px] font-black tracking-widest uppercase transition-all">
                  <Lock size={14} /> Initialize Password Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <button 
          onClick={handleUpdateProfile}
          disabled={loading}
          className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 px-10 py-4 rounded-2xl shadow-[0_20px_40px_rgba(37,99,235,0.3)] font-black text-xs tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          {loading ? 'SYNCHRONIZING...' : 'SAVE PROTOCOL CHANGES'}
        </button>
      </footer>
    </div>
  );
}