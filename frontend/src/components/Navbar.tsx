import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LogOut, 
  LayoutDashboard, 
  PlusCircle, 
  Search, 
  Moon, 
  Sun,
  ShoppingBag 
} from 'lucide-react';
import { useCart } from '../context/CartContext';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { cart } = useCart();
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Logic to check if user is logged in
  const token = localStorage.getItem('token');
  const isLoggedIn = !!token;

  const handleLogout = () => {
    localStorage.clear();
    localStorage.removeItem('token'); 
    localStorage.removeItem('user');
    navigate('/login');
    window.location.reload(); 
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5 px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* LOGO SECTION */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="bg-blue-600 p-2 rounded-xl group-hover:rotate-12 transition-transform">
            <ShoppingBag className="text-white" size={24} />
          </div>
          <div className="leading-none hidden xs:block">
            <h1 className="text-xl font-black tracking-tighter dark:text-white uppercase">Tradara</h1>
            <span className="text-[10px] font-bold text-blue-600 tracking-widest uppercase">Marketplace</span>
          </div>
        </Link>

        {/* SEARCH BAR (Visible on Laptop, Icon only on small mobile) */}
        <div className="hidden md:flex items-center bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-2xl w-full max-w-md border border-transparent focus-within:border-blue-500/50 transition-all">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Search campus items..." 
            className="bg-transparent border-none outline-none px-3 w-full text-sm dark:text-white"
          />
        </div>

        {/* ✅ UPDATED RESPONSIVE ACTIONS SECTION */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
          
          {/* THE FIRST GROUP: Theme & Sell - Always together */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={toggleDarkMode} 
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
            </button>

            {isLoggedIn && (
              <Link to="/add-product" className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-600/10 rounded-xl transition-colors flex items-center gap-1">
                <PlusCircle size={24} />
                <span className="hidden sm:inline font-black text-xs uppercase tracking-widest">Sell</span>
              </Link>
            )}
          </div>

          {isLoggedIn ? (
            /* THE SECOND GROUP: Dashboard, Logout & Cart */
            <div className="flex items-center gap-1 sm:gap-2">
              <Link to="/dashboard" className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all" title="Dashboard">
                <LayoutDashboard size={22} />
              </Link>
              
              <button 
                onClick={handleLogout}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                title="Logout"
              >
                <LogOut size={22} />
              </button>

              {/* DYNAMIC CART WITH NOTIFICATION BADGE */}
              <Link to="/cart" className="relative p-2 group" title="View Cart">
                <ShoppingBag size={24} className="text-slate-700 dark:text-white group-hover:text-blue-600 transition-colors" />
                {cart.length > 0 && (
                  <span className="absolute top-0 right-0 bg-red-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black animate-in fade-in zoom-in duration-300">
                    {cart.length}
                  </span>
                )}
              </Link>
            </div>
          ) : (
            /* LOGIN / JOIN - Visible when logged out */
            <div className="flex items-center gap-2">
              <Link to="/login" className="px-4 py-2 font-bold text-sm dark:text-white">
                Login
              </Link>
              <Link to="/register" className="bg-blue-600 text-white px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20">
                Join
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};