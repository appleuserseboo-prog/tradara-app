import React, { useState, createContext } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { 
  PlusCircle, LayoutDashboard, 
  LogOut, Moon, Sun, ShoppingBag, Home as HomeIcon, User
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
import { ProductDetail } from './pages/ProductDetails'; 

export const AppContext = createContext<any>(null);

const AppContent: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem("user") || "null"));
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { cart } = useCart(); 

  const location = useLocation();
  const navigate = useNavigate(); // Added for smoother internal routing
  const isActive = (path: string) => location.pathname === path;

  const handleAuthSuccess = (newToken: string) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
    // Use navigate to go home instead of a full page reload to avoid 404s
    navigate("/"); 
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    // Directly setting the pathname ensures the browser hits the /login route 
    // while the App remains mounted, preventing the Vercel 404.
    window.location.pathname = "/login"; 
  };

  return (
    <AppContext.Provider value={{ token, user, searchQuery, setSearchQuery, isDarkMode }}>
      <div className={`${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-[#F4F7FF] text-slate-900'} min-h-screen transition-colors duration-500 font-sans`}>
        
        <nav className={`fixed top-0 w-full z-50 border-b ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} backdrop-blur-md`}>
          <div className="max-w-7xl mx-auto px-2 h-16 flex items-center justify-between gap-1">
            
            <Link to="/" className={`flex flex-col items-center justify-center min-w-[50px] transition-all duration-300 ${isActive('/') ? 'text-blue-600 scale-110' : 'text-slate-500 hover:text-blue-400'}`}>
              <HomeIcon className="w-5 h-5" strokeWidth={isActive('/') ? 3 : 2} />
              <span className={`text-[10px] uppercase mt-0.5 ${isActive('/') ? 'font-black' : 'font-medium'}`}>Home</span>
            </Link>

            <button onClick={() => setIsDarkMode(!isDarkMode)} className="flex flex-col items-center justify-center min-w-[50px] text-slate-500 hover:text-blue-400 transition-all">
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" />}
              <span className="text-[10px] font-medium mt-0.5">{isDarkMode ? 'Day' : 'Night'}</span>
            </button>

            {token ? (
              <>
                <Link to="/add-product" className={`flex flex-col items-center justify-center min-w-[50px] transition-all duration-300 ${isActive('/add-product') ? 'text-blue-600 scale-110' : 'text-slate-500 hover:text-blue-400'}`}>
                  <PlusCircle className="w-5 h-5" strokeWidth={isActive('/add-product') ? 3 : 2} />
                  <span className={`text-[10px] uppercase mt-0.5 ${isActive('/add-product') ? 'font-black' : 'font-medium'}`}>Sell</span>
                </Link>
                
                <Link to="/dashboard" className={`flex flex-col items-center justify-center min-w-[50px] transition-all duration-300 ${isActive('/dashboard') ? 'text-blue-600 scale-110' : 'text-slate-500 hover:text-blue-400'}`}>
                  <LayoutDashboard className="w-5 h-5" strokeWidth={isActive('/dashboard') ? 3 : 2} />
                  <span className={`text-[10px] uppercase mt-0.5 ${isActive('/dashboard') ? 'font-black' : 'font-medium'}`}>Menu</span>
                </Link>

                <button onClick={handleLogout} className="flex flex-col items-center justify-center min-w-[50px] text-red-500 hover:text-red-700 transition-all">
                  <LogOut className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-0.5">Exit</span>
                </button>
              </>
            ) : (
              <Link to="/login" className={`flex flex-col items-center justify-center min-w-[50px] transition-all duration-300 ${isActive('/login') ? 'text-blue-600 scale-110' : 'text-slate-500 hover:text-blue-400'}`}>
                <User className="w-5 h-5" strokeWidth={isActive('/login') ? 3 : 2} />
                <span className={`text-[10px] uppercase mt-0.5 ${isActive('/login') ? 'font-black' : 'font-medium'}`}>Login</span>
              </Link>
            )}
            
            <Link to="/cart" className={`relative flex flex-col items-center justify-center min-w-[50px] transition-all duration-300 ${isActive('/cart') ? 'text-blue-600 scale-110' : 'text-slate-500 hover:text-blue-400'}`}>
              <ShoppingBag className="w-5 h-5" strokeWidth={isActive('/cart') ? 3 : 2} />
              <span className={`text-[10px] uppercase mt-0.5 ${isActive('/cart') ? 'font-black' : 'font-medium'}`}>Cart</span>
              {cart.length > 0 && (
                <span className="absolute top-[-2px] right-[8px] bg-red-600 text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-black border border-white dark:border-slate-900">
                  {cart.length}
                </span>
              )}
            </Link>
          </div>
        </nav>

        <main className="pt-20 pb-12 px-4 max-w-7xl mx-auto">
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
            <Route path="/product/:id" element={<ProductDetail />} />
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