import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Footer from '../welcome/components/Footer';

export function PrivacyPolicyPage() {
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/';
  const backLabel = from === '/login' ? 'Volver al login' : 'Volver al inicio';

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Política de Privacidad - CleanGo';
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Política de Privacidad de CleanGo, plataforma tecnológica para la gestión del servicio de recolección de residuos sólidos urbanos.');
    
    // Cleanup is optional but good practice if we want to revert, though usually it's fine to leave it
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
            Política de Privacidad
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
            <h2 className="text-2xl font-display font-semibold text-white mb-4">1. RESPONSABLE DEL TRATAMIENTO</h2>
            <p>[Nombre completo de la institución responsable], con domicilio en [domicilio], es responsable del tratamiento de los datos personales recabados mediante CleanGo, plataforma tecnológica desarrollada por BroDevs para apoyar la planeación, seguimiento y comunicación del servicio de recolección de residuos sólidos urbanos en [municipio o zona de operación].</p>
            <p className="mt-4">Para efectos de esta Política, CleanGo podrá actuar como proveedor tecnológico y encargado del tratamiento, cuando procese datos por cuenta de la institución responsable. El usuario podrá contactar al responsable mediante [correo de privacidad o soporte] y [teléfono, opcional].</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">2. INFORMACIÓN RECOPILADA</h2>
            <p>CleanGo podrá recopilar, según la función utilizada y el perfil del usuario, los siguientes datos:</p>
            <ul className="list-disc pl-6 space-y-3 mt-4">
              <li><strong className="text-white">Datos de identificación y contacto:</strong> nombre, correo electrónico, número telefónico, usuario, rol y datos institucionales de autorización.</li>
              <li><strong className="text-white">Datos de acceso:</strong> identificadores de cuenta, registros de inicio de sesión, dirección IP, tipo de dispositivo y bitácoras de actividad.</li>
              <li><strong className="text-white">Datos de ubicación:</strong> ubicación aproximada o precisa de unidades, dispositivos autorizados y reportes georreferenciados, cuando el usuario conceda los permisos correspondientes o la función operativa lo requiera.</li>
              <li><strong className="text-white">Datos operativos:</strong> rutas, horarios, puntos de control, incidencias, estados de servicio, evidencias y registros de operación.</li>
              <li><strong className="text-white">Contenido proporcionado por el usuario:</strong> textos, fotografías, comentarios y datos incluidos en reportes ciudadanos u operativos.</li>
              <li><strong className="text-white">Datos técnicos:</strong> versión de la aplicación, sistema operativo, errores, rendimiento y datos necesarios para garantizar seguridad y funcionamiento.</li>
            </ul>
            <p className="mt-4">CleanGo procurará limitar la recopilación de datos a aquellos que sean pertinentes y necesarios para las finalidades descritas en esta Política.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">3. FINALIDAD DEL TRATAMIENTO</h2>
            <p>Los datos personales y operativos serán tratados para las siguientes finalidades primarias:</p>
            <ul className="list-disc pl-6 space-y-3 mt-4">
              <li>Crear, administrar y proteger las cuentas de usuario.</li>
              <li>Brindar las funciones de consulta de rutas, horarios, avisos y alertas del servicio de recolección.</li>
              <li>Registrar, gestionar y dar seguimiento a reportes e incidencias.</li>
              <li>Coordinar la operación de rutas, unidades, operadores, supervisores y puntos de control autorizados.</li>
              <li>Generar reportes, indicadores y análisis necesarios para la mejora del servicio.</li>
              <li>Atender solicitudes de soporte, seguridad, auditoría, prevención de uso indebido y cumplimiento de obligaciones aplicables.</li>
            </ul>
            <p className="mt-4">De manera adicional, la información podrá utilizarse para elaborar estadísticas, análisis de desempeño y mejoras de la Plataforma, procurando aplicar medidas de disociación o anonimización cuando sea posible.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">4. BASE LEGAL</h2>
            <p>El tratamiento de los datos se realizará conforme a la legislación mexicana aplicable en materia de protección de datos personales y, según corresponda, con base en:</p>
            <ul className="list-disc pl-6 space-y-3 mt-4">
              <li>El consentimiento del titular, cuando sea requerido.</li>
              <li>La relación entre el usuario y la Plataforma para prestar los Servicios solicitados.</li>
              <li>El cumplimiento de obligaciones legales, regulatorias, de seguridad o de interés público aplicables a la institución responsable.</li>
              <li>El ejercicio de atribuciones de una autoridad municipal, cuando el responsable sea un sujeto obligado.</li>
            </ul>
            <p className="mt-4">Cuando se requiera consentimiento para una finalidad específica, este se solicitará mediante mecanismos claros dentro de la Plataforma o por el medio que determine el responsable.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">5. COMPARTICIÓN DE INFORMACIÓN</h2>
            <p>CleanGo no venderá ni comercializará datos personales. Los datos podrán compartirse únicamente cuando sea necesario con:</p>
            <ul className="list-disc pl-6 space-y-3 mt-4">
              <li>La institución responsable del servicio de recolección y su personal autorizado.</li>
              <li>BroDevs y proveedores tecnológicos que presten servicios de alojamiento, mantenimiento, cartografía, notificaciones, análisis o soporte, bajo instrucciones del responsable y medidas de confidencialidad y seguridad.</li>
              <li>Autoridades competentes, cuando exista una obligación legal, requerimiento fundado o sea necesario para proteger derechos, seguridad o integridad de las personas.</li>
            </ul>
            <p className="mt-4">Cualquier transferencia o comunicación de datos se realizará conforme a la normativa aplicable y bajo las medidas de protección que correspondan.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">6. SEGURIDAD</h2>
            <p>CleanGo implementará medidas administrativas, técnicas y físicas razonables para proteger los datos personales contra pérdida, alteración, acceso no autorizado, uso indebido, divulgación o destrucción.</p>
            <p className="mt-4">Entre estas medidas podrán incluirse controles de acceso por roles, contraseñas, cifrado en tránsito cuando sea aplicable, bitácoras de actividad, respaldos, actualizaciones de seguridad, revisión de permisos y procedimientos de atención a incidentes.</p>
            <p className="mt-4">No obstante, ningún sistema tecnológico puede garantizar seguridad absoluta. En caso de que se identifique una vulneración relevante que afecte de forma significativa los derechos de los titulares, el responsable actuará conforme a las obligaciones de notificación aplicables.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">7. DERECHOS DEL USUARIO</h2>
            <p>El titular de los datos podrá ejercer, según corresponda, sus derechos de acceso, rectificación, cancelación y oposición al tratamiento de sus datos personales, así como solicitar información sobre su tratamiento y revocar su consentimiento cuando legalmente proceda.</p>
            <p className="mt-4">Para ejercer estos derechos, deberá enviar una solicitud a <a href="mailto:cleangobrodev@gmail.com" className="text-white hover:text-brand-soft transition-colors font-medium">cleangobrodev@gmail.com</a>, indicando:</p>
            <ul className="list-disc pl-6 space-y-3 mt-4">
              <li>Nombre del titular y medio para comunicar la respuesta.</li>
              <li>Descripción clara del derecho que desea ejercer.</li>
              <li>Información que permita localizar los datos objeto de la solicitud.</li>
              <li>Documento o medio que acredite su identidad o representación, cuando sea necesario.</li>
            </ul>
            <p className="mt-4">La solicitud será atendida dentro de los plazos y mediante el procedimiento establecido por la legislación aplicable. Cuando CleanGo opere para una institución municipal, el usuario también podrá utilizar los mecanismos de la Unidad de Transparencia correspondiente.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">8. CONSERVACIÓN DE DATOS</h2>
            <p>Los datos personales se conservarán durante el tiempo necesario para cumplir las finalidades descritas, atender responsabilidades, resolver controversias, dar seguimiento a reportes y cumplir obligaciones legales o administrativas.</p>
            <p className="mt-4">Los registros operativos podrán mantenerse durante los periodos definidos por la institución responsable, sus políticas internas y la normativa aplicable. Una vez concluido el periodo de conservación, los datos serán eliminados, bloqueados, anonimizados o sometidos a los procedimientos que correspondan.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">9. USO DE COOKIES Y TECNOLOGÍAS SIMILARES</h2>
            <p>El sitio web o Dashboard de CleanGo podrá utilizar cookies, almacenamiento local u otras tecnologías similares para mantener sesiones, recordar preferencias, mejorar el funcionamiento, proteger la seguridad y obtener información técnica sobre el uso de la Plataforma.</p>
            <p className="mt-4">El usuario podrá configurar su navegador para rechazar o eliminar cookies. Sin embargo, deshabilitarlas puede afectar el funcionamiento de ciertas funciones de CleanGo. La aplicación móvil podrá utilizar almacenamiento local y permisos del dispositivo únicamente para las funciones autorizadas por el usuario y necesarias para prestar el Servicio.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">10. CAMBIOS A ESTA POLÍTICA</h2>
            <p>El responsable podrá actualizar esta Política de Privacidad debido a cambios legales, técnicos, operativos o de seguridad. Las modificaciones se publicarán en la Plataforma o se comunicarán mediante un medio razonable.</p>
            <p className="mt-4">La versión vigente estará disponible en esta ruta dentro de la aplicación, indicando su fecha de última actualización. Se recomienda al usuario revisar esta Política periódicamente.</p>
          </section>

          <hr className="border-white/10" />

          <section>
            <h2 className="text-2xl font-display font-semibold text-white mb-4">11. CONTACTO</h2>
            <p>Para dudas, comentarios, solicitudes relacionadas con datos personales o para ejercer sus derechos, el usuario podrá comunicarse a:</p>
            <div className="bg-white/5 p-6 rounded-lg border border-white/10 mt-6 space-y-3">
              <p><strong className="text-white">Responsable:</strong> BroDevs / [Carlos Leodan Hernández Hernández]</p>
              <p><strong className="text-white">Correo electrónico:</strong> <a href="mailto:cleangobrodev@gmail.com" className="text-brand-soft hover:underline">cleangobrodev@gmail.com</a></p>
              <p><strong className="text-white">Domicilio:</strong> Prol 2da Sur Poniente S/N Barrio San Sebastián</p>
              <p><strong className="text-white">Teléfono:</strong> <a href="tel:9987577829" className="text-brand-soft hover:underline">9987577829</a></p>
            </div>
          </section>

          <section className="bg-brand-soft/10 p-6 rounded-lg border border-brand-soft/20 mt-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-soft"></div>
            <h3 className="text-lg font-display font-semibold text-white mb-2">DISPOSICIÓN FINAL</h3>
            <p className="text-sm">Este documento es un borrador formal para fines académicos y operativos. Antes de su publicación, deberá ser revisado y aprobado por la institución que determine los fines del tratamiento y por asesoría jurídica, particularmente porque CleanGo puede manejar datos de ubicación, evidencias fotográficas y reportes ciudadanos.</p>
          </section>

        </article>
      </div>
      <Footer />
    </div>
  );
}
