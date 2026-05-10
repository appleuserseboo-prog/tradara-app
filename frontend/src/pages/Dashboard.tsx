import React, { useEffect, useState } from 'react';
import API from '../services/api'; 
import { X, MapPin, Camera } from 'lucide-react';

interface Item {
  id: string;
  _id?: string;
  stockName: string;
  price: number;
  currency?: string;
  city: string;
  area?: string;
  country?: string;
  description?: string;
  category?: string;
  images: string[];
  whatsapp?: string;
  facebook?: string;
  tiktok?: string;
  instagram?: string;
  canBargain?: boolean;
}

export const Dashboard: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const fetchMyItems = async () => {
    try {
      setLoading(true);
      const response = await API.get('/items/me'); 
      setItems(response.data);
    } catch (err) { 
      console.error("Dashboard fetch error:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchMyItems(); }, []);

  const handleUpdate = async () => {
    if (!editingItem) return;
    
    if (!editingItem.whatsapp && !editingItem.facebook && !editingItem.instagram && !editingItem.tiktok) {
      alert("Please provide at least one contact method (WhatsApp, IG, etc.)");
      return;
    }

    const id = editingItem.id || editingItem._id;
    const formData = new FormData();
    
    // Core Fields
    formData.append('stockName', editingItem.stockName);
    formData.append('price', String(editingItem.price));
    formData.append('currency', editingItem.currency || "₦");
    formData.append('description', editingItem.description || "");
    formData.append('category', editingItem.category || "General");
    
    // Location
    formData.append('country', editingItem.country || "Nigeria");
    formData.append('city', editingItem.city || "");
    formData.append('area', editingItem.area || "");
    
    // Socials
    formData.append('whatsapp', editingItem.whatsapp || "");
    formData.append('facebook', editingItem.facebook || "");
    formData.append('instagram', editingItem.instagram || "");
    formData.append('tiktok', editingItem.tiktok || "");
    
    // Images
    if (selectedFiles) {
      Array.from(selectedFiles).forEach(file => formData.append('images', file));
    }

    try {
      await API.put(`/items/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchMyItems();
      setIsEditModalOpen(false);
      setSelectedFiles(null);
      alert("Listing updated successfully!");
    } catch (err) {
      alert("Update failed. Check your network.");
    }
  };

  if (loading) return <div className="p-20 text-center dark:text-white font-black animate-pulse">LOADING ENGINE...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 min-h-screen">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-5xl font-black dark:text-white uppercase tracking-tighter">My Inventory</h1>
        <div className="bg-blue-600 text-white px-6 py-3 rounded-full font-black text-sm">{items.length} ACTIVE</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {items.map((item) => (
          <div key={item.id || item._id} className="bg-white dark:bg-slate-900 rounded-[3rem] p-6 shadow-xl border border-slate-100 dark:border-white/5">
            <div className="h-48 rounded-[2rem] overflow-hidden mb-6 bg-slate-100">
              <img 
                src={item.images?.[0]?.startsWith('http') ? item.images[0] : `https://tradara-backend.onrender.com/${item.images?.[0]?.replace(/\\/g, '/')}`} 
                className="w-full h-full object-cover" 
                alt={item.stockName}
                onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/400x300?text=No+Image"; }}
              />
            </div>
            <h3 className="font-black text-xl dark:text-white truncate uppercase">{item.stockName}</h3>
            <p className="text-blue-600 font-black text-2xl mb-2">{item.currency || '₦'}{item.price.toLocaleString()}</p>
            <p className="text-slate-400 text-[10px] font-bold mb-6 flex items-center gap-1 uppercase"><MapPin size={12}/> {item.city}, {item.area}</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }} className="bg-slate-100 dark:bg-white/5 dark:text-white py-4 rounded-2xl font-black text-xs hover:bg-blue-600 hover:text-white transition-all">EDIT</button>
              <button onClick={async () => {
                if(window.confirm("Delete listing?")) {
                  try {
                    await API.delete(`/items/${item.id || item._id}`);
                    setItems(p => p.filter(i => (i.id || i._id) !== (item.id || item._id)));
                  } catch (err) { alert("Delete failed."); }
                }
              }} className="bg-red-500/10 text-red-500 py-4 rounded-2xl font-black text-xs hover:bg-red-500 hover:text-white transition-all">DELETE</button>
            </div>
          </div>
        ))}
      </div>

      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 relative shadow-2xl">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-8 right-8 dark:text-white"><X /></button>
            <h2 className="text-2xl font-black dark:text-white uppercase mb-8">Update Listing</h2>
            
            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
              <label className="text-[10px] font-black dark:text-slate-500 uppercase">Product Image (Optional Update)</label>
              <div className="relative">
                <input type="file" multiple onChange={(e) => setSelectedFiles(e.target.files)} className="hidden" id="file-upload" />
                <label htmlFor="file-upload" className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                  <Camera size={18} className="dark:text-white" />
                  <span className="text-xs font-bold dark:text-white">{selectedFiles ? `${selectedFiles.length} files selected` : 'Replace Images'}</span>
                </label>
              </div>

              <input value={editingItem.stockName} onChange={e => setEditingItem({...editingItem, stockName: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 p-4 rounded-2xl dark:text-white outline-none" placeholder="Item Name" />
              
              <div className="flex gap-2">
                 <select value={editingItem.currency} onChange={e => setEditingItem({...editingItem, currency: e.target.value})} className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl dark:text-white outline-none">
                    <option value="₦">₦</option><option value="$">$</option><option value="SR">SR</option>
                 </select>
                 <input type="number" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: Number(e.target.value)})} className="flex-1 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl dark:text-white outline-none" placeholder="Price" />
              </div>

              <textarea value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 p-4 rounded-2xl dark:text-white outline-none h-24" placeholder="Description" />

              <div className="grid grid-cols-3 gap-2">
                <input value={editingItem.country} onChange={e => setEditingItem({...editingItem, country: e.target.value})} className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl dark:text-white text-[10px] font-bold" placeholder="Country" />
                <input value={editingItem.city} onChange={e => setEditingItem({...editingItem, city: e.target.value})} className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl dark:text-white text-[10px] font-bold" placeholder="City" />
                <input value={editingItem.area} onChange={e => setEditingItem({...editingItem, area: e.target.value})} className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl dark:text-white text-[10px] font-bold" placeholder="Area" />
              </div>

              <label className="text-[10px] font-black dark:text-slate-500 uppercase">Social Media Reach (At least one)</label>
              <div className="grid grid-cols-2 gap-2">
                <input value={editingItem.whatsapp || ''} onChange={e => setEditingItem({...editingItem, whatsapp: e.target.value})} className="bg-green-500/10 p-4 rounded-2xl dark:text-white text-[10px] font-bold" placeholder="WhatsApp Number" />
                <input value={editingItem.instagram || ''} onChange={e => setEditingItem({...editingItem, instagram: e.target.value})} className="bg-pink-500/10 p-4 rounded-2xl dark:text-white text-[10px] font-bold" placeholder="Instagram Username" />
                <input value={editingItem.facebook || ''} onChange={e => setEditingItem({...editingItem, facebook: e.target.value})} className="bg-blue-500/10 p-4 rounded-2xl dark:text-white text-[10px] font-bold" placeholder="Facebook Profile" />
                <input value={editingItem.tiktok || ''} onChange={e => setEditingItem({...editingItem, tiktok: e.target.value})} className="bg-slate-500/10 p-4 rounded-2xl dark:text-white text-[10px] font-bold" placeholder="TikTok Username" />
              </div>

              <button onClick={handleUpdate} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase mt-4 hover:bg-blue-700 shadow-xl transition-all">Update Listing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};