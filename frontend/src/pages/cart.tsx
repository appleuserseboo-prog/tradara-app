import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Trash2, ShoppingBag, ArrowLeft, ChevronRight, MessageSquare } from 'lucide-react';

export const Cart = () => {
  const { cart, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();

  const totalPotentialInvestment = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // ✅ HANDLER: Takes user to WhatsApp with a list of all cart items
  const handleCheckout = () => {
    if (cart.length === 0) return;

    const itemList = cart.map(item => - `${item.stockName} (${item.currency}${item.price})`).join('%0A');
    const message = `Hello Tradara! I am ready to invest in these items from my cart:%0A%0A${itemList}%0A%0ATotal: ₦${totalPotentialInvestment.toLocaleString()}`;
    
    // In a multi-seller app, we usually navigate back to home or a specific seller chat
    // For now, let's navigate them back to explore more
    window.open(`https://wa.me/?text=${message}`, '_blank');
    navigate('/'); 
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-6">
        <div className="p-8 bg-blue-50 dark:bg-blue-900/10 rounded-[3rem] text-blue-600 animate-bounce">
          <ShoppingBag size={64} />
        </div>
        <h2 className="text-3xl font-black tracking-tighter dark:text-white uppercase">Your Cart is Empty</h2>
        <p className="text-slate-500 font-medium">Time to find some legendary deals!</p>
        <Link to="/" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pt-10 pb-20">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-12">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 font-bold hover:text-blue-600 transition-colors">
          <ArrowLeft size={20} /> Back
        </button>
        <h1 className="text-4xl font-black tracking-tighter uppercase dark:text-white">Your Cart</h1>
        <button onClick={clearCart} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-all">
          Clear All
        </button>
      </div>

      <div className="space-y-4">
        {cart.map((item) => (
          <div key={item.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] flex items-center gap-6 shadow-sm group border-2 border-transparent hover:border-blue-500/20 transition-all">
            <img src={item.image} alt={item.stockName} className="w-24 h-24 object-cover rounded-3xl" />
            
            <div className="flex-1">
              <h3 className="text-xl font-black dark:text-white">{item.stockName}</h3>
              <p className="text-blue-600 font-black text-lg">
                {item.currency}{Number(item.price).toLocaleString()}
              </p>
            </div>

            <button 
              onClick={() => removeFromCart(item.id)}
              className="p-4 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* SUMMARY CARD */}
      <div className="mt-12 bg-blue-600 rounded-[3rem] p-10 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
            <ShoppingBag size={120} />
        </div>
        
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">Total Potential Investment</p>
          <h2 className="text-5xl font-black tracking-tighter mb-8">
            ₦{totalPotentialInvestment.toLocaleString()}
          </h2>
          
          <button 
            onClick={handleCheckout}
            className="w-full bg-white text-blue-600 py-6 rounded-[2rem] font-black text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95 shadow-lg"
          >
            Proceed to Secure Checkout <ChevronRight size={18} />
          </button>
          
          <p className="text-center mt-6 text-[9px] font-bold opacity-60 flex items-center justify-center gap-2">
            <MessageSquare size={12} /> Contacting sellers to finalize deals
          </p>
        </div>
      </div>
    </div>
  );
};