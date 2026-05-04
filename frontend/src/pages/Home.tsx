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
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow pt-20">
        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center py-20">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 border border-blue-500/30 text-blue-500 text-xs font-black tracking-widest uppercase">
              <Rocket size={14} className="animate-bounce" /> The Future of Commerce
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9]">
              BECOME <br /> <span className="neon-text-gradient">LEGENDARY</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-lg leading-relaxed">
              Turn your business into a global brand. The marketplace where unknown names become global icons.
            </p>
            
            <div className="flex gap-4">
              {/* ✅ REDIRECTS TO REGISTER */}
              <button 
                onClick={() => navigate('/register')}
                className="px-8 py-5 bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl font-black text-lg hover:scale-105 transition-all flex items-center gap-3 text-white shadow-xl shadow-blue-500/20"
              >
                <Globe2 size={24} /> START SELLING WORLDWIDE
              </button>
            </div>
          </motion.div>

          {/* Hero Visual */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative flex justify-center">
            <div className="absolute inset-0 bg-blue-600/20 blur-[120px] rounded-full animate-glow" />
            <div className="glass-card w-[280px] h-[560px] rounded-[3rem] border-4 border-white/10 overflow-hidden relative z-10 p-2">
               <div className="bg-black w-full h-full rounded-[2.5rem] flex flex-col items-center justify-center">
                  <Globe className="text-blue-500 animate-spin-slow" size={48} />
               </div>
            </div>
          </motion.div>
        </section>

        {/* SOCIAL PROOF, SEARCH, AND GRID SECTIONS (Code remains same as before) */}
        {/* ... [Insert your existing Search and Grid sections here] ... */}
      </div>

      {/* FOOTER ADDED HERE */}
      <Footer />
    </div>
  );
};