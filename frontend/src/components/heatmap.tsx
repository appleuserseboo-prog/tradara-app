import React from 'react';
import { TrendingUp } from 'lucide-react';

export const CampusHeatmap = () => {
  return (
    <section className="mb-16">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-red-500 p-2 rounded-lg text-white animate-pulse"><TrendingUp size={20}/></div>
        <h2 className="text-2xl font-black text-slate-900">Campus Heatmap</h2>
      </div>
      <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4">
        {['Laptops', 'Calculators', 'Hostel Spaces', 'Bikes'].map((item) => (
          <div key={item} className="min-w-[200px] bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2rem] text-white shadow-lg shadow-blue-100">
            <p className="text-xs font-bold opacity-70 uppercase mb-1">Trending</p>
            <h4 className="text-xl font-black">{item}</h4>
            <div className="mt-4 h-1 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white w-2/3"></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};