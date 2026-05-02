import { useState, useEffect } from 'react';
import { Smartphone, MonitorPlay, X } from 'lucide-react';

export default function MobileWarningModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if device is mobile (especially Android, but checking general mobile user agents is safer)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // You can also check screen width, but userAgent is better for "Android" detection
    if (isMobile) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={() => setShow(false)}></div>
      
      <div className="relative bg-card border border-border rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl">
        <div className="w-16 h-16 bg-red/10 rounded-2xl flex items-center justify-center text-red mb-6 mx-auto">
          <Smartphone size={32} />
        </div>
        
        <h2 className="text-2xl font-bold text-text text-center mb-3">
          App Available
        </h2>
        
        <p className="text-sub text-center mb-8 leading-relaxed text-sm">
          This website is designed for desktop web. For the best experience on Android, please download our native app!
        </p>
        
        <div className="flex flex-col gap-3">
          <a 
            href="https://inferalis.space/download-utopia" 
            target="_blank" 
            rel="noreferrer"
            className="w-full bg-primary hover:bg-primary/90 text-bg py-3.5 rounded-xl font-bold text-center transition-colors flex items-center justify-center gap-2"
          >
            <MonitorPlay size={18} />
            Download App
          </a>
          
          <button 
            onClick={() => setShow(false)}
            className="w-full bg-surface hover:bg-surface/80 border border-border/50 text-text py-3.5 rounded-xl font-semibold transition-colors"
          >
            Continue on web
          </button>
        </div>
      </div>
    </div>
  );
}
