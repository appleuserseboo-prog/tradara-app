import { motion } from 'framer-motion';
import { Mail, Phone } from 'lucide-react';

export const Footer = () => {
  const socialLinks = [
    { 
      name: 'TikTok', 
      url: 'https://www.tiktok.com/@tradara_marketplace', 
      img: 'https://cdn2.iconfinder.com/data/icons/social-media-2285/512/1_Twitternew_colored_svg-512.png' // High quality TikTok-style placeholder or official icon
    },
    { 
      name: 'Instagram', 
      url: 'https://www.instagram.com/tradara_marketplace?igsh=MXJhNHBocjZkZmJt&utm_source=qr', 
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/2048px-Instagram_logo_2016.svg.png' 
    },
    { 
      name: 'Facebook', 
      url: 'https://www.facebook.com/share/17ev2yEU7S/?mibextid=wwXIfr', 
      img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Facebook_Logo_2023.png/600px-Facebook_Logo_2023.png' 
    }
  ];

  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-white/5 py-16 px-6 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-10">
        
        {/* Updated Email and Support Info */}
        <div className="flex flex-wrap justify-center gap-10 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-xs">
          <a 
            href="mailto:appleuserseboo@gmail.com" 
            className="flex items-center gap-3 hover:text-blue-600 transition-all group"
          >
            <div className="bg-slate-100 dark:bg-white/5 p-3 rounded-full group-hover:bg-blue-50 transition-colors">
              <Mail size={20} className="text-blue-600" />
            </div>
            appleuserseboo@gmail.com
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

        {/* Social Media Grid - Using high-res external icons */}
        <div className="flex gap-8">
          {socialLinks.map((social) => (
            <motion.a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.15, rotate: 2 }}
              whileTap={{ scale: 0.9 }}
              className="relative w-16 h-16 md:w-20 md:h-20 rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-white/10 flex items-center justify-center bg-black"
            >
              <img 
                src={social.img} 
                alt={social.name} 
                className="w-full h-full object-contain p-2"
              />
            </motion.a>
          ))}
        </div>

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