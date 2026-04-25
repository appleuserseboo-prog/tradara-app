import React from 'react';
import { MessageCircle, MapPin, Globe } from 'lucide-react';

interface ItemCardProps {
  item: any;
  onWhatsAppClick?: () => void; 
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onWhatsAppClick }) => {
  // ✅ DYNAMIC IMAGE PATH LOGIC
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return 'https://via.placeholder.com/400?text=No+Image';
    
    // 1. If it's already a full URL (Cloudinary), use it directly!
    if (imagePath.startsWith('http')) {
      // Force HTTPS to avoid the "Mixed Content" error
      return imagePath.replace('http://', 'https://');
    }
    
    // 2. Backup for local testing (only if imagePath is just a filename)
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
    if (!phone) {
      alert("No contact number available.");
      return;
    }

    let cleanPhone = phone;
    const countryName = String(item.country || "").toLowerCase();
    if ((countryName === 'nigeria' || countryName === '') && phone.startsWith('0')) {
      cleanPhone = `234${phone.substring(1)}`;
    } 

    const message = `Hello, I saw your "${item.stockName}" on Legendary Engine. Is it still available?`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}, '_blank'`);
  };

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-500">
      <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
        <img 
          src={getImageUrl(item.images?.[0])} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          alt={item.stockName}
          // ✅ ERROR GUARD: Stops the counting loop
          onError={(e) => { 
            e.currentTarget.src = 'https://via.placeholder.com/400?text=Image+Not+Found'; 
            e.currentTarget.onerror = null; 
          }}
        />
        <div className="absolute top-4 left-4 backdrop-blur-md bg-white/70 px-4 py-2 rounded-2xl border border-white/20">
          <span className="font-black text-slate-900 text-lg">
            {item.currency || '₦'}{Number(item.price).toLocaleString()}
          </span>
        </div>
      </div>
      
      <div className="p-8">
        <div className="flex justify-between items-start mb-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
            {item.category || 'General'}
          </span>
          <div className="text-right text-slate-400 text-[10px] font-bold uppercase">
             <div className="flex items-center justify-end gap-1"><MapPin size={10} /> {item.city}</div>
             <div className="flex items-center justify-end gap-1 text-blue-500"><Globe size={10} /> {item.country || 'Global'}</div>
          </div>
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">{item.stockName}</h3>
        <p className="text-slate-400 text-xs italic mb-8 line-clamp-2">"{item.description}"</p>
        <button onClick={handleContact} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-black shadow-lg">
          <MessageCircle size={20} /> CHAT NOW
        </button> 
      </div>
    </div>
  );
};