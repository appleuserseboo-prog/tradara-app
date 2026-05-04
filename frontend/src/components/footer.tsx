import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 text-center">
        
        {/* CONTACT & DESCRIPTION */}
        <h2 className="text-xl md:text-2xl font-black tracking-tighter dark:text-white mb-2 uppercase">
          APPLEUSERSEBOO@GMAIL.COM
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-10 max-w-md mx-auto">
          Contact our support team or follow us on social media for the latest global marketplace updates.
        </p>

        {/* SOCIAL LINKS - TEXT BOXES ONLY */}
        <div className="flex justify-center gap-4 mb-12 flex-wrap">
          <a href="https://tradara-app.vercel.app" target="_blank" rel="noreferrer" 
             className="w-28 h-28 bg-white dark:bg-slate-900 rounded-3xl flex flex-col items-center justify-center border border-slate-200 dark:border-white/10 hover:border-blue-500 transition-all shadow-lg">
            <span className="text-blue-600 font-black text-[10px] uppercase">TikTok</span>
            <span className="text-slate-400 text-[8px] mt-1 font-bold italic">@Tradara</span>
          </a>
          
          <a href="https://tradara-app.vercel.app" target="_blank" rel="noreferrer" 
             className="w-28 h-28 bg-white dark:bg-slate-900 rounded-3xl flex flex-col items-center justify-center border border-slate-200 dark:border-white/10 hover:border-pink-500 transition-all shadow-lg">
            <span className="text-pink-600 font-black text-[10px] uppercase">Instagram</span>
            <span className="text-slate-400 text-[8px] mt-1 font-bold italic">@Tradara</span>
          </a>

          <a href="https://tradara-app.vercel.app" target="_blank" rel="noreferrer" 
             className="w-28 h-28 bg-white dark:bg-slate-900 rounded-3xl flex flex-col items-center justify-center border border-slate-200 dark:border-white/10 hover:border-indigo-500 transition-all shadow-lg">
            <span className="text-indigo-600 font-black text-[10px] uppercase">Facebook</span>
            <span className="text-slate-400 text-[8px] mt-1 font-bold italic">@Tradara</span>
          </a>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-white/5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">
            Professional Global Support & Update Channel
          </p>
        </div>
      </div>
    </footer>
  );
};