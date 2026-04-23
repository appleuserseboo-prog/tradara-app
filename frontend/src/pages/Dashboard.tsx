import React, { useEffect, useState } from 'react';
import API from '../services/api'; 
import {  X, MapPin } from 'lucide-react';

interface Item {
  id: string;
  _id?: string;
  stockName: string;
  price: number;
  currency?: string;
  city: string;
  area?: string;
  images: string[];
}

export const Dashboard: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const fetchMyItems = async () => {
    try {
      setLoading(true);
      const response = await API.get('/items/me'); 
      setItems(response.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchMyItems(); }, []);

  const handleUpdate = async () => {
    if (!editingItem) return;
    const id = editingItem.id || editingItem._id;
    try {
      await API.put(`/items/${id}`, {
        stockName: editingItem.stockName,
        price: Number(editingItem.price),
        currency: editingItem.currency,
        city: editingItem.city,
        area: editingItem.area
      });
      setItems(prev => prev.map(item => (item.id || item._id) === id ? editingItem : item));
      setIsEditModalOpen(false);
      alert("Updated successfully!");
    } catch (err) { alert("Update failed."); }
  };

  if (loading) return <div className="p-20 text-center dark:text-white font-bold uppercase tracking-widest animate-pulse">Loading Engine...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 min-h-screen">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-5xl font-black dark:text-white uppercase tracking-tighter">My Inventory</h1>
        <div className="bg-blue-600 text-white px-6 py-3 rounded-full font-black text-sm">{items.length} ACTIVE</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {items.map((item) => (
          <div key={item.id || item._id} className="bg-white dark:bg-slate-900 rounded-[3rem] p-6 shadow-xl border border-slate-100 dark:border-white/5">
            <div className="h-48 rounded-[2rem] overflow-hidden mb-6">
              <img src={item.images?.[0]?.startsWith('http') ? item.images[0] : `http://localhost:5000/${item.images?.[0]}`} className="w-full h-full object-cover" alt="" />
            </div>
            <h3 className="font-black text-xl dark:text-white truncate uppercase">{item.stockName}</h3>
            <p className="text-blue-600 font-black text-2xl mb-2">{item.currency || '₦'}{item.price.toLocaleString()}</p>
            <p className="text-slate-400 text-[10px] font-bold mb-6 flex items-center gap-1 uppercase"><MapPin size={12}/> {item.city}, {item.area}</p>
            
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }} className="bg-slate-100 dark:bg-white/5 dark:text-white py-4 rounded-2xl font-black text-xs hover:bg-blue-600 hover:text-white transition-all">EDIT</button>
              <button onClick={async () => {
                 if(window.confirm("Delete listing?")) {
                    await API.delete(`/items/${item.id || item._id}`);
                    setItems(p => p.filter(i => (i.id || i._id) !== (item.id || item._id)));
                 }
              }} className="bg-red-500/10 text-red-500 py-4 rounded-2xl font-black text-xs hover:bg-red-500 hover:text-white transition-all">DELETE</button>
            </div>
          </div>
        ))}
      </div>

      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 relative">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-8 right-8 dark:text-white"><X /></button>
            <h2 className="text-2xl font-black dark:text-white uppercase mb-8">Update Listing</h2>
            <div className="space-y-4">
               <input value={editingItem.stockName} onChange={e => setEditingItem({...editingItem, stockName: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 p-4 rounded-2xl dark:text-white outline-none" placeholder="Name" />
               <div className="flex gap-2">
                 <select value={editingItem.currency} onChange={e => setEditingItem({...editingItem, currency: e.target.value})} className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl dark:text-white outline-none">
                    <option value="₦">₦</option><option value="$">$</option><option value="SR">SR</option>
                 </select>
                 <input type="number" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: Number(e.target.value)})} className="flex-1 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl dark:text-white outline-none" placeholder="Price" />
               </div>
               <input value={editingItem.city} onChange={e => setEditingItem({...editingItem, city: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 p-4 rounded-2xl dark:text-white outline-none" placeholder="City" />
               <input value={editingItem.area} onChange={e => setEditingItem({...editingItem, area: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 p-4 rounded-2xl dark:text-white outline-none" placeholder="Area" />
               <button onClick={handleUpdate} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase mt-4 hover:bg-blue-700 shadow-xl">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};