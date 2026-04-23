import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react'; // Matches your current icon style

export const Cart = () => {
  // Replace this with your actual data fetching logic later
  const cartItems = []; 

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Your Shopping Cart</h1>
      
      {cartItems.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-slate-500">Your cart is empty. Time to go shopping!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* List of items would go here */}
          <div className="md:col-span-2 space-y-4">
             {/* Map through items... */}
          </div>

          {/* Checkout Summary */}
          <div className="bg-slate-50 p-6 rounded-2xl h-fit">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <div className="flex justify-between mb-2">
              <span>Subtotal</span>
              <span>₦0.00</span>
            </div>
            <button className="w-full bg-blue-600 text-white py-3 rounded-xl mt-4 font-bold">
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};