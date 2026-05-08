import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageCircle, MapPin, ShoppingCart, 
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
  const [modalChannels, setModalChannels] = useState<any[]>([]);
  
  const handleViewDetails = (e: React.MouseEvent) => {
    // If we clicked a button or the modal, don't trigger the detail view
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.modal-content')) return;
    
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

  const openLink = (platform: string, value: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!value) return;
    
    let url = "";
    const message = encodeURIComponent(`Hello, I saw your "${item.stockName}" on Tradara. Is it still available?`);

    switch(platform.toLowerCase()) {
      case 'whatsapp':
        let phone = value.replace(/\D/g, '');
        // If it starts with 0 (Nigerian format), convert to 234
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
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // UPDATED: PRO LOGIC FOR DIRECT REDIRECT VS MODAL
  const handleChatNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // 1. Identify ONLY valid, working links (handles null/undefined for old items)
      const activeChannels = [
        { id: 'whatsapp', name: 'WhatsApp', value: item.whatsapp },
        { id: 'instagram', name: 'Instagram', value: item.instagram },
        { id: 'facebook', name: 'Facebook', value: item.facebook },
        { id: 'tiktok', name: 'TikTok', value: item.tiktok }
      ].filter(channel => 
        channel.value !== null && 
        channel.value !== undefined && 
        String(channel.value).trim() !== ""
      );

      // 2. Logic Check
      if (activeChannels.length === 0) {
        alert("This seller hasn't provided contact links.");
        return;
      }

      if (activeChannels.length === 1) {
        // IF ONLY ONE (Old items): Go directly to that handle
        openLink(activeChannels[0].id, activeChannels[0].value);
      } else {
        // IF MULTIPLE: Show the modal
        setModalChannels(activeChannels);
        setShowContactModal(true);
      }
    } catch (error) {
      console.error("Chat redirection failed:", error);
    }
  };

  return (
    <>
      <div onClick={handleViewDetails} className="glass-card group rounded-[2.5rem] overflow-hidden hover:scale-[1.03] transition-all duration-500 hover:border-blue-500/40 cursor-pointer flex flex-col h-full relative">
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
          </div>
        </div>
        
        <div className="p-4 sm:p-6 flex flex-col flex-grow gap-3">
          <div className="flex justify-between items-center">
             <span className="text-[9px] font-black text-blue-500 uppercase bg-blue-500/10 px-2 py-1 rounded-full">{item.category || 'General'}</span>
             <div className="flex items-center gap-1 text-slate-500">
               <MapPin size={10} />
               <span className="text-[9px] font-bold uppercase truncate max-w-[100px]">{item.city}</span>
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

      {/* MODAL SECTION - STABLE AND NON-SHAKING */}
      {showContactModal && (
        <div 
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300" 
          onClick={(e) => { 
            e.stopPropagation(); 
            setShowContactModal(false); 
          }}
        >
          <div 
            className="modal-content bg-white dark:bg-slate-900 w-[92vw] max-w-[360px] mx-auto rounded-[3rem] p-8 relative shadow-2xl animate-in zoom-in-95 duration-300 border border-white/10" 
            onClick={(e) => e.stopPropagation()}
          >
             <button 
               onClick={(e) => { 
                 e.stopPropagation(); 
                 setShowContactModal(false); 
               }} 
               className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-white/5 rounded-full dark:text-white hover:rotate-90 transition-transform active:scale-90"
             >
               <X size={20}/>
             </button>
             
             <div className="text-center mb-8">
                <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">Choose Channel</h2>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-2 px-4 leading-tight">Pick your preferred way to reach the seller</p>
             </div>
             
             <div className="space-y-4">
                {modalChannels.map((channel) => (
                  <button 
                    key={channel.id}
                    onClick={(e) => openLink(channel.id, channel.value, e)} 
                    className={`w-full flex items-center justify-between p-5 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.15em] hover:brightness-110 active:scale-95 transition-all shadow-lg 
                      ${channel.id === 'whatsapp' ? 'bg-[#25D366] shadow-green-500/20' : ''}
                      ${channel.id === 'instagram' ? 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F56040] shadow-red-500/20' : ''}
                      ${channel.id === 'facebook' ? 'bg-[#1877F2] shadow-blue-500/20' : ''}
                      ${channel.id === 'tiktok' ? 'bg-black border border-white/20' : ''}
                    `}
                  >
                    <span>{channel.name}</span>
                    {channel.id === 'whatsapp' && <MessageCircle size={20}/>}
                    {channel.id === 'instagram' && <Instagram size={20}/>}
                    {channel.id === 'facebook' && <Facebook size={20}/>}
                    {channel.id === 'tiktok' && <Video size={20}/>}
                  </button>
                ))}
             </div>
          </div>
        </div>
      )}
    </>
  );
};