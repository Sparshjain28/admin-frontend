import { useState, useEffect } from 'react';

interface SplashScreenProps {
  onDone: () => void;
}

const SplashScreen = ({ onDone }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1500);
    const done = setTimeout(onDone, 2200);
    return () => { clearTimeout(timer); clearTimeout(done); };
  }, [onDone]);

  return (
    <div className={`fixed inset-0 z-50 gradient-hero flex items-center justify-center transition-opacity duration-700 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="text-center space-y-4 animate-pulse">
        <div className="w-64 h-24 mx-auto">
          <img src="/finonest-logo.png" alt="Finonest" className="w-full h-full object-contain brightness-0 invert" />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
