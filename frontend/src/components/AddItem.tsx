import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, Camera, MapPin, 
  MessageCircle, X, Globe, Landmark, CircleDollarSign 
} from 'lucide-react';
import API from '../services/api';

export const AddItem: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    stockName: '',
    price: '',
    currency: '₦', // Default currency
    description: '',
    category: 'Electronics',
    country: 'Nigeria', 
    city: '',    
    area: '',    
    contactLink: '',
    canBargain: false 
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // ✅ Updated to handle all input types including the new Currency dropdown
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removePhoto = (index: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const data = new FormData();
    // ✅ Matches your Schema.prisma exactly
    data.append('stockName', formData.stockName);
    data.append('price', formData.price);
    data.append('currency', formData.currency);
    data.append('description', formData.description);
    data.append('category', formData.category);
    data.append('city', formData.city);
    data.append('country', formData.country);
    data.append('area', formData.area);
    data.append('contactLink', formData.contactLink);
    data.append('canBargain', String(formData.canBargain));

    selectedFiles.forEach((file) => {
      data.append('images', file); 
    });

    try {
      await API.post('/items', data);
      navigate('/dashboard');
    } catch (err) {
      setError("Upload failed. Please check your network or server terminal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-10 pb-20 px-4 bg-[#F4F7FF] dark:bg-slate-950">
      <div className="max-w-3xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="mb-10 text-center">
          <div className="inline-flex p-4 bg-blue-600 rounded-[2rem] text-white shadow-xl mb-4"><Globe size={32} /></div>
          <h1 className="text-4xl font-black tracking-tighter dark:text-white uppercase">Global Listing</h1>
          <p className="text-slate-500 font-medium">Original Quality • Global Reach</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* PHOTO SECTION */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm">
            <h3 className="text-lg font-black mb-4 flex items-center gap-2 dark:text-white">
              <Camera size={20} className="text-blue-600"/> Gallery
            </h3>
            <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {previews.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-3xl overflow-hidden border-2 border-white dark:border-slate-800">
                  <img src={img} className="w-full h-full object-cover" alt="Preview" />
                  <button type="button" onClick={() => removePhoto(idx)} className="absolute top-2 right-2 bg-red-500 p-1.5 rounded-full text-white">
                    <X size={14}/>
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 transition-all">
                <PlusCircle size={24}/>
                <span className="text-[10px] font-black mt-2 uppercase">Add Photo</span>
              </button>
            </div>
          </div>

          {/* BARGAIN TOGGLE SECTION */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-sm flex items-center justify-between px-8 border-2 border-transparent hover:border-blue-500/20 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-2xl"><CircleDollarSign size={24}/></div>
              <div>
                <h4 className="font-black dark:text-white uppercase text-sm">Negotiable</h4>
                <p className="text-xs text-slate-400">Allow buyers to bargain price</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" name="canBargain" checked={formData.canBargain} onChange={handleChange} className="sr-only peer" />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* PRODUCT DETAILS */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-xs font-black uppercase text-slate-400 ml-2">Item Name</label>
              <input name="stockName" required className="w-full bg-slate-50 dark:bg-white/5 rounded-2xl py-4 px-6 mt-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-bold" onChange={handleChange} />
            </div>

            {/* ✅ NEW: Global Currency Dropdown */}
            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-2">Currency</label>
              <select name="currency" value={formData.currency} className="w-full bg-slate-50 dark:bg-white/5 rounded-2xl py-4 px-6 mt-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-bold" onChange={handleChange}>
                <option value="₦">Naira (₦)</option>
                <option value="$">US Dollar ($)</option>
                <option value="SR">Saudi Riyal (SR)</option>
                <option value="£">British Pound (£)</option>
                <option value="€">Euro (€)</option>
                <option value="¥">Yen (¥)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-2">Price Magnitude</label>
              <input name="price" type="number" required className="w-full bg-slate-50 dark:bg-white/5 rounded-2xl py-4 px-6 mt-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-bold" onChange={handleChange} />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-black uppercase text-slate-400 ml-2">Description</label>
              <textarea name="description" rows={3} className="w-full bg-slate-50 dark:bg-white/5 rounded-2xl py-4 px-6 mt-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" onChange={handleChange} placeholder="Tell us more about the product..."></textarea>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-2">Category</label>
              <select name="category" value={formData.category} className="w-full bg-slate-50 dark:bg-white/5 rounded-2xl py-4 px-6 mt-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-bold" onChange={handleChange}>
                <option value="Electronics">Electronics</option>
                <option value="Fashion">Fashion</option>
                <option value="Books">Books</option>
                <option value="Services">Services</option>
                <option value="Food">Food</option>
              </select>
            </div>
          </div>

          {/* LOCATION & CONTACT */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-slate-400">Country</label>
                <input name="country" value={formData.country} required className="w-full bg-slate-50 dark:bg-white/5 rounded-xl py-3 px-4 mt-1 outline-none dark:text-white font-bold" onChange={handleChange} />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-slate-400">City</label>
                <input name="city" required placeholder="e.g. Ogbomoso" className="w-full bg-slate-50 dark:bg-white/5 rounded-xl py-3 px-4 mt-1 outline-none dark:text-white font-bold" onChange={handleChange} />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-slate-400">Area</label>
                <input name="area" required placeholder="e.g. Under-G" className="w-full bg-slate-50 dark:bg-white/5 rounded-xl py-3 px-4 mt-1 outline-none dark:text-white font-bold" onChange={handleChange} />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl"><MessageCircle size={20}/></div>
              <div className="flex-1">
                <label className="text-xs font-black uppercase text-slate-400">WhatsApp Number</label>
                <input name="contactLink" required placeholder="+234..." className="w-full bg-transparent border-b border-slate-100 dark:border-white/10 py-2 outline-none focus:border-blue-500 dark:text-white font-bold" onChange={handleChange} />
              </div>
            </div>
          </div>

          {error && <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl font-bold text-center">{error}</div>}

          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl hover:bg-blue-700 transition-all active:scale-95">
            {loading ? 'SYNCING TO GLOBAL SERVERS...' : 'PUBLISH WORLDWIDE'}
          </button>
        </form>
      </div>
    </div>
  );
};