import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Footer from '../welcome/components/Footer';

export function TermsAndConditionsPage() {
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/';
  const backLabel = from === '/login' ? 'Volver al login' : 'Volver al inicio';

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Términos y Condiciones - CleanGo';
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Términos y Condiciones de Uso de CleanGo, plataforma tecnológica para la gestión del servicio de recolección de residuos sólidos urbanos.');
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#050607',
        fontFamily: '"Inter", sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
      className="text-white flex flex-col"
    >
      <div className="flex-grow mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 w-full">
        {/* Header */}
        <div className="mb-12">
          <Link to={from} className="inline-flex items-center text-sm font-medium text-ink-muted hover:text-white transition-colors mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Link>
          <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight mb-6">
            Términos y Condiciones de Uso
          </h1>
          <div className="text-ink-muted space-y-1 text-sm bg-white/5 p-4 rounded-lg border border-white/10">
            <p className="font-semibold text-white mb-2">CleanGo — Plataforma tecnológica para la gestión del servicio de recolección de residuos sólidos urbanos</p>
            <p><strong>Elaborado por:</strong> BroDevs</p>
            <p><strong>Ámbito de operación:</strong> Ocosingo, Chiapas, México</p>
            <p><strong>Versión:</strong> 1.0 &nbsp;|&nbsp; <strong>Fecha de emisión:</strong> 02/08/2026</p>
          </div>
        </div>

        {/* Content */}
        <article className="prose prose-invert max-w-none text-ink-muted leading-relaxed space-y-10">
          
          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">1. OBJETO Y ACEPTACIÓN DE LOS TÉRMINOS</h2>
            <p>Los presentes Términos y Condiciones de Uso (en lo sucesivo, los "Términos") regulan el acceso, registro y uso de CleanGo, plataforma tecnológica desarrollada por BroDevs para apoyar la planeación, seguimiento y comunicación del servicio de recolección de residuos sólidos urbanos en [municipio o zona de operación].</p>
            <p className="mt-4">CleanGo comprende un panel web para personal autorizado, una aplicación móvil para operadores de unidades recolectoras, una aplicación móvil ciudadana, así como los servicios técnicos, bases de datos, interfaces y funciones relacionadas.</p>
            <p className="mt-4">Toda persona que cree una cuenta, acceda o utilice la Plataforma manifiesta que ha leído, entendido y aceptado estos Términos. Si no está de acuerdo con ellos, deberá abstenerse de utilizar CleanGo.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">2. ÁMBITO DE APLICACIÓN</h2>
            <p>Estos Términos son aplicables a administradores, supervisores, operadores de unidades recolectoras, ciudadanía, personal técnico autorizado y cualquier otra persona que utilice la Plataforma. Cuando un usuario actúe en nombre de una institución, declara contar con la autorización suficiente para aceptar estos Términos en su representación.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">3. DEFINICIONES</h2>
            <ul className="list-none space-y-3 mt-4">
              <li><strong className="text-white">Usuario:</strong> Persona física que accede, consulta o utiliza CleanGo.</li>
              <li><strong className="text-white">Plataforma:</strong> Ecosistema digital CleanGo, integrado por el Dashboard Web, las aplicaciones móviles, API, base de datos y servicios relacionados.</li>
              <li><strong className="text-white">Servicios:</strong> Funcionalidades ofrecidas por la Plataforma, incluyendo consulta de rutas, horarios, avisos, ubicación aproximada de unidades, notificaciones, reportes ciudadanos, incidencias, administración de rutas y reportes de operación.</li>
              <li><strong className="text-white">Cuenta:</strong> Credenciales personales de acceso asignadas a un usuario autorizado.</li>
              <li><strong className="text-white">Contenido del usuario:</strong> Información, textos, fotografías, ubicaciones o reportes proporcionados mediante la Plataforma.</li>
            </ul>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">4. USO AUTORIZADO DE LA PLATAFORMA</h2>
            <p>CleanGo deberá utilizarse exclusivamente para fines relacionados con la gestión, consulta y mejora del servicio de recolección de residuos. De acuerdo con el perfil de acceso autorizado, el usuario podrá consultar rutas, horarios y avisos; recibir alertas; registrar incidencias veraces; utilizar funciones operativas o administrativas autorizadas; y solicitar apoyo mediante los canales oficiales.</p>
            <p className="mt-4">El acceso a información operativa, administrativa o de geolocalización estará limitado al personal expresamente autorizado por la institución responsable.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">5. OBLIGACIONES Y CONDUCTAS PROHIBIDAS</h2>
            <p>El usuario se obliga a utilizar la Plataforma de manera lícita, responsable y conforme a estos Términos. En consecuencia, queda estrictamente prohibido:</p>
            <ol className="list-lower-alpha pl-6 space-y-3 mt-4">
              <li>Compartir, prestar, vender, transferir o permitir el uso de cuentas y contraseñas por terceros.</li>
              <li>Acceder, o intentar acceder, a cuentas, funciones o información sin autorización.</li>
              <li>Alterar, interferir, vulnerar, copiar, descompilar o afectar la seguridad, disponibilidad o funcionamiento de CleanGo.</li>
              <li>Registrar información falsa, suplantar identidades o modificar reportes, rutas, evidencias o ubicaciones.</li>
              <li>Cargar contenido ilegal, ofensivo, discriminatorio, amenazante, obsceno o que vulnere derechos de terceros.</li>
              <li>Usar la aplicación móvil durante la conducción cuando ello represente una distracción o contravenga las normas de seguridad vial.</li>
            </ol>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">6. REGISTRO, CUENTAS Y SEGURIDAD</h2>
            <p>Para acceder a determinadas funciones, el usuario deberá proporcionar información verdadera, completa y actualizada. El usuario es responsable de proteger sus credenciales, impedir el acceso de terceros a su Cuenta y notificar de inmediato cualquier uso no autorizado o incidente de seguridad.</p>
            <p className="mt-4">CleanGo podrá solicitar verificación de identidad, autorización institucional o información adicional antes de habilitar roles administrativos, de supervisión u operación.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">7. GEOLOCALIZACIÓN, REPORTES Y CONTENIDO DEL USUARIO</h2>
            <p>Cuando se utilicen funciones de geolocalización, registro de rutas, incidencias o evidencia fotográfica, el usuario reconoce que la Plataforma podrá tratar la información necesaria para prestar y mejorar el servicio. La ubicación de las unidades podrá ser aproximada, estar desactualizada o no estar disponible por conectividad, dispositivos GPS, permisos del equipo u otros factores técnicos.</p>
            <p className="mt-4">Los reportes ciudadanos deberán ser veraces, pertinentes y relacionados con el servicio. La institución responsable podrá revisar, clasificar, atender, descartar o canalizar los reportes conforme a su pertinencia, prioridad y capacidad operativa.</p>
            <p className="mt-4">El tratamiento de datos personales se sujetará al Aviso de Privacidad que corresponda a CleanGo o a la institución responsable.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">8. PROPIEDAD INTELECTUAL</h2>
            <p>El nombre CleanGo, sus interfaces, código fuente, diseño, logotipos, documentación, bases de datos, imágenes propias y demás elementos de la Plataforma pertenecen a BroDevs y/o a sus titulares legítimos. Ninguna disposición de estos Términos implica cesión de derechos de propiedad intelectual.</p>
            <p className="mt-4">Se concede al usuario una licencia limitada, personal, revocable, no exclusiva y no transferible para utilizar CleanGo conforme a estos Términos. El contenido generado por el usuario podrá ser utilizado por CleanGo y la institución responsable únicamente para operar, atender, analizar y mejorar el servicio, conforme a la normativa aplicable y al Aviso de Privacidad.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">9. DISPONIBILIDAD Y LIMITACIÓN DE RESPONSABILIDAD</h2>
            <p>CleanGo se proporciona como una herramienta tecnológica de apoyo. Aunque se adoptarán medidas razonables para mantener su funcionamiento, no se garantiza disponibilidad ininterrumpida, ausencia total de errores, precisión absoluta de los datos ni compatibilidad con todos los dispositivos, redes o servicios de terceros.</p>
            <p className="mt-4">CleanGo no sustituye los canales de emergencia. En situaciones urgentes o que impliquen riesgo para personas, bienes o salud, el usuario deberá comunicarse con los números de emergencia o autoridades competentes.</p>
            <p className="mt-4">CleanGo no será responsable por interrupciones causadas por fallas de internet, energía, GPS, dispositivos, servicios de terceros o mantenimiento; por el uso indebido de la Plataforma; por contenido generado por usuarios; ni por la falta de prestación del servicio de recolección atribuible a causas ajenas a la Plataforma.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">10. SUSPENSIÓN Y CANCELACIÓN DE CUENTAS</h2>
            <p>CleanGo podrá suspender, limitar o cancelar una Cuenta, temporal o permanentemente, cuando se incumplan estos Términos; se detecte actividad fraudulenta, ilegal o que comprometa la seguridad; se proporcione información falsa; se use una Cuenta sin autorización; exista una instrucción de la institución responsable; o la cuenta operativa o administrativa deje de estar autorizada.</p>
            <p className="mt-4">Cuando sea razonablemente posible, se informará al usuario la causa de la medida y el medio disponible para solicitar una revisión.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">11. MODIFICACIONES A LOS TÉRMINOS</h2>
            <p>CleanGo podrá actualizar estos Términos por cambios técnicos, operativos, legales o de seguridad. Las modificaciones se publicarán en la Plataforma o se comunicarán mediante un medio razonable. El uso continuado de CleanGo después de la entrada en vigor de los cambios constituirá aceptación de la versión actualizada.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">12. LEY APLICABLE Y JURISDICCIÓN</h2>
            <p>Estos Términos se rigen por las leyes aplicables de los Estados Unidos Mexicanos y, cuando corresponda, por la normativa del Estado de Chiapas. Para cualquier controversia, las partes se someten a las autoridades competentes de Ocosingo, Chiapas, salvo que una disposición legal obligatoria establezca una jurisdicción distinta.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">13. CONTACTO</h2>
            <p>Para dudas, comentarios, solicitudes o reportes relacionados con estos Términos, el usuario podrá comunicarse a:</p>
            <div className="bg-white/5 p-6 rounded-lg border border-white/10 mt-6 space-y-3">
              <p><strong className="text-white">Responsable:</strong> BroDevs / [Carlos Leodan Hernández Hernández]</p>
              <p><strong className="text-white">Correo electrónico:</strong> <a href="mailto:cleangobrodev@gmail.com" className="text-brand-soft hover:underline">cleangobrodev@gmail.com</a></p>
              <p><strong className="text-white">Domicilio:</strong> Prol 2da Sur Poniente S/N Barrio San Sebastián</p>
              <p><strong className="text-white">Teléfono:</strong> <a href="tel:9192093257" className="text-brand-soft hover:underline">9192093257</a></p>
            </div>
          </section>

          <section className="bg-brand-soft/10 p-6 rounded-lg border border-brand-soft/20 mt-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-soft"></div>
            <h3 className="text-lg font-display font-semibold text-white mb-2">14. DISPOSICIÓN FINAL</h3>
            <p className="text-sm">Este documento constituye un borrador formal para fines académicos y operativos. Antes de su publicación o implementación, deberá ser revisado y aprobado por la institución responsable y, de ser necesario, por asesoría jurídica, especialmente respecto del tratamiento de datos de ubicación, fotografías y datos personales.</p>
          </section>

        </article>
      </div>
      <Footer />
    </div>
  );
}
