import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Footer } from '../components/footer';

const ItemCard = lazy(() => import('./../components/ItemCard').then(module => ({ default: module.ItemCard })));

export const Home = () => {
  const navigate = useNavigate();
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
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 transition-colors">
      <div className="flex-grow pt-20">
        
        {/* HERO */}
        <section className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center py-20">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 border border-blue-500/30 text-blue-500 text-xs font-black tracking-widest uppercase">
              <Rocket size={14} className="animate-bounce" /> The Future of Commerce
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] dark:text-white">
              BECOME <br /> <span className="text-blue-600">LEGENDARY</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-lg leading-relaxed">
              Turn your business into a global brand. Reach customers across the campus and beyond.
            </p>
            <button 
              onClick={() => navigate('/register')}
              className="px-8 py-5 bg-blue-600 rounded-2xl font-black text-lg hover:scale-105 transition-all text-white shadow-xl shadow-blue-500/20"
            >
              START SELLING NOW
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative flex justify-center">
            <div className="absolute inset-0 bg-blue-600/20 blur-[120px] rounded-full" />
            <div className="glass-card w-[280px] h-[500px] rounded-[3rem] border-4 border-slate-200 dark:border-white/10 overflow-hidden relative z-10 flex items-center justify-center bg-slate-50 dark:bg-black">
               <Globe className="text-blue-500 animate-spin-slow" size={64} />
            </div>
          </motion.div>
        </section>

        {/* SEARCH BAR */}
        <div className="max-w-6xl mx-auto px-6 relative z-30 mb-16">
          <div className="glass-card p-4 rounded-3xl flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl">
            <div className="flex-1 flex items-center gap-4 px-4 w-full">
              <Search className="text-blue-600" size={24} />
              <input 
                className="bg-transparent border-none outline-none w-full text-lg dark:text-white font-bold"
                placeholder="What are you looking for?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={fetchItems} className="w-full md:w-auto bg-blue-600 px-8 py-3 rounded-xl font-black text-white">Search</button>
          </div>
        </div>

        {/* GRID */}
        <div className="max-w-7xl mx-auto px-6 pb-32">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={48} /></div>
          ) : (
            <Suspense fallback={<div className="text-center p-10">Loading Items...</div>}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item: any) => <ItemCard key={item.id} item={item} />)
                ) : (
                  <div className="col-span-full text-center py-20 text-slate-400 font-bold uppercase tracking-widest">No items found</div>
                )}
              </div>
            </Suspense>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};