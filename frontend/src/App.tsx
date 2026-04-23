import React, { useEffect, useState, createContext } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { 
  Package, Search, PlusCircle, LayoutDashboard, 
  TrendingUp, Zap, LogOut, Heart, Moon, Sun, ShoppingBag, 
  MapPin, Share2, Globe, Bell
} from "lucide-react";

// Components & Pages
import { Home } from "./pages/Home";
import { Cart } from "./pages/cart";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { AddItem } from "./components/AddItem";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPasswordPage } from "./pages/ResetPassword";

export const AppContext = createContext<any>(null);

const App: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem("user") || "null"));
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

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
    <AppContext.Provider value={{ token, user, cartCount, setCartCount, searchQuery, setSearchQuery, isDarkMode }}>
      <Router>
        <div className={`${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-[#F4F7FF] text-slate-900'} min-h-screen transition-colors duration-500 font-sans`}>
          
          {/* LEGENDARY NAVBAR */}
          <nav className={`fixed top-0 w-full z-50 border-b ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'} backdrop-blur-md`}>
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
                <ShoppingBag className="w-8 h-8" />
                <span className="hidden md:block">MarketPlace</span>
              </Link>

              {/* GLOBAL SEARCH */}
              <div className="flex-1 max-w-md mx-8 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search campus items..."
                  className={`w-full pl-10 pr-4 py-2 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-transparent'} focus:ring-2 focus:ring-blue-500 outline-none}
                  onChange={(e) => setSearchQuery(e.target.value)`}
                />
              </div>

              <div className="flex items-center gap-4">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                  {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
                </button>

                {token ? (
                  <>
                    <Link to="/add-product" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1">
                      <PlusCircle className="w-6 h-6" />
                      <span className="hidden sm:inline font-medium">Sell</span>
                    </Link>
                    <Link to="/dashboard" className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1">
                      <LayoutDashboard className="w-6 h-6" />
                    </Link>
                    <button onClick={handleLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <LogOut className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Link to="/login" className="px-4 py-2 font-medium text-slate-600">Login</Link>
                    <Link to="/register" className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-200">Join</Link>
                  </div>
                )}
                
                <Link to="/cart" className="relative p-2">
                  <ShoppingBag className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                  {cartCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {cartCount}
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
              <Route path="*" element={<Navigate to="/" />} />
            
            <Route path="/reset-password" element={<ResetPasswordPage />} />
                </Routes>

          </main>
        </div>
      </Router>
    </AppContext.Provider>
  );
};

export default App;