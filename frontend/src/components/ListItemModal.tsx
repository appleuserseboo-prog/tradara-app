import React, { useState, useRef } from 'react';
import { X, Camera, Globe, MapPin, Landmark } from 'lucide-react';
import  API from '../services/api'; // Matches the fix in api.ts

interface ListItemModalProps {
  onClose: () => void;
  onItemCreated: () => void;
}

export const ListItemModal: React.FC<ListItemModalProps> = ({ onClose, onItemCreated }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    stockName: '',
    price: '',
    description: '',
    category: 'Electronics',
    country: '',
    city: '',
    area: '',
    contactLink: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => data.append(key, String(value)));
      selectedFiles.forEach(file => data.append('images', file));

      await API.post('/items', data);
      onItemCreated();
      onClose();
    } catch (err) {
      alert("Check your token or connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="p-8 overflow-y-auto max-h-[90vh]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black dark:text-white uppercase tracking-tighter">New Global Listing</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full">
              <X size={24} className="dark:text-white" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Gallery Picker */}
            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-200">
              <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
              <div className="flex gap-2 overflow-x-auto pb-2">
                {previews.map((src, i) => (
                  <img key={i} src={src} className="w-20 h-20 object-cover rounded-xl" alt="Preview" />
                ))}
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-20 h-20 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                  <Camera size={20} />
                </button>
              </div>
            </div>

            <input placeholder="Item Name" className="w-full p-4 bg-slate-100 dark:bg-white/5 rounded-2xl outline-none dark:text-white" onChange={e => setFormData({...formData, stockName: e.target.value})} />
            
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="Country" className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl outline-none dark:text-white" onChange={e => setFormData({...formData, country: e.target.value})} />
              <input placeholder="City" className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl outline-none dark:text-white" onChange={e => setFormData({...formData, city: e.target.value})} />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">
              {loading ? "UPLOADING..." : "PUBLISH ITEM"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};