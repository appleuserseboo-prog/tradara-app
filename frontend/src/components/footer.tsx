import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-xl md:text-2xl font-black tracking-tighter dark:text-white mb-8 uppercase">
          APPLEUSERSEBOO@GMAIL.COM
        </h2>

        {/* SOCIAL LINKS - NO IMAGES, JUST LINKED BOXES */}
        <div className="flex justify-center gap-6 mb-12">
          <a href="https://tiktok.com" target="_blank" rel="noreferrer" 
             className="w-24 h-24 bg-black rounded-3xl flex flex-col items-center justify-center border border-white/10 hover:scale-105 transition-transform shadow-xl">
            <span className="text-white font-black text-xs">TikTok</span>
          </a>
          
          <a href="https://instagram.com" target="_blank" rel="noreferrer" 
             className="w-24 h-24 bg-black rounded-3xl flex flex-col items-center justify-center border border-white/10 hover:scale-105 transition-transform shadow-xl">
            <span className="text-white font-black text-xs">Instagra</span>
          </a>

          <a href="https://facebook.com" target="_blank" rel="noreferrer" 
             className="w-24 h-24 bg-black rounded-3xl flex flex-col items-center justify-center border border-white/10 hover:scale-105 transition-transform shadow-xl">
            <span className="text-white font-black text-xs">Faceboc</span>
          </a>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-white/5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">
            Professional Global Support & Update Channel
          </p>
          <div className="w-16 h-1 bg-blue-600 mx-auto mt-4 rounded-full" />
        </div>
      </div>
    </footer>
  );
};