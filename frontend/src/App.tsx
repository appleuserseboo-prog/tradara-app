import React, { useEffect, useState, createContext } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
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
        
        <nav className={`fixed top-0 w-full z-50 border-b ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} backdrop-blur-md`}>
          <div className="max-w-7xl mx-auto px-2 h-16 flex items-center justify-between gap-1">
            
            {/* 1. HOME */}
            <Link to="/" className="flex flex-col items-center justify-center min-w-[50px] group">
              <HomeIcon className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-slate-700'}`} />
              <span className="text-[10px] font-medium mt-0.5">Home</span>
            </Link>

            {/* 2. NIGHT MODE */}
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="flex flex-col items-center justify-center min-w-[50px]">
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
              <span className="text-[10px] font-medium mt-0.5">{isDarkMode ? 'Day' : 'Night'}</span>
            </button>

            {token ? (
              <>
                {/* 3. SELL (Logged In) */}
                <Link to="/add-product" className="flex flex-col items-center justify-center min-w-[50px] text-blue-600">
                  <PlusCircle className="w-5 h-5" />
                  <span className="text-[10px] font-bold mt-0.5 uppercase">Sell</span>
                </Link>
                
                {/* 4. DASHBOARD (Logged In) */}
                <Link to="/dashboard" className="flex flex-col items-center justify-center min-w-[50px]">
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-0.5">Menu</span>
                </Link>

                {/* 5. EXIT (Logged In) */}
                <button onClick={handleLogout} className="flex flex-col items-center justify-center min-w-[50px] text-red-500">
                  <LogOut className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-0.5">Exit</span>
                </button>
              </>
            ) : (
              /* 3. LOGIN ONLY (Logged Out) - JOIN REMOVED PERMANENTLY */
              <Link to="/login" className="flex flex-col items-center justify-center min-w-[50px]">
                <User className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-slate-700'}`} />
                <span className="text-[10px] font-bold uppercase mt-0.5">Login</span>
              </Link>
            )}
            
            {/* 4. CART */}
            <Link to="/cart" className="relative flex flex-col items-center justify-center min-w-[50px]">
              <ShoppingBag className={`w-5 h-5 ${isDarkMode ? 'text-white' : 'text-slate-700'}`} />
              <span className="text-[10px] font-medium mt-0.5">Cart</span>
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