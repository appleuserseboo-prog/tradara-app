import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const ProductDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        // Changed endpoint to /items/ to match your backend index.ts
        const response = await fetch(`https://tradara-backend.onrender.com/api/items/${id}`);
        
        if (!response.ok) {
           throw new Error("Product not found");
        }
        
        const data = await response.json();
        setProduct(data);
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Product not found");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <div className="pt-24 text-center font-black">LOADING PRODUCT...</div>;
  if (error || !product) return <div className="pt-24 text-center font-black text-red-500 uppercase tracking-widest">PRODUCT NOT FOUND</div>;

  return (
    <div className="pt-24 pb-12 px-4 max-w-6xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-6 font-bold text-slate-500 hover:text-blue-600 transition-colors">
        <ArrowLeft size={20} /> Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="rounded-[2.5rem] overflow-hidden bg-slate-900 aspect-square shadow-2xl border border-white/5">
          <img 
            src={product.images?.[0] || 'https://placehold.co/600x600'} 
            className="w-full h-full object-cover"
            alt={product.stockName}
          />
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-blue-600 font-black text-xs uppercase tracking-[0.2em]">{product.category}</span>
            <h1 className="text-4xl font-black tracking-tight">{product.stockName}</h1>
          </div>
          
          <div className="text-3xl font-black text-blue-600">
            {product.currency || '₦'}{Number(product.price).toLocaleString()}
          </div>
          
          <div className="flex items-center gap-2 text-slate-500 font-bold uppercase text-sm bg-slate-100 dark:bg-white/5 w-fit px-4 py-2 rounded-xl">
            <MapPin size={18} /> {product.city}{product.area ?` , ${product.area}`: ''}
          </div>

          <div className="space-y-2">
            <h3 className="font-black text-xs uppercase text-slate-400">Description</h3>
            <p className="text-slate-500 leading-relaxed text-lg italic">
              "{product.description}"
            </p>
          </div>

          <div className="flex gap-4 mt-auto">
            <button 
              onClick={() => addToCart(product)}
              className="flex-1 bg-blue-600 text-white py-5 rounded-[2rem] font-black flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
            >
              <ShoppingCart size={20} /> ADD TO CART
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};