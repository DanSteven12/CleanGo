// mobile-ciudadano/components/legal/TermsContent.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const T = {
  textH: '#0F172A',
  text: '#475569',
  border: '#E2E8F0',
};

export function TermsContent() {
  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Términos y Condiciones de Uso</Text>
      
      <View style={styles.metaBox}>
        <Text style={styles.metaText}>CleanGo — Plataforma tecnológica para la gestión del servicio de recolección de residuos sólidos urbanos</Text>
        <Text style={styles.metaText}><Text style={styles.bold}>Elaborado por:</Text> BroDevs</Text>
        <Text style={styles.metaText}><Text style={styles.bold}>Ámbito de operación:</Text> Ocosingo, Chiapas, México</Text>
        <Text style={styles.metaText}><Text style={styles.bold}>Versión:</Text> 1.0   |   <Text style={styles.bold}>Fecha de emisión:</Text> 02/08/2026</Text>
      </View>

      <Section title="1. OBJETO Y ACEPTACIÓN DE LOS TÉRMINOS">
        <Paragraph>Los presentes Términos y Condiciones de Uso (en lo sucesivo, los "Términos") regulan el acceso, registro y uso de CleanGo, plataforma tecnológica desarrollada por BroDevs para apoyar la planeación, seguimiento y comunicación del servicio de recolección de residuos sólidos urbanos en [municipio o zona de operación].</Paragraph>
        <Paragraph>CleanGo comprende un panel web para personal autorizado, una aplicación móvil para operadores de unidades recolectoras, una aplicación móvil ciudadana, así como los servicios técnicos, bases de datos, interfaces y funciones relacionadas.</Paragraph>
        <Paragraph>Toda persona que cree una cuenta, acceda o utilice la Plataforma manifiesta que ha leído, entendido y aceptado estos Términos. Si no está de acuerdo con ellos, deberá abstenerse de utilizar CleanGo.</Paragraph>
      </Section>

      <Divider />

      <Section title="2. ÁMBITO DE APLICACIÓN">
        <Paragraph>Estos Términos son aplicables a administradores, supervisores, operadores de unidades recolectoras, ciudadanía, personal técnico autorizado y cualquier otra persona que utilice la Plataforma. Cuando un usuario actúe en nombre de una institución, declara contar con la autorización suficiente para aceptar estos Términos en su representación.</Paragraph>
      </Section>

      <Divider />

      <Section title="3. DEFINICIONES">
        <ListItem><Text style={styles.bold}>Usuario:</Text> Persona física que accede, consulta o utiliza CleanGo.</ListItem>
        <ListItem><Text style={styles.bold}>Plataforma:</Text> Ecosistema digital CleanGo, integrado por el Dashboard Web, las aplicaciones móviles, API, base de datos y servicios relacionados.</ListItem>
        <ListItem><Text style={styles.bold}>Servicios:</Text> Funcionalidades ofrecidas por la Plataforma, incluyendo consulta de rutas, horarios, avisos, ubicación aproximada de unidades, notificaciones, reportes ciudadanos, incidencias, administración de rutas y reportes de operación.</ListItem>
        <ListItem><Text style={styles.bold}>Cuenta:</Text> Credenciales personales de acceso asignadas a un usuario autorizado.</ListItem>
        <ListItem><Text style={styles.bold}>Contenido del usuario:</Text> Información, textos, fotografías, ubicaciones o reportes proporcionados mediante la Plataforma.</ListItem>
      </Section>

      <Divider />

      <Section title="4. USO AUTORIZADO DE LA PLATAFORMA">
        <Paragraph>CleanGo deberá utilizarse exclusivamente para fines relacionados con la gestión, consulta y mejora del servicio de recolección de residuos. De acuerdo con el perfil de acceso autorizado, el usuario podrá consultar rutas, horarios y avisos; recibir alertas; registrar incidencias veraces; utilizar funciones operativas o administrativas autorizadas; y solicitar apoyo mediante los canales oficiales.</Paragraph>
        <Paragraph>El acceso a información operativa, administrativa o de geolocalización estará limitado al personal expresamente autorizado por la institución responsable.</Paragraph>
      </Section>

      <Divider />

      <Section title="5. OBLIGACIONES Y CONDUCTAS PROHIBIDAS">
        <Paragraph>El usuario se obliga a utilizar la Plataforma de manera lícita, responsable y conforme a estos Términos. En consecuencia, queda estrictamente prohibido:</Paragraph>
        <ListItem>a) Compartir, prestar, vender, transferir o permitir el uso de cuentas y contraseñas por terceros.</ListItem>
        <ListItem>b) Acceder, o intentar acceder, a cuentas, funciones o información sin autorización.</ListItem>
        <ListItem>c) Alterar, interferir, vulnerar, copiar, descompilar o afectar la seguridad, disponibilidad o funcionamiento de CleanGo.</ListItem>
        <ListItem>d) Registrar información falsa, suplantar identidades o modificar reportes, rutas, evidencias o ubicaciones.</ListItem>
        <ListItem>e) Cargar contenido ilegal, ofensivo, discriminatorio, amenazante, obsceno o que vulnere derechos de terceros.</ListItem>
        <ListItem>f) Usar la aplicación móvil durante la conducción cuando ello represente una distracción o contravenga las normas de seguridad vial.</ListItem>
      </Section>

      <Divider />

      <Section title="6. REGISTRO, CUENTAS Y SEGURIDAD">
        <Paragraph>Para acceder a determinadas funciones, el usuario deberá proporcionar información verdadera, completa y actualizada. El usuario es responsable de proteger sus credenciales, impedir el acceso de terceros a su Cuenta y notificar de inmediato cualquier uso no autorizado o incidente de seguridad.</Paragraph>
        <Paragraph>CleanGo podrá solicitar verificación de identidad, autorización institucional o información adicional antes de habilitar roles administrativos, de supervisión u operación.</Paragraph>
      </Section>

      <Divider />

      <Section title="7. GEOLOCALIZACIÓN, REPORTES Y CONTENIDO DEL USUARIO">
        <Paragraph>Cuando se utilicen funciones de geolocalización, registro de rutas, incidencias o evidencia fotográfica, el usuario reconoce que la Plataforma podrá tratar la información necesaria para prestar y mejorar el servicio. La ubicación de las unidades podrá ser aproximada, estar desactualizada o no estar disponible por conectividad, dispositivos GPS, permisos del equipo u otros factores técnicos.</Paragraph>
        <Paragraph>Los reportes ciudadanos deberán ser veraces, pertinentes y relacionados con el servicio. La institución responsable podrá revisar, clasificar, atender, descartar o canalizar los reportes conforme a su pertinencia, prioridad y capacidad operativa.</Paragraph>
        <Paragraph>El tratamiento de datos personales se sujetará al Aviso de Privacidad que corresponda a CleanGo o a la institución responsable.</Paragraph>
      </Section>

      <Divider />

      <Section title="8. PROPIEDAD INTELECTUAL">
        <Paragraph>El nombre CleanGo, sus interfaces, código fuente, diseño, logotipos, documentación, bases de datos, imágenes propias y demás elementos de la Plataforma pertenecen a BroDevs y/o a sus titulares legítimos. Ninguna disposición de estos Términos implica cesión de derechos de propiedad intelectual.</Paragraph>
        <Paragraph>Se concede al usuario una licencia limitada, personal, revocable, no exclusiva y no transferible para utilizar CleanGo conforme a estos Términos. El contenido generado por el usuario podrá ser utilizado por CleanGo y la institución responsable únicamente para operar, atender, analizar y mejorar el servicio, conforme a la normativa aplicable y al Aviso de Privacidad.</Paragraph>
      </Section>

      <Divider />

      <Section title="9. DISPONIBILIDAD Y LIMITACIÓN DE RESPONSABILIDAD">
        <Paragraph>CleanGo se proporciona como una herramienta tecnológica de apoyo. Aunque se adoptarán medidas razonables para mantener su funcionamiento, no se garantiza disponibilidad ininterrumpida, ausencia total de errores, precisión absoluta de los datos ni compatibilidad con todos los dispositivos, redes o servicios de terceros.</Paragraph>
        <Paragraph>CleanGo no sustituye los canales de emergencia. En situaciones urgentes o que impliquen riesgo para personas, bienes o salud, el usuario deberá comunicarse con los números de emergencia o autoridades competentes.</Paragraph>
        <Paragraph>CleanGo no será responsable por interrupciones causadas por fallas de internet, energía, GPS, dispositivos, servicios de terceros o mantenimiento; por el uso indebido de la Plataforma; por contenido generado por usuarios; ni por la falta de prestación del servicio de recolección atribuible a causas ajenas a la Plataforma.</Paragraph>
      </Section>

      <Divider />

      <Section title="10. SUSPENSIÓN Y CANCELACIÓN DE CUENTAS">
        <Paragraph>CleanGo podrá suspender, limitar o cancelar una Cuenta, temporal o permanentemente, cuando se incumplan estos Términos; se detecte actividad fraudulenta, ilegal o que comprometa la seguridad; se proporcione información falsa; se use una Cuenta sin autorización; exista una instrucción de la institución responsable; o la cuenta operativa o administrativa deje de estar autorizada.</Paragraph>
        <Paragraph>Cuando sea razonablemente posible, se informará al usuario la causa de la medida y el medio disponible para solicitar una revisión.</Paragraph>
      </Section>

      <Divider />

      <Section title="11. MODIFICACIONES A LOS TÉRMINOS">
        <Paragraph>CleanGo podrá actualizar estos Términos por cambios técnicos, operativos, legales o de seguridad. Las modificaciones se publicarán en la Plataforma o se comunicarán mediante un medio razonable. El uso continuado de CleanGo después de la entrada en vigor de los cambios constituirá aceptación de la versión actualizada.</Paragraph>
      </Section>

      <Divider />

      <Section title="12. LEY APLICABLE Y JURISDICCIÓN">
        <Paragraph>Estos Términos se rigen por las leyes aplicables de los Estados Unidos Mexicanos y, cuando corresponda, por la normativa del Estado de Chiapas. Para cualquier controversia, las partes se someten a las autoridades competentes de Ocosingo, Chiapas, salvo que una disposición legal obligatoria establezca una jurisdicción distinta.</Paragraph>
      </Section>

      <Divider />

      <Section title="13. CONTACTO">
        <Paragraph>Para dudas, comentarios, solicitudes o reportes relacionados con estos Términos, el usuario podrá comunicarse a:</Paragraph>
        <View style={styles.contactBox}>
          <Text style={styles.contactText}><Text style={styles.bold}>Responsable:</Text> BroDevs / [Carlos Leodan Hernández Hernández]</Text>
          <Text style={styles.contactText}><Text style={styles.bold}>Correo electrónico:</Text> cleangobrodev@gmail.com</Text>
          <Text style={styles.contactText}><Text style={styles.bold}>Domicilio:</Text> Prol 2da Sur Poniente S/N Barrio San Sebastián</Text>
          <Text style={styles.contactText}><Text style={styles.bold}>Teléfono:</Text> 9192093257</Text>
        </View>
      </Section>

      <View style={styles.finalBox}>
        <Text style={styles.finalTitle}>14. DISPOSICIÓN FINAL</Text>
        <Text style={styles.finalText}>Este documento constituye un borrador formal para fines académicos y operativos. Antes de su publicación o implementación, deberá ser revisado y aprobado por la institución responsable y, de ser necesario, por asesoría jurídica, especialmente respecto del tratamiento de datos de ubicación, fotografías y datos personales.</Text>
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
