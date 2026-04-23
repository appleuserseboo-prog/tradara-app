import React from 'react';
import { X, MapPin, Package, ShieldCheck, ShoppingCart, MessageCircle } from 'lucide-react';
import  type{ Item } from '../types';

interface ItemDetailModalProps {
    item: Item;
    onClose: () => void;
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ item, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
            
            <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in slide-in-from-bottom-8 duration-300">
                {/* LEFT: IMAGE AREA */}
                <div className="w-full md:w-1/2 bg-slate-50 flex items-center justify-center p-12">
                    <Package size={120} className="text-slate-200" />
                </div>

                {/* RIGHT: CONTENT */}
                <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col">
                    <button onClick={onClose} className="self-end p-2 hover:bg-slate-100 rounded-full mb-2">
                        <X size={20} className="text-slate-400" />
                    </button>

                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="text-blue-600" size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Premium Listing</span>
                        </div>
                        
                        <h2 className="text-3xl font-black text-slate-900 mb-2">{item.stockName}</h2>
                        <p className="text-3xl font-light text-blue-600 mb-6">${item.price}</p>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-3 text-slate-600">
                                <MapPin size={18} className="text-slate-400" />
                                <span className="font-medium">{item.city}</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <Package size={18} className="text-slate-400" />
                                <span className="font-medium">{item.quantity} units available</span>
                            </div>
                            <p className="text-slate-500 leading-relaxed italic text-sm">
                                "{item.description || "No additional details provided by the seller."}"
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                            <ShoppingCart size={20} /> Buy This Item
                        </button>
                        <button className="w-full bg-slate-100 text-slate-900 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                            <MessageCircle size={20} /> Contact Seller
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemDetailModal;