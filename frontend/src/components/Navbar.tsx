import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LogOut, 
  LayoutDashboard, 
  PlusCircle, 
  Moon, 
  Sun,
  ShoppingBag,
  Home as HomeIcon,
  User
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

  // ACTIVE INDICATOR LOGIC
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-100 dark:border-white/5 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* 1. HOME ICON (With Indicator) */}
        <Link to="/" className={`flex flex-col items-center gap-1 transition-all ${isActive('/') ? 'text-blue-600 scale-110' : 'text-slate-500 hover:text-blue-500'}`}>
          <HomeIcon size={22} strokeWidth={isActive('/') ? 3 : 2} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Home</span>
        </Link>

        {/* 2. NIGHT MODE TOGGLE */}
        <button onClick={toggleDarkMode} className="flex flex-col items-center gap-1 text-slate-500 hover:text-blue-500 transition-colors">
          {isDarkMode ? <Sun size={22} className="text-yellow-400" /> : <Moon size={22} />}
          <span className="text-[10px] font-black uppercase tracking-tighter">Night</span>
        </button>

        {/* 3. LOGIN / DASHBOARD (Join Button Removed) */}
        {isLoggedIn ? (
          <div className="flex items-center gap-6">
            <Link to="/add-product" className={`flex flex-col items-center gap-1 transition-all ${isActive('/add-product') ? 'text-blue-600' : 'text-slate-500'}`}>
              <PlusCircle size={22} strokeWidth={isActive('/add-product') ? 3 : 2} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Sell</span>
            </Link>
            <Link to="/dashboard" className={`flex flex-col items-center gap-1 transition-all ${isActive('/dashboard') ? 'text-blue-600' : 'text-slate-500'}`}>
              <LayoutDashboard size={22} strokeWidth={isActive('/dashboard') ? 3 : 2} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Menu</span>
            </Link>
          </div>
        ) : (
          <Link to="/login" className={`flex flex-col items-center gap-1 transition-all ${isActive('/login') ? 'text-blue-600 scale-110' : 'text-slate-500'}`}>
            <User size={22} strokeWidth={isActive('/login') ? 3 : 2} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Login</span>
          </Link>
        )}

        {/* 4. CART ICON (With Indicator) */}
        <div className="flex items-center gap-4">
          <Link to="/cart" className={`relative flex flex-col items-center gap-1 transition-all ${isActive('/cart') ? 'text-blue-600 scale-110' : 'text-slate-500'}`}>
            <ShoppingBag size={22} strokeWidth={isActive('/cart') ? 3 : 2} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Cart</span>
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black animate-pulse">
                {cart.length}
              </span>
            )}
          </Link>
``
          {isLoggedIn && (
            <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-red-500">
              <LogOut size={20} />
              <span className="text-[10px] font-black uppercase tracking-tighter">Exit</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};