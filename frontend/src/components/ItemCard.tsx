import React from 'react';
import { MessageCircle, MapPin, BadgeCheck, ShoppingCart, MessageSquare } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface ItemCardProps {
  item: any;
  onWhatsAppClick?: () => void; 
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onWhatsAppClick }) => {
  const { addToCart } = useCart();
  
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return 'https://placehold.co/400x500?text=No+Image';
    if (imagePath.includes('cloudinary.com')) {
      // ✅ DATA SAVER: Uses Cloudinary auto-format (WebP/AVIF) and auto-quality
      return imagePath.replace('/upload/', '/upload/w_500,c_fill,g_auto,q_auto,f_auto/');
    }
    if (imagePath.startsWith('http')) return imagePath;
    const baseUrl = 'https://tradara-backend.onrender.com';
    return `${baseUrl}/uploads/${imagePath.replace(/\\/g, '/')}`;
  };

  const handleContact = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <div className="glass-card group rounded-[2.5rem] overflow-hidden hover:scale-[1.03] transition-all duration-500 hover:border-blue-500/40">
      
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-900">
        <img 
          src={getImageUrl(item.images?.[0])} 
          loading="lazy" // ✅ DATA SAVER: Only loads when visible on screen
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
          alt={item.stockName}
          onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x500?text=Image+Not+Found'; }}
        />
        
        <div className="absolute top-4 left-4">
           <div className="backdrop-blur-xl bg-blue-600/20 border border-blue-400/30 px-3 py-1.5 rounded-full flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-tighter">Visible Worldwide</span>
           </div>
        </div>

        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          <div className="glass-card px-4 py-2 rounded-2xl border-white/20 bg-black/40">
            <span className="font-black text-white text-lg">
              {item.currency || '₦'}{Number(item.price).toLocaleString()}
            </span>
          </div>
          {item.canBargain && (
            <span className="text-[9px] font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-lg border border-green-400/20 backdrop-blur-md">
              <BadgeCheck size={10} className="inline mr-1" /> Negotiable
            </span>
          )}
        </div>

        <div className="absolute bottom-4 left-4">
           <div className="backdrop-blur-md bg-black/60 px-3 py-1 rounded-xl border border-white/5 text-[9px] font-bold text-slate-300">
              🔥 Trending in {item.city}
           </div>
        </div>
      </div>
      
      <div className="p-8 space-y-4">
        <div className="flex justify-between items-center">
           <span className="text-[10px] font-black text-blue-500 uppercase tracking-tighter bg-blue-500/10 px-3 py-1 rounded-full">
             {item.category || 'General'}
           </span>
           <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
             <MapPin size={10} /> {item.city}{item.area ? `, ${item.area} `: ''}
           </span>
        </div>
        
        <h3 className="text-2xl font-black tracking-tight leading-none group-hover:text-blue-400 transition-colors line-clamp-1">
          {item.stockName}
        </h3>
        
        <p className="text-slate-400 text-sm line-clamp-2 italic leading-relaxed">
          "{item.description}"
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <button 
            onClick={handleContact}
            className="flex-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-100 transition-all active:scale-95 border border-slate-200 dark:border-slate-700 uppercase tracking-widest"
          >
            <MessageSquare size={16} /> CHAT
          </button>

          <button 
            onClick={() => addToCart(item)}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/20 uppercase tracking-widest"
          >
            <ShoppingCart size={16} /> + CART
          </button>
        </div>
      </div>
    </div>
  );
};