import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LogOut, 
  LayoutDashboard, 
  Moon, 
  Sun,
  ShoppingBag,
  Home as HomeIcon
} from 'lucide-react';
import { useCart } from '../context/CartContext';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart } = useCart();
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const token = localStorage.getItem('token');
  const isLoggedIn = !!token;

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    window.location.reload(); 
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5 px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* 1. HOME */}
        <Link to="/" className={`flex flex-col items-center gap-1 transition-colors ${isActive('/') ? 'text-blue-600' : 'text-slate-500 hover:text-blue-500'}`}>
          <HomeIcon size={24} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Home</span>
        </Link>

        {/* 2. NIGHT MODE */}
        <button onClick={toggleDarkMode} className="flex flex-col items-center gap-1 text-slate-500 hover:text-blue-500 transition-colors">
          {isDarkMode ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} />}
          <span className="text-[10px] font-black uppercase tracking-tighter">Night</span>
        </button>

        {/* 3. LOGIN / DASHBOARD (JOIN IS REMOVED HERE) */}
        {isLoggedIn ? (
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className={`flex flex-col items-center gap-1 ${isActive('/dashboard') ? 'text-blue-600' : 'text-slate-500'}`}>
              <LayoutDashboard size={24} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Menu</span>
            </Link>
            <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-red-500">
              <LogOut size={24} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Exit</span>
            </button>
          </div>
        ) : (
          <Link to="/login" className={`flex flex-col items-center gap-1 ${isActive('/login') ? 'text-blue-600' : 'text-slate-500'}`}>
             <div className="h-6 w-6 bg-slate-200 dark:bg-slate-800 rounded-full mb-1 flex items-center justify-center">
                <span className="text-[8px]">👤</span>
             </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Login</span>
          </Link>
        )}

        {/* 4. CART */}
        <Link to="/cart" className={`relative flex flex-col items-center gap-1 transition-colors ${isActive('/cart') ? 'text-blue-600' : 'text-slate-500'}`}>
          <ShoppingBag size={24} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Cart</span>
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black">
              {cart.length}
            </span>
          )}
        </Link>
      </div>
    </nav>
  );
};