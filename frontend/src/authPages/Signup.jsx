import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false); // UI improvement
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Ensure this matches your Render backend URL
      const res = await axios.post('http://localhost:5000/api/auth/signup', formData, {
        withCredentials: true // Mandatory for the HttpOnly cookie we set in AuthController
      });

      // Match the data structure returned by your AuthController
      const userData = {
        _id: res.data._id,
        username: res.data.username,
        email: res.data.email,
        token: res.data.token
      };

      login(userData);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-[#050505] px-4 overflow-hidden selection:bg-blue-500/30">
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px]" />

      <div className="relative w-full max-w-[440px]">
        <div className="bg-zinc-900/40 backdrop-blur-2xl border border-white/[0.08] p-8 md:p-12 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          
          <div className="text-center mb-10">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 mb-6 shadow-inner">
              <User className="w-6 h-6 text-blue-500" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Create Account</h1>
            <p className="text-zinc-500 mt-2 text-sm">Join the community today</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl mb-6 text-center animate-pulse">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 ml-1">Username</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  required
                  className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
                  placeholder="johndoe"
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  required
                  className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
                  placeholder="name@company.com"
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 ml-1">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full bg-zinc-950/50 border border-white/5 rounded-2xl pl-12 pr-12 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all placeholder:text-zinc-700"
                  placeholder="••••••••"
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:opacity-50 overflow-hidden mt-2"
            >
              <div className="flex items-center justify-center gap-2">
                {loading ? 'SYNCING...' : 'GET STARTED'}
                {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </div>
            </button>
          </form>

          <p className="mt-8 text-center text-zinc-500 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-white font-medium hover:text-blue-500 transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}