import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export const LoginAttemptsWarning: React.FC = () => {
  const [attemptsInfo, setAttemptsInfo] = useState<{ remaining: number } | null>(null);

  useEffect(() => {
    // Escuchar el evento cuando el login falla pero aún quedan intentos
    const handleAttemptsEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ remaining: number }>;
      const { remaining } = customEvent.detail;

      if (remaining > 0) {
        setAttemptsInfo({ remaining });
      } else {
        // Si no quedan intentos, probablemente se activará el LoginSecurityBlock
        setAttemptsInfo(null);
      }
    };

    // Escuchar si hay un bloqueo para ocultar este mensaje
    const handleBlockEvent = () => {
      setAttemptsInfo(null);
    };

    window.addEventListener('login-attempts-update', handleAttemptsEvent);
    window.addEventListener('block-login', handleBlockEvent);

    return () => {
      window.removeEventListener('login-attempts-update', handleAttemptsEvent);
      window.removeEventListener('block-login', handleBlockEvent);
    };
  }, []);

  if (!attemptsInfo) {
    return null;
  }

  // Estilos según la gravedad
  const isCritical = attemptsInfo.remaining <= 2;

  return (
    <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 shadow-sm animate-in slide-in-from-top-2 duration-300 ${isCritical
        ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
        : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
      }`}>
      <AlertCircle className={`w-5 h-5 mt-0.5 shrink-0 ${isCritical ? 'text-red-500' : 'text-amber-500'}`} />
      <div>
        <h4 className="font-semibold text-sm mb-0.5">
          {isCritical ? 'Advertencia de seguridad' : 'Credenciales incorrectas'}
        </h4>
        <p className="text-sm opacity-90">
          Te queda{attemptsInfo.remaining === 1 ? '' : 'n'} <span className="font-bold">{attemptsInfo.remaining}</span> intento{attemptsInfo.remaining === 1 ? '' : 's'} antes de que este dispositivo sea bloqueado temporalmente por motivos de seguridad.
        </p>
      </div>
    </div>
  );
};

export default LoginAttemptsWarning;
