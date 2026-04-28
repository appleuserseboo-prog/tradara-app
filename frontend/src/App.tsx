import React, { useEffect, useState, createContext } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { 
  PlusCircle, Search, LayoutDashboard, 
  LogOut, Moon, Sun, ShoppingBag
} from "lucide-react";

import { Home } from "./pages/Home";
import { Cart } from "./pages/cart"; 
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { AddItem } from "./components/AddItem";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPasswordPage } from "./pages/ResetPassword";
import { CartProvider, useCart } from "./context/CartContext"; 

export const AppContext = createContext<any>(null);

const AppContent: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem("user") || "null"));
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { cart } = useCart(); 

  const handleAuthSuccess = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
    window.location.href = "/"; 
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AppContext.Provider value={{ token, user, searchQuery, setSearchQuery, isDarkMode }}>
      <div className={`${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-[#F4F7FF] text-slate-900'} min-h-screen transition-colors duration-500 font-sans`}>
        
        <nav className={`fixed top-0 w-full z-50 border-b ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'} backdrop-blur-md px-2`}>
          <div className="max-w-7xl mx-auto h-16 flex items-center justify-between gap-2">
            
            {/* LOGO - Shrinks on tiny screens */}
            <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blue-600 shrink-0">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <span className="hidden sm:block tracking-tighter uppercase font-black text-sm">Tradara</span>
            </Link>

            {/* SEARCH BAR - Hidden on mobile to save space for icons */}
            <div className="hidden md:flex flex-1 max-w-md mx-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search campus items..."
                className={`w-full pl-10 pr-4 py-2 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-transparent'} focus:ring-2 focus:ring-blue-500 outline-none text-sm`}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* ACTION ICONS - Wrapped in a flex-wrap container */}
            <div className="flex items-center gap-1 sm:gap-3">
              
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>

              {token ? (
                <>
                  <Link to="/add-product" className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-1" title="Sell">
                    <PlusCircle className="w-6 h-6" />
                    <span className="hidden lg:inline font-bold text-xs uppercase">Sell</span>
                  </Link>
                  
                  <Link to="/dashboard" className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Dashboard">
                    <LayoutDashboard className="w-6 h-6" />
                  </Link>

                  <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg" title="Logout">
                    <LogOut className="w-6 h-6" />
                  </button>
                </>
              ) : (
                <div className="flex items-center">
                  <Link to="/login" className="px-3 py-2 text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Login</Link>
                  <Link to="/register" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-blue-500/20">Join</Link>
                </div>
              )}
              
              {/* DYNAMIC CART - Positioned to stay visible on mobile */}
              <Link to="/cart" className="relative p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all">
                <ShoppingBag className="w-6 h-6 text-slate-700 dark:text-white" />
                {cart.length > 0 && (
                  <span className="absolute top-0 right-0 bg-red-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black border-2 border-white dark:border-slate-900">
                    {cart.length}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </nav>

        <main className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login onLoginSuccess={handleAuthSuccess} />} /> 
            <Route path="/register" element={<Register onRegisterSuccess={handleAuthSuccess} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/add-product" element={token ? <AddItem /> : <Navigate to="/login" />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </AppContext.Provider>
  );
};

const App: React.FC = () => (
  <CartProvider>
    <Router>
      <AppContent />
    </Router>
  </CartProvider>
);

export default App;