import {useState ,useEffect} from 'react';
import api from '../services/api';
import { Search, Loader2, MapPin, Filter, Sparkles } from 'lucide-react';
import { ItemCard } from './../components/ItemCard';

export const Home = () => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState({ country: '', city: '', area: '' });
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(false);

  // Legendary Category List
  const categories = ["All", "Electronics", "Textbooks", "Fashion", "Furniture", "Services", "Food"];

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (location.city) params.city = location.city;
      if (location.area) params.area = location.area;
      if (category !== "All") params.category = category;

      // ✅ LOGIC: Direct API call with search and location filters
      const { data } = await api.get('/items', { params }); 
      setItems(data);
    } catch (err) {
      console.error("Connection failed to fetch items", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchItems();
    }, 500);
    return () => clearTimeout(delay);
  }, [searchTerm, location.city, location.area, category]);

  // ✅ FIXED: WhatsApp Logic integrated for the grid
  const handleWhatsAppChat = (phoneNumber: string, itemName: string) => {
  // Clean the phone number (remove +, spaces, or dashes)
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Create the custom message
  const message = encodeURIComponent(`Hello, I'm interested in your listing: ${itemName} on MarketPlace.`);
  
  // Direct Link: https://wa.me/number?text=message
  window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-20">
      
      {/* HERO SEARCH SECTION */}
      <div className="flex flex-col gap-8 mb-12">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Find everything on <span className="text-blue-600">Campus.</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Trusted marketplace for students and locals.</p>
        </div>

        <div className="relative max-w-3xl mx-auto w-full group">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-600 z-10">
            {loading ? <Loader2 className="animate-spin" size={26} /> : <Search size={26} />}
          </div>
          <input 
            type="text"
            placeholder="Search for laptops, books, or services..."
            className="w-full bg-white dark:bg-slate-900 border-2 border-transparent focus:border-blue-600 rounded-[2.5rem] py-6 pl-16 pr-8 shadow-2xl shadow-blue-100 dark:shadow-none text-xl outline-none transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-full font-bold text-sm">
            <Sparkles size={16} />
            Trending
          </div>
        </div>

        {/* LOCATION FILTERS */}
        <div className="flex flex-wrap gap-3 justify-center">
          <div className="relative">
             <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input 
                placeholder="City (e.g. Saki)" 
                className="rounded-2xl pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setLocation({...location, city: e.target.value})}
              />
          </div>
          <input 
            placeholder="Area / Campus Name" 
            className="rounded-2xl px-6 py-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setLocation({...location, area: e.target.value})}
          />
        </div>

        {/* CATEGORY CHIPS */}
        <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar justify-center">
          <Filter size={20} className="text-slate-400 mr-2" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                category === cat 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-600 border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ITEMS GRID */}
      {items.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full">
            <Search size={48} className="text-slate-300" />
          </div>
          <p className="text-xl font-bold text-slate-400">No items found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {items.map((item: any) => (
            <ItemCard 
              key={item.id} 
              item={item} 
              onWhatsAppClick={() => handleWhatsAppChat(item.contactLink, item.stockName)} 
            />
          ))}
        </div>
      )}
    </div>
  );
};