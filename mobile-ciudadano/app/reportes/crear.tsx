import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, MapPin, X, ArrowLeft, Upload, MapPinned, AlertCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { reportesService } from '../../services/reportesService';
import { obtenerUbicacionActual } from '../../services/locationService';
import { AnimatedPressable } from '../../components/ui';
import { useAlert } from '../../contexts/AlertContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const T = {
  primary: '#1763A6',
  bgPage: '#F1F5F9',
  bgCard: '#FFFFFF',
  textH: '#0F172A',
  text: '#475569',
  border: '#E2E8F0',
  muted: '#94A3B8',
  danger: '#EF4444',
  success: '#10B981',
};

const TIPOS_REPORTE = [
  { id: 'Basura acumulada', label: 'Basura acumulada', icon: '🗑️' },
  { id: 'Camión no pasó', label: 'Camión que no pasó', icon: '🚛' },
  { id: 'Contenedor lleno', label: 'Contenedor lleno', icon: '🗑️' },
  { id: 'Calles contaminadas', label: 'Calle contaminada', icon: '🛣️' },
];

export default function CrearReporteScreen() {
  const router = useRouter();
  const { showSuccess, showError, showWarning } = useAlert();
  
  const [tipo, setTipo] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [direccionReferencia, setDireccionReferencia] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showWarning(
        'Permiso denegado',
        'Necesitamos acceso a tu cámara para capturar la foto de evidencia.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.6,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showWarning(
        'Permiso denegado',
        'Necesitamos acceso a tu galería para seleccionar la fotografía.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.6,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const getLocation = async () => {
    setIsGettingLocation(true);
    setLocationError(null);
    try {
      const result = await obtenerUbicacionActual();
      if (result.error || !result.location) {
        setLocationError(result.error || 'Error al obtener la ubicación.');
      } else {
        setLocation(result.location);
        setLocationError(null);
      }
    } catch (err: any) {
      setLocationError(err?.message || 'Error al obtener la ubicación.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSubmit = async () => {
    if (!tipo) {
      showWarning(
        'Tipo de reporte requerido',
        'Por favor selecciona un tipo de problema antes de enviar el reporte.'
      );
      return;
    }
    if (!location) {
      showWarning(
        'Ubicación requerida',
        'Por favor obtén tu ubicación GPS actual antes de enviar el reporte.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      let fotografiaData = null;

      if (imageUri) {
        const rawFilename = imageUri.split('/').pop() || `reporte_${Date.now()}.jpg`;
        const extensionMatch = /\.(\w+)$/.exec(rawFilename);
        const rawExt = extensionMatch ? extensionMatch[1].toLowerCase() : 'jpg';

        let mimeType = 'image/jpeg';
        let finalExtension = 'jpg';

        if (rawExt === 'png') {
          mimeType = 'image/png';
          finalExtension = 'png';
        } else if (rawExt === 'webp') {
          mimeType = 'image/webp';
          finalExtension = 'webp';
        } else {
          mimeType = 'image/jpeg';
          finalExtension = 'jpg';
        }

        const baseName = rawFilename.replace(/\.[^/.]+$/, '') || 'fotografia';
        const safeFilename = `${baseName}.${finalExtension}`;

        fotografiaData = {
          uri: imageUri,
          name: safeFilename,
          type: mimeType,
        };
      }

      await reportesService.crearReporte({
        tipo_reporte: tipo,
        latitud: location.coords.latitude,
        longitud: location.coords.longitude,
        descripcion: descripcion.trim() || undefined,
        direccion_referencia: direccionReferencia.trim() || undefined,
        fotografia: fotografiaData,
      });

      showSuccess(
        '¡Reporte enviado!',
        'Tu reporte ha sido recibido correctamente. El equipo municipal dará seguimiento a tu solicitud.',
        () => router.back(),
        { confirmText: 'Aceptar' }
      );
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Ocurrió un problema al enviar el reporte. Intenta de nuevo.';
      showError('Error al enviar', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Regresar"
        >
          <ArrowLeft size={20} color={T.textH} strokeWidth={2.2} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Nuevo Reporte</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Tipo de Reporte */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. ¿Qué problema deseas reportar? *</Text>
            <View style={styles.typesGrid}>
              {TIPOS_REPORTE.map((t) => (
                <AnimatedPressable
                  key={t.id}
                  style={[
                    styles.typeCard,
                    tipo === t.id && styles.typeCardActive
                  ]}
                  onPress={() => setTipo(t.id)}
                >
                  <Text style={styles.typeIcon}>{t.icon}</Text>
                  <Text style={[styles.typeLabel, tipo === t.id && styles.typeLabelActive]}>
                    {t.label}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </View>

          {/* Fotografía */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Evidencia (Opcional)</Text>
            {tipo === 'Camión no pasó' ? (
              <View style={styles.infoBox}>
                <AlertCircle size={20} color={T.primary} />
                <Text style={styles.infoText}>
                  La evidencia fotográfica no es necesaria para este tipo de reporte.
                </Text>
              </View>
            ) : imageUri ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <AnimatedPressable 
                  style={styles.removeImageBtn}
                  onPress={() => setImageUri(null)}
                >
                  <X size={20} color="#FFF" />
                </AnimatedPressable>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <AnimatedPressable style={styles.photoBtn} onPress={takePhoto}>
                  <Camera size={24} color={T.primary} />
                  <Text style={styles.photoBtnText}>Tomar Foto</Text>
                </AnimatedPressable>
                <AnimatedPressable style={styles.photoBtn} onPress={pickImage}>
                  <Upload size={24} color={T.primary} />
                  <Text style={styles.photoBtnText}>Galería</Text>
                </AnimatedPressable>
              </View>
            )}
          </View>

          {/* Ubicación */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Ubicación del problema *</Text>
            <View style={styles.locationContainer}>
              {location ? (
                <Animated.View
                  entering={FadeInDown.duration(250)}
                  style={styles.locationSuccess}
                >
                  <MapPin size={24} color={T.success} />
                  <Text style={styles.locationText}>
                    Ubicación obtenida ({location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)})
                  </Text>
                </Animated.View>
              ) : (
                <AnimatedPressable 
                  style={[styles.locationBtn, locationError ? styles.locationBtnError : null]} 
                  onPress={getLocation}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <ActivityIndicator size="small" color={T.primary} />
                  ) : (
                    <MapPinned size={24} color={locationError ? T.danger : T.primary} />
                  )}
                  <Text style={[styles.locationBtnText, locationError ? {color: T.danger} : null]}>
                    {locationError || 'Obtener mi ubicación actual'}
                  </Text>
                </AnimatedPressable>
              )}
            </View>
          </View>

          {/* Dirección de referencia */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Dirección de referencia (Opcional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej: Calle 5 de Mayo, frente al parque central..."
              placeholderTextColor={T.muted}
              value={direccionReferencia}
              onChangeText={setDireccionReferencia}
              maxLength={200}
            />
          </View>

          {/* Comentarios */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Comentarios adicionales</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe más detalles sobre el problema..."
              placeholderTextColor={T.muted}
              multiline
              numberOfLines={4}
              value={descripcion}
              onChangeText={setDescripcion}
              maxLength={300}
            />
            <Text style={styles.charCount}>{descripcion.length}/300</Text>
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <AnimatedPressable 
            style={[
              styles.submitBtn, 
              (!tipo || !location || isSubmitting) && styles.submitBtnDisabled
            ]}
            onPress={handleSubmit}
            disabled={!tipo || !location || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Enviar Reporte</Text>
            )}
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: T.bgCard,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.bgCard,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textH,
  },
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 80,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: T.textH,
    marginBottom: 12,
  },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeCard: {
    width: '48%',
    backgroundColor: T.bgCard,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  typeCardActive: {
    borderColor: T.primary,
    backgroundColor: `${T.primary}05`,
  },
  typeIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 13,
    color: T.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  typeLabelActive: {
    color: T.primary,
    fontWeight: '700',
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.bgCard,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  photoBtnText: {
    marginLeft: 8,
    fontSize: 15,
    color: T.primary,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${T.primary}10`,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 14,
    color: T.primary,
    fontWeight: '500',
    flex: 1,
  },
  locationContainer: {
    backgroundColor: T.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  locationBtnError: {
    backgroundColor: `${T.danger}10`,
  },
  locationBtnText: {
    marginLeft: 12,
    fontSize: 15,
    color: T.primary,
    fontWeight: '600',
  },
  locationSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: `${T.success}10`,
  },
  locationText: {
    marginLeft: 12,
    fontSize: 14,
    color: T.success,
    fontWeight: '500',
    flex: 1,
  },
  textInput: {
    backgroundColor: T.bgCard,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: T.textH,
  },
  textArea: {
    backgroundColor: T.bgCard,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: T.textH,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: T.muted,
    marginTop: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: T.bgCard,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  submitBtn: {
    backgroundColor: T.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: T.muted,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
