import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import api from '../services/api';
import { Search, Loader2, Filter, Globe, Rocket, Package, TrendingUp, Globe2, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Footer } from '../components/footer';

const ItemCard = lazy(() => import('./../components/ItemCard').then(module => ({ default: module.ItemCard })));

export const Home = () => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState({ city: '', area: '' });
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(false);

  const categories = ["All", "Electronics", "Textbooks", "Fashion", "Furniture", "Services", "Food", "others"];

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params: any = { search: searchTerm || undefined, city: location.city || undefined, area: location.area || undefined, category: category !== "All" ? category : undefined };
      const { data } = await api.get('/items', { params }); 
      setItems(data);
    } catch (err) { console.error("Fetch failed", err); } finally { setLoading(false); }
  };

  useEffect(() => {
    const delay = setTimeout(fetchItems, 400);
    return () => clearTimeout(delay);
  }, [searchTerm, location.city, location.area, category]);

  const filteredItems = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return items.filter((item: any) => {
      const city = (item.city || "").toLowerCase();
      const area = (item.area || "").toLowerCase();
      const name = (item.stockName || "").toLowerCase();
      return name.includes(query) || city.includes(query) || area.includes(query);
    });
  }, [items, searchTerm]);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors">
      {/* 1. HERO SECTION - RESTORED ORIGINAL DESIGN */}
      <section className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center pt-32 pb-20">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 border border-blue-500/30 text-blue-500 text-xs font-black tracking-widest uppercase">
            <Rocket size={14} className="animate-bounce" /> The Future of Commerce
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] dark:text-white">
            BECOME <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">LEGENDARY</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-lg leading-relaxed">
            Turn your business into a global brand. The marketplace where unknown names become global icons.
          </p>
          <div className="flex gap-4">
            <button className="px-8 py-5 bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl font-black text-lg hover:scale-105 transition-all text-white shadow-xl shadow-blue-500/20 flex items-center gap-3">
              <Globe2 size={24} /> START SELLING WORLDWIDE
            </button>
          </div>
        </motion.div>

        {/* HERO VISUAL - RESTORED PHONE DESIGN */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative flex justify-center">
          <div className="absolute inset-0 bg-blue-600/20 blur-[120px] rounded-full animate-pulse" />
          <div className="glass-card w-[280px] h-[560px] rounded-[3rem] border-4 border-slate-200 dark:border-white/10 overflow-hidden relative z-10 p-2 bg-white dark:bg-slate-900">
             <div className="bg-black w-full h-full rounded-[2.5rem] overflow-hidden flex flex-col items-center justify-center">
                <Globe className="text-blue-500 animate-spin-slow mb-4" size={48} />
                <div className="px-4 text-center">
                   <div className="h-2 w-20 bg-slate-800 rounded mx-auto mb-2" />
                   <div className="h-2 w-12 bg-slate-800 rounded mx-auto" />
                </div>
             </div>
          </div>
        </motion.div>
      </section>

      {/* 2. SOCIAL PROOF STRIP - RESTORED */}
      <div className="border-y border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 backdrop-blur-md py-14 mb-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-around gap-12">
          <div className="flex flex-col items-center"><Globe2 className="text-blue-500 mb-2" size={32}/><span className="text-3xl font-black dark:text-white">190+</span><span className="text-[10px] text-slate-500 uppercase font-black">Countries</span></div>
          <div className="flex flex-col items-center"><Package className="text-cyan-500 mb-2" size={32}/><span className="text-3xl font-black dark:text-white">50K+</span><span className="text-[10px] text-slate-500 uppercase font-black">Listings</span></div>
          <div className="flex flex-col items-center"><TrendingUp className="text-violet-500 mb-2" size={32}/><span className="text-3xl font-black dark:text-white">24/7</span><span className="text-[10px] text-slate-500 uppercase font-black">Growth</span></div>
        </div>
      </div>

      {/* 3. SEARCH BAR - RESTORED CITY/AREA FIELDS */}
      <div className="max-w-6xl mx-auto px-6 -mt-24 relative z-30 mb-16">
        <div className="glass-card p-6 rounded-[2.5rem] flex flex-col md:flex-row gap-4 items-center border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl">
          <div className="flex-1 flex items-center gap-4 px-6 w-full border-r border-slate-100 dark:border-white/5">
            <Search className="text-blue-600" size={24} />
            <input className="bg-transparent border-none outline-none w-full text-xl placeholder:text-slate-400 dark:text-white font-bold" placeholder="What are you looking for?" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <input placeholder="CITY" className="w-full md:w-32 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-xs dark:text-white font-black uppercase" onChange={(e) => setLocation({...location, city: e.target.value})} />
            <input placeholder="AREA" className="w-full md:w-32 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-3 text-xs dark:text-white font-black uppercase" onChange={(e) => setLocation({...location, area: e.target.value})} />
            <button onClick={fetchItems} className="bg-blue-600 px-8 py-3 rounded-2xl font-black text-white text-xs uppercase shadow-xl shadow-blue-600/30">Search</button>
          </div>
        </div>
      </div>

      {/* 4. GRID */}
      <div className="max-w-7xl mx-auto px-6 pb-32">
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredItems.map((item: any) => <ItemCard key={item.id} item={item} />)}
          </div>
        </Suspense>
      </div>
      <Footer />
    </div>
  );
};