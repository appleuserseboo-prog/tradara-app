import React from 'react';
import { MessageCircle, MapPin, Globe } from 'lucide-react';

interface ItemCardProps {
  item: any;
  onWhatsAppClick?: () => void; 
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onWhatsAppClick }) => {
  
  const handleContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If a custom click handler was passed from props, use it
    if (onWhatsAppClick) {
      onWhatsAppClick();
      return;
    }

    // 1. Remove all non-numeric characters (spaces, +, dashes)
    let phone = String(item.contactLink || "").replace(/\D/g, '');

    if (!phone) {
      alert("No contact number available for this seller.");
      return;
    }

    // 2. Global Smart Logic
    let cleanPhone = phone;
    const countryName = String(item.country || "").toLowerCase();

    // If the seller is in Nigeria and uses the local '0' format, convert to 234
    if ((countryName === 'nigeria' || countryName === '') && phone.startsWith('0')) {
      cleanPhone = `234${phone.substring(1)}`;
    } 
    // Otherwise, we assume the user entered their full country code (e.g., 966 for Saudi)
    // We just ensure there are no leading zeros if they included a country code
    else if (phone.startsWith('00')) {
      cleanPhone = phone.substring(2);
    }

    // 3. Construct WhatsApp URL
    const message = `Hello, I saw your "${item.stockName}" on Legendary Engine. Is it still available?`;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    // 4. Open in new tab
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-500">
      {/* IMAGE SECTION */}
      <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
        <img 
          src={item.images?.[0]?.startsWith('http') ? item.images[0] : `http://localhost:5000/${item.images?.[0]}`} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          alt={item.stockName}
          onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400?text=No+Image'; }}
        />
        
        {/* DYNAMIC CURRENCY & PRICE */}
        <div className="absolute top-4 left-4 backdrop-blur-md bg-white/70 px-4 py-2 rounded-2xl border border-white/20">
          <span className="font-black text-slate-900 text-lg">
            {item.currency || '₦'}{Number(item.price).toLocaleString()}
          </span>
        </div>
        
        {/* BARGAIN BADGE */}
        {item.canBargain && (
          <div className="absolute top-4 right-4 bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">
            Negotiable
          </div>
        )}
      </div>
      
      {/* CONTENT SECTION */}
      <div className="p-8">
        <div className="flex justify-between items-start mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
            {item.category || 'General'}
          </span>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-slate-400 text-[10px] font-bold uppercase">
              <MapPin size={10} /> {item.city}, {item.area}
            </div>
            <div className="flex items-center justify-end gap-1 text-blue-500 text-[9px] font-black uppercase">
              <Globe size={10} /> {item.country || 'Global'}
            </div>
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">
          {item.stockName}
        </h3>
        
        <p className="text-slate-400 text-xs italic mb-8 line-clamp-2">
          "{item.description}"
        </p>
        
        {/* CHAT BUTTON */}
        <button 
          onClick={handleContact}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-black transition-all transform active:scale-95 shadow-lg shadow-blue-500/20"
        >
          <MessageCircle size={20} /> CHAT NOW
        </button> 
      </div>
    </div>
  );
};