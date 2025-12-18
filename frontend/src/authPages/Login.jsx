import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Mail, Lock, LogIn, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(''); // Added error state for UI

  const handleSubmit = async (e) => {
    const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
    const res = await axios.post(`${API_URL}/api/auth/login`, formData, {
  withCredentials: true 
});

      // Passing the full standardized user object to your AuthContext
      login({ 
        _id: res.data._id, 
        username: res.data.username, 
        email: res.data.email,
        token: res.data.token 
      });

      navigate('/home', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Authentication Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#020202] flex items-center justify-center p-6 overflow-hidden selection:bg-blue-500/30">
      
      {/* --- BACKDROP ANIMATION --- */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-float" style={{ animationDelay: '-3s' }} />
      </div>

      {/* --- MAIN LOGIN CARD --- */}
      <div className="relative w-full max-w-md group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-[2.5rem] opacity-10 group-hover:opacity-40 transition duration-1000 blur"></div>
        
        <div className="bg-zinc-900/40 backdrop-blur-2xl border border-white/10 relative rounded-[2.5rem] p-10 flex flex-col items-center shadow-2xl">
          
          {/* Header Icon */}
          <div className="relative mb-8">
            <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
            <div className="relative w-16 h-16 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
              <Sparkles className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-white tracking-tight mb-2 italic">AUTHORIZE</h1>
            <p className="text-zinc-500 text-sm font-medium">Welcome back to the future.</p>
          </div>

          {error && (
            <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl mb-6 text-center animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="space-y-4">
              <div className="relative group/input">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within/input:text-blue-400 transition-colors" />
                <input
                  type="email"
                  required
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                  placeholder="Email Address"
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="relative group/input">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within/input:text-purple-400 transition-colors" />
                <input
                  type="password"
                  required
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
                  placeholder="Password"
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full mt-6 bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all duration-500 group/btn overflow-hidden relative active:scale-95"
            >
              <span className="z-10 flex items-center gap-2">
                {loading ? 'SYNCING...' : 'SIGN IN'}
                <LogIn className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
            </button>
          </form>

          <div className="mt-10 flex items-center gap-2 text-[10px] text-zinc-600 uppercase tracking-[0.2em]">
            <ShieldCheck className="w-3 h-3" />
            <span>Encrypted Session</span>
          </div>
          
          <Link to="/signup" className="mt-6 text-zinc-400 text-xs hover:text-blue-400 transition-colors font-bold tracking-widest">
            NO ACCOUNT? <span className="text-white underline underline-offset-4">REGISTER</span>
          </Link>
        </div>
      </div>
    </div>
  );
}