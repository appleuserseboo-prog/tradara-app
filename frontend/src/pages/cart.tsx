import React from 'react';
import { useCart } from '../context/CartContext';
import { Trash2, ArrowLeft, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Cart: React.FC = () => {
  const { cart, removeFromCart, clearCart } = useCart();

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#F4F7FF] dark:bg-slate-950">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-xl text-center">
          <ShoppingBag size={64} className="mx-auto text-slate-300 mb-6" />
          <h2 className="text-2xl font-black dark:text-white uppercase">Your Cart is Empty</h2>
          <p className="text-slate-500 mb-8 mt-2">Time to find something legendary!</p>
          <Link to="/" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase shadow-lg">Start Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-10 pb-20 px-4 bg-[#F4F7FF] dark:bg-slate-950">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <Link to="/" className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-slate-500"><ArrowLeft /></Link>
          <h1 className="text-3xl font-black dark:text-white uppercase">Your Collection</h1>
          <button onClick={clearCart} className="text-red-500 font-bold text-xs uppercase">Clear All</button>
        </div>

        <div className="space-y-4">
          {cart.map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] shadow-sm flex items-center gap-4">
              <img src={item.image} className="w-20 h-20 rounded-2xl object-cover" alt={item.stockName} />
              <div className="flex-1">
                <h3 className="font-black dark:text-white uppercase text-sm">{item.stockName}</h3>
                <p className="text-blue-600 font-black">{item.currency}{item.price}</p>
              </div>
              <button onClick={() => removeFromCart(item.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-blue-600 p-8 rounded-[3rem] shadow-xl text-white">
          <p className="uppercase text-xs font-bold opacity-80">Total Potential Investment</p>
          <h2 className="text-4xl font-black mt-1">
            ₦{cart.reduce((total, item) => total + (Number(item.price) || 0), 0).toLocaleString()}
          </h2>
          <button className="w-full mt-6 bg-white text-blue-600 py-4 rounded-2xl font-black uppercase">Proceed to Secure Checkout</button>
        </div>
      </div>
    </div>
  );
};