import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, ShoppingCart, MessageSquare, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const ProductDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`https://tradara-backend.onrender.com/api/products/${id}`);
        const data = await response.json();
        setProduct(data);
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <div className="pt-24 text-center font-black">LOADING PRODUCT...</div>;
  if (!product) return <div className="pt-24 text-center font-black">PRODUCT NOT FOUND</div>;

  return (
    <div className="pt-24 pb-12 px-4 max-w-6xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-6 font-bold text-slate-500">
        <ArrowLeft size={20} /> Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="rounded-[2.5rem] overflow-hidden bg-slate-900 aspect-square">
          <img 
            src={product.images?.[0] || 'https://placehold.co/600x600'} 
            className="w-full h-full object-cover"
            alt={product.stockName}
          />
        </div>

        <div className="flex flex-col gap-6">
          <h1 className="text-4xl font-black">{product.stockName}</h1>
          <div className="text-3xl font-black text-blue-600">
            {product.currency || '₦'}{Number(product.price).toLocaleString()}
          </div>
          
          <div className="flex items-center gap-2 text-slate-500 font-bold uppercase text-sm">
            <MapPin size={18} /> {product.city}, {product.area}
          </div>

          <p className="text-slate-400 leading-relaxed text-lg italic">
            "{product.description}"
          </p>

          <div className="flex gap-4 mt-4">
            <button 
              onClick={() => addToCart(product)}
              className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
            >
              <ShoppingCart size={20} /> ADD TO CART
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};