import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                            (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if banner was dismissed
    const bannerDismissed = localStorage.getItem('pwa-banner-dismissed');
    const dismissedTime = bannerDismissed ? parseInt(bannerDismissed) : 0;
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show banner if not dismissed recently and not in standalone mode
      if (!isStandaloneMode && dismissedTime < oneDayAgo) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show banner if not in standalone mode and not dismissed recently
    if (iOS && !isStandaloneMode && dismissedTime < oneDayAgo) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowBanner(false);
        setDeferredPrompt(null);
      }
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  // Don't show banner if already installed or not supported
  if (!showBanner || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg border-t border-blue-500 md:hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="bg-white/20 rounded-lg p-2">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Install Finonest App</p>
            <p className="text-xs text-blue-100 truncate">
              {isIOS 
                ? 'Tap Share → Add to Home Screen' 
                : 'Get the full app experience'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-2">
          {!isIOS && deferredPrompt && (
            <Button
              onClick={handleInstall}
              size="sm"
              className="bg-white text-blue-600 hover:bg-blue-50 h-8 px-3 text-xs font-semibold"
            >
              <Download className="w-3 h-3 mr-1" />
              Install
            </Button>
          )}
          
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Dismiss install banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {isIOS && (
        <div className="px-4 pb-4">
          <div className="bg-white/10 rounded-lg p-3 text-xs">
            <p className="font-medium mb-1">To install on iOS:</p>
            <p>1. Tap the Share button <span className="inline-block w-4 h-4 bg-white/20 rounded text-center leading-4">↗</span></p>
            <p>2. Select "Add to Home Screen"</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PWAInstallBanner;