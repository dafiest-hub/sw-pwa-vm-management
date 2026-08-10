import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export const InstallPWAPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 p-4 rounded-2xl bg-gradient-to-r from-brand-900 to-slate-900 border border-brand-500/40 shadow-2xl z-50 flex items-center justify-between gap-3 text-slate-100">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
          <Download className="w-5 h-5 animate-bounce" />
        </div>
        <div>
          <h5 className="text-xs font-bold text-white">Instalar PWA de Control</h5>
          <p className="text-[11px] text-slate-300">Accede instantáneamente desde tu inicio</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
        >
          Instalar
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
