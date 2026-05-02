import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import api from '../services/api';
import { 
  Search, 
  Loader2, 
  Filter, 
  Globe, 
  Rocket, 
  Package, 
  TrendingUp, 
  Globe2, 
  Link as LinkIcon 
} from 'lucide-react';
import { motion } from 'framer-motion';

/** 
 * PERFORMANCE: Lazy load the ItemCard component.
 * This ensures the browser only downloads the code for the cards when needed,
 * significantly reducing initial data consumption.
 */
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
    // Debouncing the search to avoid unnecessary API calls and data usage
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
    <div className="min-h-screen">
      {/* 🧩 1. HERO SECTION - High Contrast & Neon Theme */}
      <section className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center py-20">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 border border-blue-500/30 text-blue-500 text-xs font-black tracking-widest uppercase">
            <Rocket size={14} className="animate-bounce" /> The Future of Commerce
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9]">
            BECOME <br /> 
            <span className="neon-text-gradient">LEGENDARY</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-lg leading-relaxed">
            Turn your business into a global brand. The marketplace where unknown names become global icons.
          </p>
          
          <div className="flex gap-4">
            <button className="px-8 py-5 bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl font-black text-lg hover:scale-105 transition-all neon-glow-blue flex items-center gap-3 text-white shadow-xl shadow-blue-500/20">
              <Globe2 size={24} /> START SELLING WORLDWIDE
            </button>
          </div>
          
          <p className="text-slate-500 text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Join 10,000+ sellers reaching customers in 190+ countries.
          </p>
        </motion.div>

        {/* Hero Visual */}
        <motion.div 
           initial={{ opacity: 0, scale: 0.9 }}
           whileInView={{ opacity: 1, scale: 1 }}
           viewport={{ once: true }}
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

      {/* 🧩 2. SOCIAL PROOF STRIP - Optimized Visibility */}
      <div className="border-y border-slate-200 bg-slate-50/50 backdrop-blur-md py-14 mb-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-around gap-12">
          {/* Countries */}
          <div className="flex flex-col items-center group transition-all hover:-translate-y-1">
            <div className="p-4 bg-blue-500 rounded-2xl mb-4 shadow-lg shadow-blue-200 text-white">
              <Globe2 size={32} />
            </div>
            <div className="text-4xl font-black text-slate-800 tracking-tighter group-hover:text-blue-600 transition-colors">190+</div>
            <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mt-1">Countries</div>
          </div>

          {/* Listings */}
          <div className="flex flex-col items-center group transition-all hover:-translate-y-1">
            <div className="p-4 bg-cyan-500 rounded-2xl mb-4 shadow-lg shadow-cyan-200 text-white">
              <Package size={32} />
            </div>
            <div className="text-4xl font-black text-slate-800 tracking-tighter group-hover:text-cyan-600 transition-colors">50K+</div>
            <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mt-1">Listings</div>
          </div>

          {/* Growth */}
          <div className="flex flex-col items-center group transition-all hover:-translate-y-1">
            <div className="p-4 bg-violet-500 rounded-2xl mb-4 shadow-lg shadow-violet-200 text-white">
              <TrendingUp size={32} />
            </div>
            <div className="text-4xl font-black text-slate-800 tracking-tighter group-hover:text-violet-600 transition-colors">24/7</div>
            <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mt-1">Growth</div>
          </div>

          {/* Connections */}
          <div className="flex flex-col items-center group transition-all hover:-translate-y-1">
            <div className="p-4 bg-indigo-500 rounded-2xl mb-4 shadow-lg shadow-indigo-200 text-white">
              <LinkIcon size={32} />
            </div>
            <div className="text-4xl font-black text-slate-800 tracking-tighter group-hover:text-indigo-600 transition-colors">Global</div>
            <div className="text-[10px] text-slate-500 uppercase font-black tracking-[0.3em] mt-1">Connections</div>
          </div>
        </div>
      </div>

      {/* 🧩 3. INTERACTIVE SEARCH BAR - High Contrast for Clarity */}
      <div className="max-w-6xl mx-auto px-6 -mt-24 relative z-30 mb-16">
        <div className="glass-card p-6 rounded-[2.5rem] flex flex-col md:flex-row gap-4 items-center border border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-white">
          <div className="flex-1 flex items-center gap-4 px-6 w-full border-r border-slate-100">
            <Search className="text-blue-600" size={24} />
            <input 
              className="bg-transparent border-none outline-none w-full text-xl placeholder:text-slate-400 text-slate-900 font-bold"
              placeholder="What are you looking for?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto">
            <input 
              placeholder="CITY" 
              className="flex-1 md:w-40 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs outline-none focus:ring-2 ring-blue-500/20 text-slate-900 font-black uppercase tracking-widest placeholder:text-slate-400" 
              onChange={(e) => setLocation({...location, city: e.target.value})} 
            />
            <input 
              placeholder="AREA" 
              className="flex-1 md:w-40 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xs outline-none focus:ring-2 ring-blue-500/20 text-slate-900 font-black uppercase tracking-widest placeholder:text-slate-400" 
              onChange={(e) => setLocation({...location, area: e.target.value})} 
            />
            <button 
              onClick={fetchItems} 
              className="w-full md:w-auto bg-blue-600 px-10 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all uppercase text-xs text-white shadow-xl shadow-blue-600/30 active:scale-95"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* 🧩 4. CATEGORIES */}
      <div className="max-w-7xl mx-auto px-6 mb-12 flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
          <Filter size={18} className="text-slate-500 flex-shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                category === cat 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105' 
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
      </div>

      {/* 🧩 5. THE MAIN GRID - Lazy Loading & Animation Viewport */}
      <div className="max-w-7xl mx-auto px-6 pb-32">
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>
        ) : (
          /* Suspense handles the loading state of lazy-loaded components */
          <Suspense fallback={
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          }>
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
            >
              {filteredItems.map((item: any) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </motion.div>
          </Suspense>
        )}
      </div>
    </div>
  );
};