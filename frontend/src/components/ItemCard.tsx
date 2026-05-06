import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, 
  MapPin, 
  BadgeCheck, 
  ShoppingCart, 
  MessageSquare, 
  Flame 
} from 'lucide-react';
import { useCart } from '../context/CartContext';

interface ItemCardProps {
  item: any;
  onWhatsAppClick?: () => void; 
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onWhatsAppClick }) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  
  // 1. SPA NAVIGATION: Prevent reload and navigate instantly
  const handleViewDetails = (e: React.MouseEvent) => {
    // If the user clicks a button inside the card, don't navigate to the product page
    if ((e.target as HTMLElement).closest('button')) return;
    
    e.preventDefault();
    navigate(`/product/${item.id}`);
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return 'https://placehold.co/400x500?text=No+Image';
    if (imagePath.includes('cloudinary.com')) {
      return imagePath.replace('/upload/', '/upload/w_500,c_fill,g_auto,q_auto,f_auto/');
    }
    if (imagePath.startsWith('http')) return imagePath;
    const baseUrl = 'https://tradara-backend.onrender.com';
    return `${baseUrl}/uploads/${imagePath.replace(/\\/g, '/')}`;
  };

  const handleContact = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents navigating to product page when clicking CHAT
    if (onWhatsAppClick) {
      onWhatsAppClick();
      return;
    }
    let phone = String(item.contactLink || "").replace(/\D/g, '');
    if (!phone) return alert("No contact available.");
    
    let cleanPhone = phone;
    const countryName = String(item.country || "").toLowerCase();
    if ((countryName === 'nigeria' || countryName === '') && phone.startsWith('0')) {
      cleanPhone = `234${phone.substring(1)}`;
    } 

    const message =` Hello, I saw your "${item.stockName}" on Tradara. Is it still available?`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents navigating to product page when clicking +CART
    addToCart(item);
  };

  return (
    <div 
      onClick={handleViewDetails}
      className="glass-card group rounded-[2.5rem] overflow-hidden hover:scale-[1.03] transition-all duration-500 hover:border-blue-500/40 cursor-pointer flex flex-col h-full"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-900 shrink-0">
        <img 
          src={getImageUrl(item.images?.[0])} 
          loading="lazy"
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
          alt={item.stockName}
          onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x500?text=Image+Not+Found'; }}
        />
        
        {/* Global Badge */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
           <div className="backdrop-blur-xl bg-blue-600/20 border border-blue-400/30 px-2 sm:px-3 py-1 rounded-full flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-[8px] sm:text-[10px] font-black text-blue-400 uppercase tracking-tighter">Visible Worldwide</span>
           </div>
        </div>

        {/* Pricing and Negotiable status */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex flex-col gap-1 items-end">
          <div className="glass-card px-3 sm:px-4 py-1 sm:py-2 rounded-xl sm:rounded-2xl border-white/20 bg-black/40 backdrop-blur-md">
            <span className="font-black text-white text-sm sm:text-lg">
              {item.currency || '₦'}{Number(item.price).toLocaleString()}
            </span>
          </div>
          {item.canBargain && (
            <span className="text-[8px] font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-lg border border-green-400/20 backdrop-blur-md">
              <BadgeCheck size={10} className="inline mr-1" /> Negotiable
            </span>
          )}
        </div>

        {/* Trending Badge */}
        <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4">
           <div className="backdrop-blur-md bg-black/60 px-2 sm:px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5">
              <Flame size={12} className="text-orange-500 fill-orange-500" />
              <span className="text-[8px] sm:text-[9px] font-black text-white uppercase tracking-wider">
                Trending in {item.city || 'Worldwide'}
              </span>
           </div>
        </div>
      </div>
      
      {/* 2. LAYOUT FIX: Content Container with improved flex-wrap to prevent clipping */}
      <div className="p-4 sm:p-6 flex flex-col flex-grow gap-3 sm:gap-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
           <span className="text-[9px] sm:text-[10px] font-black text-blue-500 uppercase tracking-tighter bg-blue-500/10 px-2 sm:px-3 py-1 rounded-full">
             {item.category || 'General'}
           </span>
           <div className="flex items-center gap-1 text-slate-500 min-w-0">
             <MapPin size={10} className="shrink-0" />
             <span className="text-[9px] sm:text-[10px] font-bold uppercase truncate max-w-[100px]">
               {item.city}{item.area ?`, ${item.area}` : ''}
             </span>
           </div>
        </div>
        
        <h3 className="text-lg sm:text-2xl font-black tracking-tight leading-none group-hover:text-blue-400 transition-colors line-clamp-1">
          {item.stockName}
        </h3>
        
        <p className="text-slate-400 text-xs sm:text-sm line-clamp-2 italic leading-relaxed">
          "{item.description}"
        </p>
        
        {/* Actions - Ensures buttons stay at the bottom */}
        <div className="mt-auto flex flex-col sm:flex-row gap-2 pt-2">
          <button 
            onClick={handleContact}
            className="flex-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl font-bold text-[10px] sm:text-xs flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95 border border-slate-200 dark:border-slate-700 uppercase tracking-widest"
          >
            <MessageSquare size={14} /> CHAT
          </button>

          <button 
            onClick={handleAddToCart}
            className="flex-1 bg-blue-600 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl font-bold text-[10px] sm:text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20 uppercase tracking-widest"
          >
            <ShoppingCart size={14} /> + CART
          </button>
        </div>
      </div>
    </div>
  );
};