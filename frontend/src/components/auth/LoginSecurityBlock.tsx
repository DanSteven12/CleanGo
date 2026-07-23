import React, { useState, useEffect } from 'react';
import { Ban } from 'lucide-react';

export const LoginSecurityBlock: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    // 1. Reanudar bloqueo si existe en localStorage (Anti-F5)
    const storedBlockUntil = localStorage.getItem('login-block-until');
    if (storedBlockUntil) {
      const until = parseInt(storedBlockUntil, 10);
      const now = Date.now();
      if (until > now) {
        setTimeLeft(Math.ceil((until - now) / 1000));
      } else {
        localStorage.removeItem('login-block-until');
      }
    }

    // 2. Escuchar evento global 'block-login'
    const handleBlockEvent = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      const seconds = customEvent.detail;
      if (seconds > 0) {
        setTimeLeft(seconds);
        localStorage.setItem('login-block-until', (Date.now() + seconds * 1000).toString());
      }
    };

    window.addEventListener('block-login', handleBlockEvent);

    return () => {
      window.removeEventListener('block-login', handleBlockEvent);
    };
  }, []);

  useEffect(() => {
    // Si no hay tiempo, no hacemos nada
    if (timeLeft === null) return;

    // Si el tiempo llegó a 0 o menos, limpiamos
    if (timeLeft <= 0) {
      setTimeLeft(null);
      localStorage.removeItem('login-block-until');
      return;
    }

    // Intervalo para actualizar el contador
    const timer = setInterval(() => {
      const storedBlockUntil = localStorage.getItem('login-block-until');
      if (storedBlockUntil) {
        const until = parseInt(storedBlockUntil, 10);
        const now = Date.now();
        if (until > now) {
          // Recalcular basado en Date.now() para precisión
          setTimeLeft(Math.ceil((until - now) / 1000));
        } else {
          setTimeLeft(0); // Trigger cleanup on next render
        }
      } else {
        setTimeLeft(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Si no hay bloqueo, el componente no renderiza nada y se desmonta visualmente
  if (timeLeft === null) {
    return null;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="absolute inset-0 z-50 bg-[#0f172a]/95 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="flex flex-col items-center max-w-md text-center">
        <div className="mb-6 bg-[#ef4444]/10 p-4 rounded-full">
          <Ban className="w-14 h-14 text-[#ef4444]" strokeWidth={2} />
        </div>

        <h2 className="text-2xl font-bold text-[#ef4444] mb-4 tracking-wide">
          ACCESO DENEGADO
        </h2>

        <p className="text-slate-300 text-sm md:text-base mb-8 leading-relaxed px-4">
          Se detectaron demasiados intentos fallidos de inicio de sesión desde esta conexión. Por seguridad, el acceso permanecerá bloqueado temporalmente (Por motivos de seguridad).
        </p>

        <div className="text-[2.75rem] font-mono font-semibold text-white tabular-nums tracking-wider drop-shadow-md">
          {formattedTime}
        </div>
      </div>
    </div>
  );
};

export default LoginSecurityBlock;
