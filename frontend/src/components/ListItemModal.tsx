import React, { useState, useRef } from 'react';
import { X, Camera, Bot, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import API from '../services/api';

interface ListItemModalProps {
  onClose: () => void;
  onItemCreated: () => void;
}

export const ListItemModal: React.FC<ListItemModalProps> = ({ onClose, onItemCreated }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [showAiConfig, setShowAiConfig] = useState(false);
  
  const [formData, setFormData] = useState({
    stockName: '',
    price: '',
    currency: '₦',
    description: '',
    category: 'Electronics',
    country: '',
    city: '',
    area: '',
    whatsapp: '',
    
    // AI Knowledge Base Quick Fields
    minimumPrice: '',
    targetPrice: '',
    warrantyPeriod: '',
    faqKnowledgeBase: ''
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
      data.append('stockName', formData.stockName);
      data.append('price', formData.price);
      data.append('currency', formData.currency);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('country', formData.country);
      data.append('city', formData.city);
      data.append('area', formData.area);
      data.append('whatsapp', formData.whatsapp);

      selectedFiles.forEach(file => data.append('images', file));

      const response = await API.post('/items', data);
      const itemId = response.data?.id || response.data?._id;

      if (itemId && (formData.minimumPrice || formData.faqKnowledgeBase)) {
        await API.post(`/ai/config/${itemId}`, {
          targetPrice: formData.targetPrice ? Number(formData.targetPrice) : Number(formData.price),
          minimumPrice: formData.minimumPrice ? Number(formData.minimumPrice) : Number(formData.price),
          walkawayPrice: formData.minimumPrice ? Number(formData.minimumPrice) * 0.9 : Number(formData.price) * 0.8,
          warrantyPeriod: formData.warrantyPeriod,
          faqKnowledgeBase: formData.faqKnowledgeBase,
        });
      }

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
              <input placeholder="Price" type="number" className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl outline-none dark:text-white" onChange={e => setFormData({...formData, price: e.target.value})} />
              <input placeholder="WhatsApp Number" className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl outline-none dark:text-white" onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input placeholder="Country" className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl outline-none dark:text-white" onChange={e => setFormData({...formData, country: e.target.value})} />
              <input placeholder="City" className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl outline-none dark:text-white" onChange={e => setFormData({...formData, city: e.target.value})} />
            </div>

            {/* AI Sales Assistant Toggle */}
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800">
              <button
                type="button"
                onClick={() => setShowAiConfig(!showAiConfig)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Bot className="text-indigo-600 dark:text-indigo-400" size={18} />
                  <span className="text-xs font-black uppercase text-indigo-900 dark:text-indigo-200 flex items-center gap-1">
                    AI Auto-Negotiator & FAQ <Sparkles size={12} />
                  </span>
                </div>
                {showAiConfig ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showAiConfig && (
                <div className="mt-4 space-y-3 pt-3 border-t border-indigo-200 dark:border-indigo-800">
                  <input placeholder="Minimum Acceptable Price" type="number" className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none dark:text-white" onChange={e => setFormData({...formData, minimumPrice: e.target.value})} />
                  <input placeholder="Warranty (e.g., 6 Months)" className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none dark:text-white" onChange={e => setFormData({...formData, warrantyPeriod: e.target.value})} />
                  <textarea placeholder="FAQ Answer (e.g. Receipt provided, delivery timing...)" rows={2} className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl text-xs outline-none dark:text-white" onChange={e => setFormData({...formData, faqKnowledgeBase: e.target.value})} />
                </div>
              )}
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