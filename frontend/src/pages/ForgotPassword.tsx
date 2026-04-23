import React, { useState } from 'react';
import { Mail, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // ✅ This hits your backend reset route
      await api.post('/auth/forgot-password', { email });
      setMessage({ 
        type: 'success', 
        text: 'Reset link sent! Please check your email inbox.' 
      });
    } catch (err: any) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Something went wrong. Try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-blue-600/10 p-4 rounded-3xl text-blue-600 mb-4">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">Reset Password</h2>
          <p className="text-slate-400 mt-2 text-sm">Enter your email and we'll send you a link to get back into your account.</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-2xl text-sm font-bold text-center ${
            message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="email" 
              required
              placeholder="Your Email Address"
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
          </button>
        </form>

        <Link to="/login" className="flex items-center justify-center gap-2 mt-8 text-slate-400 hover:text-blue-600 font-bold transition-all text-sm">
          <ArrowLeft size={16} /> BACK TO LOGIN
        </Link>
      </div>
    </div>
  );
};