import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 text-center">
        
        {/* CONTACT & DESCRIPTION */}
        <h2 className="text-xl md:text-2xl font-black tracking-tighter dark:text-white mb-2 uppercase">
          APPLEUSERSEBOO@GMAIL.COM
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-10 max-w-lg mx-auto">
          Contact our support team or follow us on social media for the latest global marketplace updates.
        </p>

        {/* SOCIAL LINKS - TEXT BOXES WITH ACTUAL LINKS */}
        <div className="flex justify-center gap-6 mb-12 flex-wrap">
          {/* TIKTOK */}
          <a href="https://www.tiktok.com/@tradara_marketplace?_r=1&_t=ZS-965LXfLfcaF" target="_blank" rel="noreferrer" 
             className="w-32 h-32 bg-white dark:bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center border border-slate-200 dark:border-white/10 hover:border-blue-500 transition-all shadow-xl hover:-translate-y-1">
            <span className="text-blue-600 font-black text-xs uppercase tracking-tighter">TikTok</span>
            <span className="text-slate-400 text-[10px] mt-1 font-bold">@Tradara</span>
          </a>
          
          {/* INSTAGRAM */}
          <a href="https://www.instagram.com/tradara_marketplace?igsh=MXJhNHBocjZkZmJt&utm_source=qr" target="_blank" rel="noreferrer" 
             className="w-32 h-32 bg-white dark:bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center border border-slate-200 dark:border-white/10 hover:border-pink-500 transition-all shadow-xl hover:-translate-y-1">
            <span className="text-pink-600 font-black text-xs uppercase tracking-tighter">Instagram</span>
            <span className="text-slate-400 text-[10px] mt-1 font-bold">@Tradara</span>
          </a>

          {/* FACEBOOK */}
          <a href="https://www.facebook.com/share/17ev2yEU7S/?mibextid=wwXIfr" target="_blank" rel="noreferrer" 
             className="w-32 h-32 bg-white dark:bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center border border-slate-200 dark:border-white/10 hover:border-indigo-500 transition-all shadow-xl hover:-translate-y-1">
            <span className="text-indigo-600 font-black text-xs uppercase tracking-tighter">Facebook</span>
            <span className="text-slate-400 text-[10px] mt-1 font-bold">@Tradara</span>
          </a>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-white/5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
            Professional Global Support & Update Channel
          </p>
        </div>
      </div>
    </footer>
  );
};