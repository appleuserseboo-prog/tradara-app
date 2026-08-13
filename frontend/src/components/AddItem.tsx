import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, Camera, 
  MessageCircle, X, Globe, CircleDollarSign,
  Instagram, Facebook, Video, Bot, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import API from '../services/api';

export const AddItem: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAiAccordion, setShowAiAccordion] = useState(false);

  const [formData, setFormData] = useState({
    stockName: '',
    price: '',
    currency: '₦',
    description: '',
    category: 'Electronics',
    country: 'Nigeria', 
    city: '',    
    area: '',    
    canBargain: false,
    // Social Links
    whatsapp: '',
    facebook: '',
    tiktok: '',
    instagram: '',

    // 30+ AI Sales Assistant Knowledge Fields
    autoNegotiateEnabled: true,
    minimumPrice: '',
    targetPrice: '',
    walkawayPrice: '',
    discountStepPercent: '5',
    maxDiscountRounds: '3',
    bulkMinQuantity: '',
    bulkDiscountPercent: '',
    acceptsTradeIn: false,
    tradeInTerms: '',
    bundledItems: '',
    bundleDiscount: '',
    acceptedPayments: 'cash, transfer',
    cashDiscountPercent: '',
    freeDeliveryEligible: false,
    deliveryFeeEstimate: '',
    pickupAddress: '',
    dispatchTimeline: '',
    stockCount: '1',
    urgencyLevel: 'normal',
    expirationDate: '',
    warrantyPeriod: '',
    returnPolicyDays: '0',
    productCondition: 'Brand New',
    knownFlaws: '',
    specifications: '',
    faqKnowledgeBase: '',
    minBuyerRating: '',
    aiTone: 'Professional and Friendly',
    greetingMessage: '',
    escalateOnThreshold: '',
    sellerContactPhone: ''
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

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

  // PROFESSIONAL VALIDATION: Checks if at least one contact method exists
  const isContactProvided = () => {
    return formData.whatsapp.trim() !== '' || 
           formData.facebook.trim() !== '' || 
           formData.tiktok.trim() !== '' || 
           formData.instagram.trim() !== '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isContactProvided()) {
      setError("Please provide at least one contact method (WhatsApp, FB, TikTok, or Instagram)");
      return;
    }

    setLoading(true);
    setError(null);

    const data = new FormData();
    data.append('stockName', formData.stockName);
    data.append('price', formData.price);
    data.append('currency', formData.currency);
    data.append('description', formData.description);
    data.append('category', formData.category);
    data.append('city', formData.city);
    data.append('country', formData.country);
    data.append('area', formData.area);
    data.append('canBargain', String(formData.canBargain));
    
    // Append social fields
    data.append('whatsapp', formData.whatsapp);
    data.append('facebook', formData.facebook);
    data.append('tiktok', formData.tiktok);
    data.append('instagram', formData.instagram);

    selectedFiles.forEach((file) => {
      data.append('images', file); 
    });

    try {
      const response = await API.post('/items', data);
      const createdItem = response.data;
      const itemId = createdItem.id || createdItem._id;

      // Save AI Configuration if configured
      if (itemId && (formData.minimumPrice || formData.targetPrice || formData.faqKnowledgeBase)) {
        await API.post(`/ai/config/${itemId}`, {
          autoNegotiateEnabled: formData.autoNegotiateEnabled,
          minimumPrice: formData.minimumPrice ? Number(formData.minimumPrice) : Number(formData.price),
          targetPrice: formData.targetPrice ? Number(formData.targetPrice) : Number(formData.price),
          walkawayPrice: formData.walkawayPrice ? Number(formData.walkawayPrice) : Number(formData.price) * 0.8,
          discountStepPercent: Number(formData.discountStepPercent),
          maxDiscountRounds: Number(formData.maxDiscountRounds),
          bulkMinQuantity: formData.bulkMinQuantity ? Number(formData.bulkMinQuantity) : null,
          bulkDiscountPercent: formData.bulkDiscountPercent ? Number(formData.bulkDiscountPercent) : null,
          acceptsTradeIn: formData.acceptsTradeIn,
          tradeInTerms: formData.tradeInTerms,
          bundledItems: formData.bundledItems,
          bundleDiscount: formData.bundleDiscount ? Number(formData.bundleDiscount) : null,
          acceptedPayments: formData.acceptedPayments.split(',').map(s => s.trim()),
          cashDiscountPercent: formData.cashDiscountPercent ? Number(formData.cashDiscountPercent) : null,
          freeDeliveryEligible: formData.freeDeliveryEligible,
          deliveryFeeEstimate: formData.deliveryFeeEstimate ? Number(formData.deliveryFeeEstimate) : null,
          pickupAddress: formData.pickupAddress,
          dispatchTimeline: formData.dispatchTimeline,
          stockCount: Number(formData.stockCount),
          urgencyLevel: formData.urgencyLevel,
          expirationDate: formData.expirationDate ? new Date(formData.expirationDate) : null,
          warrantyPeriod: formData.warrantyPeriod,
          returnPolicyDays: Number(formData.returnPolicyDays),
          productCondition: formData.productCondition,
          knownFlaws: formData.knownFlaws,
          specifications: formData.specifications,
          faqKnowledgeBase: formData.faqKnowledgeBase,
          minBuyerRating: formData.minBuyerRating ? Number(formData.minBuyerRating) : null,
          aiTone: formData.aiTone,
          greetingMessage: formData.greetingMessage,
          escalateOnThreshold: formData.escalateOnThreshold ? Number(formData.escalateOnThreshold) : null,
          sellerContactPhone: formData.sellerContactPhone,
        });
      }

      navigate('/dashboard');
    } catch (err) {
      setError("Upload failed. Check your network or server terminal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-10 pb-20 px-4 bg-[#F4F7FF] dark:bg-slate-950">
      <div className="max-w-3xl mx-auto">
        
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
              <input name="stockName" value={formData.stockName} required className="w-full bg-slate-50 dark:bg-white/5 rounded-2xl py-4 px-6 mt-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-bold" onChange={handleChange} />
            </div>

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
              <input name="price" value={formData.price} type="number" required className="w-full bg-slate-50 dark:bg-white/5 rounded-2xl py-4 px-6 mt-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-bold" onChange={handleChange} />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-black uppercase text-slate-400 ml-2">Description</label>
              <textarea name="description" value={formData.description} rows={3} className="w-full bg-slate-50 dark:bg-white/5 rounded-2xl py-4 px-6 mt-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" onChange={handleChange} placeholder="Tell us more about the product..."></textarea>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-2">Category</label>
              <select name="category" value={formData.category} className="w-full bg-slate-50 dark:bg-white/5 rounded-2xl py-4 px-6 mt-2 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-bold" onChange={handleChange}>
                <option value="Electronics">Electronics</option>
                <option value="Fashion">Fashion</option>
                <option value="Books">Books</option>
                <option value="Services">Services</option>
                <option value="Food">Food</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>

          {/* AI SALES ASSISTANT SETUP ACCORDION */}
          <div className="bg-gradient-to-br from-indigo-900/10 via-purple-900/10 to-blue-900/10 dark:from-indigo-950/40 dark:to-purple-950/40 p-8 rounded-[3rem] border border-indigo-500/30 shadow-lg">
            <button
              type="button"
              onClick={() => setShowAiAccordion(!showAiAccordion)}
              className="w-full flex items-center justify-between text-left focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-2xl shadow-md">
                  <Bot size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black dark:text-white uppercase tracking-tight">AI Sales Assistant Knowledge Base</h3>
                    <span className="text-[9px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles size={10} /> 30+ RULES
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Configure auto-negotiation, warranty, delivery, FAQs, and trade-in rules.</p>
                </div>
              </div>
              <div className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full dark:text-white">
                {showAiAccordion ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </button>

            {showAiAccordion && (
              <div className="mt-8 space-y-6 pt-6 border-t border-indigo-500/20 animate-in fade-in duration-300">
                {/* 1. Core Pricing Strategy */}
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider mb-4">1. Core Pricing & Negotiation Strategy</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Target Price ({formData.currency})</label>
                      <input name="targetPrice" type="number" value={formData.targetPrice} placeholder={formData.price || '0'} onChange={handleChange} className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 mt-1 outline-none text-sm dark:text-white font-bold" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Minimum Price ({formData.currency})</label>
                      <input name="minimumPrice" type="number" value={formData.minimumPrice} placeholder="Lowest acceptable price" onChange={handleChange} className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 mt-1 outline-none text-sm dark:text-white font-bold" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Walkaway Floor ({formData.currency})</label>
                      <input name="walkawayPrice" type="number" value={formData.walkawayPrice} placeholder="Hard minimum threshold" onChange={handleChange} className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 mt-1 outline-none text-sm dark:text-white font-bold" />
                    </div>
                  </div>
                </div>

                {/* 2. Volume & Trade-In Policies */}
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider mb-4">2. Volume Discounts & Trade-ins</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Bulk Min Quantity</label>
                      <input name="bulkMinQuantity" type="number" value={formData.bulkMinQuantity} placeholder="e.g. 5" onChange={handleChange} className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 mt-1 outline-none text-sm dark:text-white font-bold" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Bulk Discount (%)</label>
                      <input name="bulkDiscountPercent" type="number" value={formData.bulkDiscountPercent} placeholder="e.g. 10" onChange={handleChange} className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 mt-1 outline-none text-sm dark:text-white font-bold" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Trade-in Terms / Guidelines</label>
                      <input name="tradeInTerms" value={formData.tradeInTerms} placeholder="What devices or items do you accept for trade-ins?" onChange={handleChange} className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 mt-1 outline-none text-sm dark:text-white font-bold" />
                    </div>
                  </div>
                </div>

                {/* 3. Delivery & Warranty */}
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider mb-4">3. Delivery, Pickup & Warranty</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Pickup Address</label>
                      <input name="pickupAddress" value={formData.pickupAddress} placeholder="Store location for pickup" onChange={handleChange} className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 mt-1 outline-none text-sm dark:text-white font-bold" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Warranty Period</label>
                      <input name="warrantyPeriod" value={formData.warrantyPeriod} placeholder="e.g. 6 Months Warranty" onChange={handleChange} className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 mt-1 outline-none text-sm dark:text-white font-bold" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Condition</label>
                      <select name="productCondition" value={formData.productCondition} onChange={handleChange} className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 mt-1 outline-none text-sm dark:text-white font-bold">
                        <option value="Brand New">Brand New</option>
                        <option value="Open Box">Open Box</option>
                        <option value="Refurbished">Refurbished</option>
                        <option value="Used - Like New">Used - Like New</option>
                        <option value="Used - Fair">Used - Fair</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 4. Specifications & Knowledge Base */}
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider mb-4">4. Specifications & FAQ Knowledge Base</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Detailed Technical Specifications</label>
                      <textarea name="specifications" value={formData.specifications} rows={2} placeholder="RAM, Storage, Battery capacity, Material, Dimensions..." onChange={handleChange} className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 mt-1 outline-none text-sm dark:text-white font-medium" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Frequently Asked Questions (FAQ) Answers</label>
                      <textarea name="faqKnowledgeBase" value={formData.faqKnowledgeBase} rows={3} placeholder="Q: Is receipt included? A: Yes. Q: How fast is delivery? A: Same day within Ogbomoso." onChange={handleChange} className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 mt-1 outline-none text-sm dark:text-white font-medium" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MULTI-CONTACT SECTION */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm space-y-6">
             <h3 className="text-sm font-black uppercase text-blue-600 flex items-center gap-2">
               <MessageCircle size={18}/> Contact Channels (Provide 1 or more)
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* WhatsApp */}
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                  <label className="text-[10px] font-black uppercase text-green-500 flex items-center gap-1">
                    <MessageCircle size={12}/> WhatsApp
                  </label>
                  <input name="whatsapp" value={formData.whatsapp} placeholder="+234..." className="w-full bg-transparent py-2 outline-none dark:text-white font-bold text-sm" onChange={handleChange} />
                </div>

                {/* Instagram */}
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                  <label className="text-[10px] font-black uppercase text-pink-500 flex items-center gap-1">
                    <Instagram size={12}/> Instagram
                  </label>
                  <input name="instagram" value={formData.instagram} placeholder="@username" className="w-full bg-transparent py-2 outline-none dark:text-white font-bold text-sm" onChange={handleChange} />
                </div>

                {/* Facebook */}
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                  <label className="text-[10px] font-black uppercase text-blue-500 flex items-center gap-1">
                    <Facebook size={12}/> Facebook
                  </label>
                  <input name="facebook" value={formData.facebook} placeholder="Profile URL" className="w-full bg-transparent py-2 outline-none dark:text-white font-bold text-sm" onChange={handleChange} />
                </div>

                {/* TikTok */}
                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                  <label className="text-[10px] font-black uppercase text-slate-900 dark:text-white flex items-center gap-1">
                    <Video size={12}/> TikTok
                  </label>
                  <input name="tiktok" value={formData.tiktok} placeholder="TikTok URL" className="w-full bg-transparent py-2 outline-none dark:text-white font-bold text-sm" onChange={handleChange} />
                </div>
             </div>
          </div>

          {/* LOCATION DETAILS */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-2">Country</label>
              <input name="country" value={formData.country} required className="w-full bg-slate-50 dark:bg-white/5 rounded-xl py-3 px-4 mt-1 outline-none dark:text-white font-bold" onChange={handleChange} />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-2">City</label>
              <input name="city" value={formData.city} required placeholder="e.g. Ogbomoso" className="w-full bg-slate-50 dark:bg-white/5 rounded-xl py-3 px-4 mt-1 outline-none dark:text-white font-bold" onChange={handleChange} />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-400 ml-2">Area</label>
              <input name="area" value={formData.area} required placeholder="e.g. Under-G" className="w-full bg-slate-50 dark:bg-white/5 rounded-xl py-3 px-4 mt-1 outline-none dark:text-white font-bold" onChange={handleChange} />
            </div>
          </div>

          {error && <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl font-bold text-center">{error}</div>}

          <button type="submit" disabled={loading || !isContactProvided()} className={`w-full py-5 rounded-[2rem] font-black text-lg shadow-xl transition-all active:scale-95 ${isContactProvided() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
            {loading ? 'SYNCING TO GLOBAL SERVERS...' : 'PUBLISH WORLDWIDE'}
          </button>
        </form>
      </div>
    </div>
  );
};