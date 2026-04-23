import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LogOut, 
  LayoutDashboard, 
  PlusCircle, 
  Search, 
  Moon, 
  ShoppingBag 
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  
  // Logic to check if user is logged in
  const token = localStorage.getItem('token');
  const isLoggedIn = !!token;

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = `/login`
    localStorage.removeItem('token'); // Clears the "Token is not valid" issue
    localStorage.removeItem('user');
    navigate('/login');
    window.location.reload(); 
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* LOGO SECTION */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-blue-600 p-2 rounded-xl group-hover:rotate-12 transition-transform">
            <ShoppingBag className="text-white" size={24} />
          </div>
          <div className="leading-none">
            <h1 className="text-xl font-black tracking-tighter dark:text-white uppercase">Legendary</h1>
            <span className="text-[10px] font-bold text-blue-600 tracking-widest uppercase">Global Engine</span>
          </div>
        </Link>

        {/* SEARCH BAR (Global Scope) */}
        <div className="hidden md:flex items-center bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-2xl w-96 border border-transparent focus-within:border-blue-500/50 transition-all">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Search Laptops, Hostels, or Fashion..." 
            className="bg-transparent border-none outline-none px-3 w-full text-sm dark:text-white"
          />
        </div>

        {/* ACTIONS SECTION */}
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
            <Moon size={20} />
          </button>

          {isLoggedIn ? (
            <>
              <button 
                onClick={() => navigate('/dashboard')}
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 font-bold text-sm dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all"
              >
                <LayoutDashboard size={18} className="text-blue-600" />
                Dashboard
              </button>

              <button 
                onClick={() => navigate('/add-product')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-black text-sm shadow-lg shadow-blue-500/20 transition-all"
              >
                <PlusCircle size={18} />
                <span className="hidden sm:inline uppercase">Post Ad</span>
              </button>

              <button 
                onClick={handleLogout}
                className="p-2.5 text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-2xl transition-all"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="px-6 py-2.5 font-bold text-sm dark:text-white">
                Login
              </Link>
              <Link to="/register" className="bg-slate-900 dark:bg-white dark:text-black px-6 py-2.5 rounded-2xl font-black text-sm uppercase">
                Join
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};