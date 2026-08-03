import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="relative w-full overflow-hidden bg-[#020303] pt-20 pb-10">
      {/* Illuminated top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-soft/50 to-transparent opacity-80" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[1px] w-1/3 bg-brand-soft blur-[2px] opacity-60" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[200px] w-[600px] rounded-full bg-brand/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4 lg:gap-8 mb-16">
          {/* Brand Col */}
          <div className="md:col-span-1">
            <span className="font-display text-xl font-medium tracking-tight text-white mb-4 block">
              CleanGo<span className="text-brand-soft">.</span>
            </span>
            <p className="text-sm text-ink-muted leading-relaxed">
              Sistema de Monitoreo de Recolección de Residuos.
              <br />
              Gobierno Municipal de Ocosingo.
            </p>
          </div>

          {/* Plataforma */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white mb-6">Plataforma</h4>
            <ul className="space-y-4">
              <li><a href="#inicio" className="text-sm text-ink-muted hover:text-brand-soft transition-colors">Inicio</a></li>
              <li><a href="#caracteristicas" className="text-sm text-ink-muted hover:text-brand-soft transition-colors">Características</a></li>
              <li><a href="#como-funciona" className="text-sm text-ink-muted hover:text-brand-soft transition-colors">¿Cómo funciona?</a></li>
              <li><a href="#quienes-somos" className="text-sm text-ink-muted hover:text-brand-soft transition-colors">Quiénes somos</a></li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white mb-6">Contacto</h4>
            <ul className="space-y-4">
              <li className="text-sm text-ink-muted">contacto@ocosingo.gob.mx</li>
              <li className="text-sm text-ink-muted">Lun - Vie: 08:00 - 16:00</li>
              <li><a href="" className="text-sm text-ink-muted hover:text-brand-soft transition-colors">www.ocosingo.gob.mx</a></li>
            </ul>
          </div>

          {/* Sistema */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white mb-6">Sistema</h4>
            <ul className="space-y-4">
              <li className="text-sm text-ink-muted">Versión: <span className="text-white">v2.4.0</span></li>
              <li className="text-sm text-ink-muted">Actualización: <span className="text-white">Julio 2026</span></li>
              <li className="text-sm flex items-center gap-2 text-ink-muted">
                Estado:
                <span className="flex items-center gap-1 text-brand-soft font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-soft opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-soft" />
                  </span>
                  En línea
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/[.05] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink-muted">
            CleanGo © {new Date().getFullYear()} Todos los derechos reservados.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy-policy" state={{ from: '/' }} className="text-xs text-ink-muted hover:text-white transition-colors">Política de privacidad</Link>
            <Link to="/terms-and-conditions" state={{ from: '/' }} className="text-xs text-ink-muted hover:text-white transition-colors">Términos y condiciones</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
