import { motion } from 'framer-motion';
import { Mail, Phone } from 'lucide-react';

export const Footer = () => {
  const socialLinks = [
    { 
      name: 'TikTok', 
      url: 'https://www.tiktok.com/@tradara_marketplace', 
      img: '/socials/tiktok-icon.png' 
    },
    { 
      name: 'Instagram', 
      url: 'https://www.instagram.com/tradara_marketplace?igsh=MXJhNHBocjZkZmJt&utm_source=qr', 
      img: '/socials/instagram-icon.png' 
    },
    { 
      name: 'Facebook', 
      url: 'https://www.facebook.com/share/17ev2yEU7S/?mibextid=wwXIfr', 
      img: '/socials/facebook-icon.png' 
    }
  ];

  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-white/5 py-16 px-6 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-10">
        
        {/* Professional Contact Info */}
        <div className="flex flex-wrap justify-center gap-10 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-xs">
          <a 
            href="mailto:support@tradara.com" 
            className="flex items-center gap-3 hover:text-blue-600 transition-all group"
          >
            <div className="bg-slate-100 dark:bg-white/5 p-3 rounded-full group-hover:bg-blue-50 transition-colors">
              <Mail size={20} className="text-blue-600" />
            </div>
            support@tradara.com
          </a>
          <a 
            href="tel:+234..." 
            className="flex items-center gap-3 hover:text-blue-600 transition-all group"
          >
            <div className="bg-slate-100 dark:bg-white/5 p-3 rounded-full group-hover:bg-blue-50 transition-colors">
              <Phone size={20} className="text-blue-600" />
            </div>
            Support Channel
          </a>
        </div>

        {/* Social Media Grid - Optimized for "App-Like" feel */}
        <div className="flex gap-8">
          {socialLinks.map((social) => (
            <motion.a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.15, rotate: 2 }}
              whileTap={{ scale: 0.9 }}
              className="relative w-16 h-16 md:w-20 md:h-20 rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-500/10 border-4 border-white dark:border-white/10 flex items-center justify-center bg-white"
            >
              <img 
                src={social.img} 
                alt={`Tradara on ${social.name}`} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image path is incorrect during launch
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${social.name}&background=0D8ABC&color=fff`;
                }}
              />
            </motion.a>
          ))}
        </div>

        {/* Branding & Updates */}
        <div className="text-center space-y-2">
          <p className="text-[11px] uppercase tracking-[0.4em] font-black text-slate-400 dark:text-slate-500">
            Professional Global Support & Update Channels
          </p>
          <div className="h-1 w-12 bg-blue-600 mx-auto rounded-full" />
        </div>
      </div>
    </footer>
  );
};