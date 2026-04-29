import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import API from '../services/api';

interface LoginProps {
  onLoginSuccess: (newToken: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();

  // State Hooks
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data } = await API.post('/auth/login', { email, password });
      
      if (data?.token) {
        // Use the prop passed from App.tsx to update global state
        onLoginSuccess(data.token); 
        navigate('/'); 
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md p-10 bg-white/10 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-blue-600 rounded-2xl text-white mb-4">
            <LogIn size={28} />
          </div>
          <h2 className="text-4xl font-black text-white tracking-tighter">Welcome Back</h2>
          <p className="text-slate-400 mt-2 font-medium">Log in to manage your campus deals</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-slate-500" size={20} />
            <input 
              type="email" 
              placeholder="Enter your Email" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password Input with Show/Hide Toggle */}
          <div className="relative">
            <Lock className="absolute left-4 top-4 text-slate-500" size={20} />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-4 text-slate-500 hover:text-white"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between px-2">
            <label className="flex items-center gap-2 text-slate-400 text-sm cursor-pointer">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="rounded border-white/10 bg-white/5 text-blue-600 focus:ring-0" 
              />
              Remember me
            </label>
            <Link to="/forgot-password" size-sm className="text-blue-400 text-sm font-bold hover:text-blue-300">
              Forgot?
            </Link>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm font-bold text-center">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-lg shadow-blue-600/20 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-400">
            New to the campus?{' '}
            <Link to="/register" className="text-white font-black hover:text-blue-400 transition-colors">
              Join the community
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

