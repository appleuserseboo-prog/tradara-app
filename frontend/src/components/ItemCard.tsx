import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, MapPin, BadgeCheck, ShoppingCart, 
  MessageSquare, Instagram, Facebook, Video, X
} from 'lucide-react';
import { useCart } from '../context/CartContext';

interface ItemCardProps {
  item: any;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [showContactModal, setShowContactModal] = useState(false);
  
  const handleViewDetails = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const productId = item._id || item.id;
    if (productId) {
      navigate(`/product/${productId}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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

  // Logic to handle Chat Click
  const handleChatNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Filter active links
    const channels = [
      { id: 'whatsapp', value: item.whatsapp },
      { id: 'instagram', value: item.instagram },
      { id: 'facebook', value: item.facebook },
      { id: 'tiktok', value: item.tiktok }
    ].filter(c => c.value);

    // If only one exists, go direct. If more, show modal.
    if (channels.length === 1) {
      openLink(channels[0].id, channels[0].value);
    } else if (channels.length > 1) {
      setShowContactModal(true);
    }
  };

  const openLink = (platform: string, value: string) => {
    if (!value) return;
    let url = "";
    const message = encodeURIComponent(`Hello, I saw your "${item.stockName}" on Tradara. Is it still available?`);

    switch(platform) {
      case 'whatsapp':
        let phone = value.replace(/\D/g, '');
        if (phone.startsWith('0')) phone = `234${phone.substring(1)}`;
        url = `https://wa.me/${phone}?text=${message}`;
        break;
      case 'instagram':
        url = value.startsWith('http') ? value : `https://instagram.com/${value.replace('@','')}`;
        break;
      case 'facebook':
        url = value.startsWith('http') ? value : `https://facebook.com/${value}`;
        break;
      case 'tiktok':
        url = value.startsWith('http') ? value : `https://tiktok.com/@${value.replace('@','')}`;
        break;
      default:
        url = value.startsWith('http') ? value : `https://${value}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div onClick={handleViewDetails} className="glass-card group rounded-[2.5rem] overflow-hidden hover:scale-[1.03] transition-all duration-500 hover:border-blue-500/40 cursor-pointer flex flex-col h-full">
        {/* IMAGE SECTION */}
        <div className="relative aspect-[4/5] overflow-hidden bg-slate-900 shrink-0">
          <img src={getImageUrl(item.images?.[0])} loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" alt={item.stockName} />
          
          <div className="absolute top-3 left-3">
             <div className="backdrop-blur-xl bg-blue-600/20 border border-blue-400/30 px-3 py-1 rounded-full flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-tighter">Visible Worldwide</span>
             </div>
          </div>

          <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
            <div className="glass-card px-3 py-1 rounded-xl border-white/20 bg-black/40 backdrop-blur-md">
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
        </div>
        
        {/* CONTENT SECTION */}
        <div className="p-4 sm:p-6 flex flex-col flex-grow gap-3">
          <div className="flex justify-between items-center">
             <span className="text-[9px] font-black text-blue-500 uppercase bg-blue-500/10 px-2 py-1 rounded-full">{item.category || 'General'}</span>
             <div className="flex items-center gap-1 text-slate-500">
               <MapPin size={10} />
               <span className="text-[9px] font-bold uppercase truncate max-w-[100px]">{item.city}, {item.area}</span>
             </div>
          </div>
          
          <h3 className="text-lg font-black tracking-tight line-clamp-1 group-hover:text-blue-400 transition-colors uppercase">{item.stockName}</h3>
          <p className="text-slate-400 text-xs line-clamp-2 italic leading-relaxed">"{item.description}"</p>
          
          <div className="mt-auto flex gap-2 pt-2">
            <button onClick={handleChatNow} className="flex-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white py-3 rounded-2xl font-bold text-[10px] flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 uppercase tracking-widest">
              <MessageSquare size={14} /> CHAT
            </button>
            <button onClick={(e) => { e.stopPropagation(); addToCart(item); }} className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-bold text-[10px] flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest">
              <ShoppingCart size={14} /> + CART
            </button>
          </div>
        </div>
      </div>

      {/* CONTACT SELECTION MODAL - Optimized for Mobile */}
      {showContactModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-[90vw] max-w-[350px] mx-auto rounded-[2.5rem] p-6 relative shadow-2xl animate-in zoom-in-95 duration-300">
             <button onClick={() => setShowContactModal(false)} className="absolute top-5 right-5 p-2 bg-slate-100 dark:bg-white/5 rounded-full dark:text-white hover:rotate-90 transition-transform"><X size={18}/></button>
             
             <div className="text-center mb-6">
                <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter">Choose Channel</h2>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Chat directly with seller</p>
             </div>
             
             <div className="space-y-3">
                {item.whatsapp && (
                  <button onClick={() => openLink('whatsapp', item.whatsapp)} className="w-full flex items-center justify-between p-4 bg-[#25D366] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all">
                    <span>WhatsApp</span> <MessageCircle size={18}/>
                  </button>
                )}
                {item.instagram && (
                  <button onClick={() => openLink('instagram', item.instagram)} className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all">
                    <span>Instagram</span> <Instagram size={18}/>
                  </button>
                )}
                {item.facebook && (
                  <button onClick={() => openLink('facebook', item.facebook)} className="w-full flex items-center justify-between p-4 bg-[#1877F2] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all">
                    <span>Facebook</span> <Facebook size={18}/>
                  </button>
                )}
                {item.tiktok && (
                  <button onClick={() => openLink('tiktok', item.tiktok)} className="w-full flex items-center justify-between p-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:brightness-110 active:scale-95 transition-all border border-white/10">
                    <span>TikTok</span> <Video size={18}/>
                  </button>
                )}
             </div>
          </div>
        </div>
      )}
    </>
  );
};