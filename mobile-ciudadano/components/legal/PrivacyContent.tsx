// mobile-ciudadano/components/legal/PrivacyContent.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const T = {
  textH: '#0F172A',
  text: '#475569',
  border: '#E2E8F0',
};

export function PrivacyContent() {
  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Política de Privacidad</Text>
      
      <View style={styles.metaBox}>
        <Text style={styles.metaText}>CleanGo — Plataforma tecnológica para la gestión del servicio de recolección de residuos sólidos urbanos</Text>
        <Text style={styles.metaText}><Text style={styles.bold}>Elaborado por:</Text> BroDevs</Text>
        <Text style={styles.metaText}><Text style={styles.bold}>Ámbito de operación:</Text> Ocosingo, Chiapas, México</Text>
        <Text style={styles.metaText}><Text style={styles.bold}>Versión:</Text> 1.0   |   <Text style={styles.bold}>Fecha de emisión:</Text> 02/08/2026</Text>
      </View>

      <Section title="1. RESPONSABLE DEL TRATAMIENTO">
        <Paragraph>[Nombre completo de la institución responsable], con domicilio en [domicilio], es responsable del tratamiento de los datos personales recabados mediante CleanGo, plataforma tecnológica desarrollada por BroDevs para apoyar la planeación, seguimiento y comunicación del servicio de recolección de residuos sólidos urbanos en [municipio o zona de operación].</Paragraph>
        <Paragraph>Para efectos de esta Política, CleanGo podrá actuar como proveedor tecnológico y encargado del tratamiento, cuando procese datos por cuenta de la institución responsable. El usuario podrá contactar al responsable mediante [correo de privacidad o soporte] y [teléfono, opcional].</Paragraph>
      </Section>

      <Divider />

      <Section title="2. INFORMACIÓN RECOPILADA">
        <Paragraph>CleanGo podrá recopilar, según la función utilizada y el perfil del usuario, los siguientes datos:</Paragraph>
        <ListItem><Text style={styles.bold}>Datos de identificación y contacto:</Text> nombre, correo electrónico, número telefónico, usuario, rol y datos institucionales de autorización.</ListItem>
        <ListItem><Text style={styles.bold}>Datos de acceso:</Text> identificadores de cuenta, registros de inicio de sesión, dirección IP, tipo de dispositivo y bitácoras de actividad.</ListItem>
        <ListItem><Text style={styles.bold}>Datos de ubicación:</Text> ubicación aproximada o precisa de unidades, dispositivos autorizados y reportes georreferenciados, cuando el usuario conceda los permisos correspondientes o la función operativa lo requiera.</ListItem>
        <ListItem><Text style={styles.bold}>Datos operativos:</Text> rutas, horarios, puntos de control, incidencias, estados de servicio, evidencias y registros de operación.</ListItem>
        <ListItem><Text style={styles.bold}>Contenido proporcionado por el usuario:</Text> textos, fotografías, comentarios y datos incluidos en reportes ciudadanos u operativos.</ListItem>
        <ListItem><Text style={styles.bold}>Datos técnicos:</Text> versión de la aplicación, sistema operativo, errores, rendimiento y datos necesarios para garantizar seguridad y funcionamiento.</ListItem>
        <Paragraph>CleanGo procurará limitar la recopilación de datos a aquellos que sean pertinentes y necesarios para las finalidades descritas en esta Política.</Paragraph>
      </Section>

      <Divider />

      <Section title="3. FINALIDAD DEL TRATAMIENTO">
        <Paragraph>Los datos personales y operativos serán tratados para las siguientes finalidades primarias:</Paragraph>
        <ListItem>Crear, administrar y proteger las cuentas de usuario.</ListItem>
        <ListItem>Brindar las funciones de consulta de rutas, horarios, avisos y alertas del servicio de recolección.</ListItem>
        <ListItem>Registrar, gestionar y dar seguimiento a reportes e incidencias.</ListItem>
        <ListItem>Coordinar la operación de rutas, unidades, operadores, supervisores y puntos de control autorizados.</ListItem>
        <ListItem>Generar reportes, indicadores y análisis necesarios para la mejora del servicio.</ListItem>
        <ListItem>Atender solicitudes de soporte, seguridad, auditoría, prevención de uso indebido y cumplimiento de obligaciones aplicables.</ListItem>
        <Paragraph>De manera adicional, la información podrá utilizarse para elaborar estadísticas, análisis de desempeño y mejoras de la Plataforma, procurando aplicar medidas de disociación o anonimización cuando sea posible.</Paragraph>
      </Section>

      <Divider />

      <Section title="4. BASE LEGAL">
        <Paragraph>El tratamiento de los datos se realizará conforme a la legislación mexicana aplicable en materia de protección de datos personales y, según corresponda, con base en:</Paragraph>
        <ListItem>El consentimiento del titular, cuando sea requerido.</ListItem>
        <ListItem>La relación entre el usuario y la Plataforma para prestar los Servicios solicitados.</ListItem>
        <ListItem>El cumplimiento de obligaciones legales, regulatorias, de seguridad o de interés público aplicables a la institución responsable.</ListItem>
        <ListItem>El ejercicio de atribuciones de una autoridad municipal, cuando el responsable sea un sujeto obligado.</ListItem>
        <Paragraph>Cuando se requiera consentimiento para una finalidad específica, este se solicitará mediante mecanismos claros dentro de la Plataforma o por el medio que determine el responsable.</Paragraph>
      </Section>

      <Divider />

      <Section title="5. COMPARTICIÓN DE INFORMACIÓN">
        <Paragraph>CleanGo no venderá ni comercializará datos personales. Los datos podrán compartirse únicamente cuando sea necesario con:</Paragraph>
        <ListItem>La institución responsable del servicio de recolección y su personal autorizado.</ListItem>
        <ListItem>BroDevs y proveedores tecnológicos que presten servicios de alojamiento, mantenimiento, cartografía, notificaciones, análisis o soporte, bajo instrucciones del responsable y medidas de confidencialidad y seguridad.</ListItem>
        <ListItem>Autoridades competentes, cuando exista una obligación legal, requerimiento fundado o sea necesario para proteger derechos, seguridad o integridad de las personas.</ListItem>
        <Paragraph>Cualquier transferencia o comunicación de datos se realizará conforme a la normativa aplicable y bajo las medidas de protección que correspondan.</Paragraph>
      </Section>

      <Divider />

      <Section title="6. SEGURIDAD">
        <Paragraph>CleanGo implementará medidas administrativas, técnicas y físicas razonables para proteger los datos personales contra pérdida, alteración, acceso no autorizado, uso indebido, divulgación o destrucción.</Paragraph>
        <Paragraph>Entre estas medidas podrán incluirse controles de acceso por roles, contraseñas, cifrado en tránsito cuando sea aplicable, bitácoras de actividad, respaldos, actualizaciones de seguridad, revisión de permisos y procedimientos de atención a incidentes.</Paragraph>
        <Paragraph>No obstante, ningún sistema tecnológico puede garantizar seguridad absoluta. En caso de que se identifique una vulneración relevante que afecte de forma significativa los derechos de los titulares, el responsable actuará conforme a las obligaciones de notificación aplicables.</Paragraph>
      </Section>

      <Divider />

      <Section title="7. DERECHOS DEL USUARIO">
        <Paragraph>El titular de los datos podrá ejercer, según corresponda, sus derechos de acceso, rectificación, cancelación y oposición al tratamiento de sus datos personales, así como solicitar información sobre su tratamiento y revocar su consentimiento cuando legalmente proceda.</Paragraph>
        <Paragraph>Para ejercer estos derechos, deberá enviar una solicitud a cleangobrodev@gmail.com, indicando:</Paragraph>
        <ListItem>Nombre del titular y medio para comunicar la respuesta.</ListItem>
        <ListItem>Descripción clara del derecho que desea ejercer.</ListItem>
        <ListItem>Información que permita localizar los datos objeto de la solicitud.</ListItem>
        <ListItem>Documento o medio que acredite su identidad o representación, cuando sea necesario.</ListItem>
        <Paragraph>La solicitud será atendida dentro de los plazos y mediante el procedimiento establecido por la legislación aplicable. Cuando CleanGo opere para una institución municipal, el usuario también podrá utilizar los mecanismos de la Unidad de Transparencia correspondiente.</Paragraph>
      </Section>

      <Divider />

      <Section title="8. CONSERVACIÓN DE DATOS">
        <Paragraph>Los datos personales se conservarán durante el tiempo necesario para cumplir las finalidades descritas, atender responsabilidades, resolver controversias, dar seguimiento a reportes y cumplir obligaciones legales o administrativas.</Paragraph>
        <Paragraph>Los registros operativos podrán mantenerse durante los periodos definidos por la institución responsable, sus políticas internas y la normativa aplicable. Una vez concluido el periodo de conservación, los datos serán eliminados, bloqueados, anonimizados o sometidos a los procedimientos que correspondan.</Paragraph>
      </Section>

      <Divider />

      <Section title="9. USO DE COOKIES Y TECNOLOGÍAS SIMILARES">
        <Paragraph>El sitio web o Dashboard de CleanGo podrá utilizar cookies, almacenamiento local u otras tecnologías similares para mantener sesiones, recordar preferencias, mejorar el funcionamiento, proteger la seguridad y obtener información técnica sobre el uso de la Plataforma.</Paragraph>
        <Paragraph>El usuario podrá configurar su navegador para rechazar o eliminar cookies. Sin embargo, deshabilitarlas puede afectar el funcionamiento de ciertas funciones de CleanGo. La aplicación móvil podrá utilizar almacenamiento local y permisos del dispositivo únicamente para las funciones autorizadas por el usuario y necesarias para prestar el Servicio.</Paragraph>
      </Section>

      <Divider />

      <Section title="10. CAMBIOS A ESTA POLÍTICA">
        <Paragraph>El responsable podrá actualizar esta Política de Privacidad debido a cambios legales, técnicos, operativos o de seguridad. Las modificaciones se publicarán en la Plataforma o se comunicarán mediante un medio razonable.</Paragraph>
        <Paragraph>La versión vigente estará disponible en esta ruta dentro de la aplicación, indicando su fecha de última actualización. Se recomienda al usuario revisar esta Política periódicamente.</Paragraph>
      </Section>

      <Divider />

      <Section title="11. CONTACTO">
        <Paragraph>Para dudas, comentarios, solicitudes relacionadas con datos personales o para ejercer sus derechos, el usuario podrá comunicarse a:</Paragraph>
        <View style={styles.contactBox}>
          <Text style={styles.contactText}><Text style={styles.bold}>Responsable:</Text> BroDevs / [Carlos Leodan Hernández Hernández]</Text>
          <Text style={styles.contactText}><Text style={styles.bold}>Correo electrónico:</Text> cleangobrodev@gmail.com</Text>
          <Text style={styles.contactText}><Text style={styles.bold}>Domicilio:</Text> Prol 2da Sur Poniente S/N Barrio San Sebastián</Text>
          <Text style={styles.contactText}><Text style={styles.bold}>Teléfono:</Text> 9987577829</Text>
        </View>
      </Section>

      <View style={styles.finalBox}>
        <Text style={styles.finalTitle}>DISPOSICIÓN FINAL</Text>
        <Text style={styles.finalText}>Este documento es un borrador formal para fines académicos y operativos. Antes de su publicación, deberá ser revisado y aprobado por la institución que determine los fines del tratamiento y por asesoría jurídica, particularmente porque CleanGo puede manejar datos de ubicación, evidencias fotográficas y reportes ciudadanos.</Text>
      </View>
    </View>
  );
}

// ─── Componentes Auxiliares ──────────────────────────────

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.listText}>{children}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ─── Estilos ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: T.textH,
    marginBottom: 16,
  },
  metaBox: {
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: T.border,
  },
  metaText: {
    fontSize: 13,
    color: T.text,
    marginBottom: 6,
    lineHeight: 18,
  },
  bold: {
    fontWeight: 'bold',
    color: T.textH,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: T.textH,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: T.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 14,
    color: T.text,
    marginRight: 8,
    lineHeight: 22,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: T.text,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginVertical: 24,
  },
  contactBox: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    marginTop: 8,
  },
  contactText: {
    fontSize: 14,
    color: T.text,
    marginBottom: 6,
  },
  finalBox: {
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginTop: 32,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  finalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#3730A3',
    marginBottom: 8,
  },
  finalText: {
    fontSize: 13,
    color: '#4F46E5',
    lineHeight: 20,
  },
});
