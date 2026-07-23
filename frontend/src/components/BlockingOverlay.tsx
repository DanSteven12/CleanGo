import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'cleango_block_until';

export const BlockingOverlay: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    // Check initial state from localStorage on mount
    const savedUnlockTime = localStorage.getItem(STORAGE_KEY);
    if (savedUnlockTime) {
      const remaining = Math.floor((parseInt(savedUnlockTime, 10) - Date.now()) / 1000);
      if (remaining > 0) {
        setTimeLeft(remaining);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Listener for custom block event
    const handleTriggerBlock = (e: Event) => {
      const customEvent = e as CustomEvent<{ seconds: number }>;
      const seconds = customEvent.detail?.seconds;
      if (typeof seconds === 'number' && seconds > 0) {
        const unlockTime = Date.now() + seconds * 1000;
        localStorage.setItem(STORAGE_KEY, unlockTime.toString());
        setTimeLeft(seconds);
      }
    };

    window.addEventListener('trigger-block', handleTriggerBlock);

    return () => {
      window.removeEventListener('trigger-block', handleTriggerBlock);
    };
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) return;

    // Tick every second to synchronize with real time
    const timer = setInterval(() => {
      const savedUnlockTime = localStorage.getItem(STORAGE_KEY);
      if (savedUnlockTime) {
        const remaining = Math.floor((parseInt(savedUnlockTime, 10) - Date.now()) / 1000);
        if (remaining <= 0) {
          setTimeLeft(0);
          localStorage.removeItem(STORAGE_KEY);
        } else {
          setTimeLeft(remaining);
        }
      } else {
        // If someone deleted the key manually, unlock immediately
        setTimeLeft(0);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  if (timeLeft <= 0) return null;

  // Format MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm text-white select-none">
      <h1 className="text-5xl md:text-6xl font-bold text-red-600 mb-6 tracking-widest uppercase animate-pulse drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]">
        Acceso Denegado
      </h1>
      
      <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-lg text-center px-6">
        Se ha detectado un exceso de peticiones. Por seguridad, hemos bloqueado el acceso a la plataforma temporalmente.
      </p>
      
      <div className="text-7xl md:text-8xl font-mono font-bold text-white bg-red-950/40 px-12 md:px-16 py-6 md:py-8 rounded-3xl border-2 border-red-900 shadow-[0_0_50px_-12px_rgba(220,38,38,0.5)]">
        {formattedTime}
      </div>
    </div>
  );
};
