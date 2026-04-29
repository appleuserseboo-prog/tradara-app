import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, ShieldCheck, ArrowRight } from 'lucide-react';
import API from '../services/api';

// This interface matches exactly what App.tsx is looking for
interface RegisterProps {
  onRegisterSuccess: (token: string) => void;
  onViewChange?: () => void; // The '?' makes it optional, fixing the TS error
}

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const { data } = await API.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      
      if (data.token) {
        onRegisterSuccess(data.token);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7FF] dark:bg-slate-950 px-4 py-12">
      {/* Background Decoration */}
      <div className="absolute w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full bottom-0 right-0"></div>
      
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white mb-4 shadow-xl">
            <UserPlus size={32} />
          </div>
          <h2 className="text-4xl font-black tracking-tighter dark:text-white italic">BECOME LEGENDARY</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Join the TRADARA Marketplace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* NAME */}
            <div className="relative">
              <User className="absolute left-4 top-4 text-slate-400" size={20} />
              <input 
                type="text" required placeholder="Full Name (e.g. Bello Ibraheem)"
                className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white"
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            {/* EMAIL */}
            <div className="relative">
              <Mail className="absolute left-4 top-4 text-slate-400" size={20} />
              <input 
                type="email" required placeholder="Enter your Email"
                className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            {/* PASSWORD */}
            <div className="relative">
              <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
              <input 
                type="password" required placeholder="Create Password"
                className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white"
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            {/* CONFIRM PASSWORD */}
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-4 text-slate-400" size={20} />
              <input 
                type="password" required placeholder="Confirm Password"
                className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-600 transition-all dark:text-white"
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-xs font-black text-center uppercase py-2">{error}</p>}

          <button 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 group"
          >
            {loading ? 'CREATING ACCOUNT...' : (
              <>
                START SELLING <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-100 dark:border-white/5 text-center">
          <p className="text-slate-400 text-sm font-medium">
            Already have an account? <br/>
            <Link to="/login" className="text-blue-600 font-black hover:underline mt-2 inline-block uppercase text-xs tracking-widest">
              Log in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};