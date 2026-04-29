import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { Search, Loader2, MapPin, Filter, Globe, MessageCircle } from 'lucide-react';
import { ItemCard } from './../components/ItemCard';
import { motion } from 'framer-motion';

export const Home = () => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState({ city: '', area: '' });
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true); // ✅ Initialized to true

  const categories = ["All", "Electronics", "Textbooks", "Fashion", "Furniture", "Services", "Food", "others"];

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params: any = {
        search: searchTerm || undefined,
        city: location.city || undefined,
        area: location.area || undefined,
        category: category !== "All" ? category : undefined
      };
      const { data } = await api.get('/items', { params }); 
      setItems(data);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
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

  // ✅ LOADING STATE: Prevents blank screen on Render cold-starts
  if (loading && items.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">
        Waking up the Global Engine...
      </p>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* 🧩 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center py-20">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <div className="inline-block px-4 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black tracking-widest uppercase">
            🚀 The Future of Commerce
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9]">
            BECOME <br /> 
            <span className="neon-text-gradient">LEGENDARY</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-lg leading-relaxed">
            Turn your business into a global brand. The marketplace where unknown names become global icons.
          </p>
          
          <div className="flex gap-4">
            <button className="px-8 py-5 bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl font-black text-lg hover:scale-105 transition-all neon-glow-blue flex items-center gap-3">
              🌍 START SELLING WORLDWIDE
            </button>
          </div>
          
          <p className="text-slate-500 text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Join 10,000+ sellers reaching customers in 190+ countries.
          </p>
        </motion.div>

        <motion.div 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="relative flex justify-center"
        >
          <div className="absolute inset-0 bg-blue-600/20 blur-[120px] rounded-full animate-glow" />
          <div className="glass-card w-[280px] h-[560px] rounded-[3rem] border-4 border-white/10 overflow-hidden relative z-10 p-2">
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

      <div className="border-y border-white/5 bg-white/5 backdrop-blur-sm py-10 mb-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-around gap-8 text-center">
          <div><div className="text-3xl font-black">🌍 190+</div><div className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Countries</div></div>
          <div><div className="text-3xl font-black text-blue-500">📦 50K+</div><div className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Listings</div></div>
          <div><div className="text-3xl font-black text-violet-500">🚀 24/7</div><div className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Growth</div></div>
          <div><div className="text-3xl font-black">🔗 Global</div><div className="text-xs text-slate-500 uppercase font-bold tracking-tighter">Connections</div></div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-20 relative z-30 mb-16">
        <div className="glass-card p-4 rounded-[2.5rem] flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 flex items-center gap-4 px-6">
            <Search className="text-blue-500" />
            <input 
              className="bg-transparent border-none outline-none w-full text-lg placeholder:text-slate-600"
              placeholder="Search items worldwide..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <input placeholder="City" className="flex-1 md:w-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500" onChange={(e) => setLocation({...location, city: e.target.value})} />
            <input placeholder="Area" className="flex-1 md:w-32 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500" onChange={(e) => setLocation({...location, area: e.target.value})} />
            <button onClick={fetchItems} className="bg-blue-600 px-8 py-3 rounded-xl font-black hover:bg-blue-700 transition-all uppercase text-xs">Search</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mb-12 flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
          <Filter size={18} className="text-slate-500 flex-shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                category === cat 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105' 
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-32">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
        >
          {filteredItems.map((item: any) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </motion.div>
      </div>
    </div>
  );
};