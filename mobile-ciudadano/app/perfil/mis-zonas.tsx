// mobile-ciudadano/app/perfil/mis-zonas.tsx
/**
 * Pantalla de Zonas de Interés del ciudadano autenticado.
 *
 * Accede desde: Perfil → "Mis zonas"
 * Endpoints: GET/POST/PUT/DELETE /api/ciudadano/zonas
 *
 * Funcionalidad:
 *  - Lista las zonas registradas (máximo 3)
 *  - Crear zona usando GPS actual (expo-location)
 *  - Editar el alias de una zona existente
 *  - Eliminar una zona con confirmación
 *  - Activar/desactivar zona sin eliminarla
 *
 * Estados:
 *  - loading: ActivityIndicator centralizado
 *  - datos: lista de zonas con acciones
 *  - vacío: empty state con instrucción
 *  - error: mensaje + botón "Reintentar"
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MapPin,
  Plus,
  RefreshCw,
  AlertCircle,
  Pencil,
  Trash2,
  Navigation,
  MapPinned,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { zonasService, ZonaInteres } from '../../services/zonasService';

// ─── Design Tokens (idénticos al resto de la app) ─────────────────────────────

const T = {
  primary: '#1763A6',
  bgPage: '#F1F5F9',
  bgCard: '#FFFFFF',
  textH: '#0F172A',
  text: '#475569',
  border: '#E2E8F0',
  muted: '#94A3B8',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  success: '#10B981',
  successBg: '#F0FDF4',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
};

const MAX_ZONAS = 3;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCoords(latitud: string, longitud: string): string {
  const lat = parseFloat(latitud).toFixed(5);
  const lng = parseFloat(longitud).toFixed(5);
  return `${lat}, ${lng}`;
}

// ─── Componente: Tarjeta de Zona ──────────────────────────────────────────────

interface ZonaCardProps {
  item: ZonaInteres;
  onEdit: (zona: ZonaInteres) => void;
  onDelete: (zona: ZonaInteres) => void;
  onToggle: (zona: ZonaInteres) => void;
}

function ZonaCard({ item, onEdit, onDelete, onToggle }: ZonaCardProps) {
  const isActive = Boolean(item.activo);

  return (
    <View style={[styles.card, !isActive && styles.cardInactive]}>
      {/* Icono + Info */}
      <View style={styles.cardLeft}>
        <View style={[styles.cardIconBg, { backgroundColor: isActive ? '#EFF6FF' : '#F1F5F9' }]}>
          <MapPin size={22} color={isActive ? T.primary : T.muted} strokeWidth={2} />
        </View>
        <View style={styles.cardInfo}>
          <Text
            style={[styles.cardAlias, !isActive && { color: T.muted }]}
            numberOfLines={1}
          >
            {item.alias}
          </Text>
          <Text style={styles.cardCoords} numberOfLines={1}>
            📍 {formatCoords(item.latitud, item.longitud)}
          </Text>
          {!isActive && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Desactivada</Text>
            </View>
          )}
        </View>
      </View>

      {/* Acciones */}
      <View style={styles.cardActions}>
        {/* Toggle activo/inactivo */}
        <Switch
          value={isActive}
          onValueChange={() => onToggle(item)}
          trackColor={{ false: T.border, true: '#BFDBFE' }}
          thumbColor={isActive ? T.primary : T.muted}
          accessibilityLabel={isActive ? 'Desactivar zona' : 'Activar zona'}
        />
        {/* Editar alias */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onEdit(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Editar alias de ${item.alias}`}
        >
          <Pencil size={18} color={T.primary} strokeWidth={2} />
        </TouchableOpacity>
        {/* Eliminar */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar zona ${item.alias}`}
        >
          <Trash2 size={18} color={T.danger} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Modal: Crear / Editar Zona ───────────────────────────────────────────────

interface ZonaModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  zona: ZonaInteres | null;
  onClose: () => void;
  onSave: (alias: string, lat?: number, lng?: number) => void;
  saving: boolean;
}

function ZonaModal({ visible, mode, zona, onClose, onSave, saving }: ZonaModalProps) {
  const [alias, setAlias] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Inicializar alias cuando el modal se abre
  React.useEffect(() => {
    if (visible) {
      setAlias(mode === 'edit' && zona ? zona.alias : '');
      setCoords(null);
      setLocationLabel('');
    }
  }, [visible, mode, zona]);

  const handleGetLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación para guardar esta zona.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      setCoords({ lat: latitude, lng: longitude });
      setLocationLabel(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    } catch {
      Alert.alert('Error', 'No pudimos obtener tu ubicación. Intenta de nuevo.');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSave = () => {
    const trimmedAlias = alias.trim();
    if (mode === 'create') {
      if (!coords) {
        Alert.alert('Ubicación requerida', 'Primero obtén tu ubicación GPS.');
        return;
      }
      onSave(trimmedAlias || 'Mi Domicilio', coords.lat, coords.lng);
    } else {
      onSave(trimmedAlias || 'Mi Domicilio');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop — tap para cerrar teclado y modal */}
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.modalSheet}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          {/* Scroll para que el input no quede bajo el teclado */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Text style={styles.modalTitle}>
              {mode === 'create' ? 'Agregar zona de interés' : 'Editar zona'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {mode === 'create'
                ? 'Registra una ubicación donde deseas recibir alertas del camión.'
                : 'Cambia el nombre de esta zona.'}
            </Text>

            {/* Campo alias */}
            <Text style={styles.fieldLabel}>Nombre de la zona</Text>
            <TextInput
              style={styles.textInput}
              value={alias}
              onChangeText={setAlias}
              placeholder="Ej: Mi Casa, Mi Trabajo..."
              placeholderTextColor={T.muted}
              maxLength={50}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              blurOnSubmit
              accessibilityLabel="Nombre o alias de la zona"
            />

            {/* Obtener GPS (solo en modo crear) */}
            {mode === 'create' && (
              <>
                <Text style={styles.fieldLabel}>Ubicación GPS</Text>
                <TouchableOpacity
                  style={[styles.gpsBtn, coords ? styles.gpsBtnSuccess : null]}
                  onPress={handleGetLocation}
                  disabled={gettingLocation}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Obtener mi ubicación actual"
                >
                  {gettingLocation ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Navigation size={18} color="#FFF" strokeWidth={2.5} />
                  )}
                  <Text style={styles.gpsBtnText}>
                    {gettingLocation
                      ? 'Obteniendo ubicación...'
                      : coords
                      ? '✓ Ubicación obtenida'
                      : 'Usar mi ubicación actual'}
                  </Text>
                </TouchableOpacity>
                {locationLabel ? (
                  <Text style={styles.coordsPreview}>📍 {locationLabel}</Text>
                ) : null}
              </>
            )}

            {/* Botones */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function MisZonasScreen() {
  const router = useRouter();

  const [zonas, setZonas] = useState<ZonaInteres[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedZona, setSelectedZona] = useState<ZonaInteres | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchZonas = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await zonasService.getZonas();
      setZonas(data);
    } catch {
      setError('No pudimos cargar tus zonas. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchZonas();
    }, [fetchZonas])
  );

  const handleRefresh = useCallback(() => {
    fetchZonas(true);
  }, [fetchZonas]);

  // ── Crear ─────────────────────────────────────────────────────────────────

  const handleOpenCreate = useCallback(() => {
    if (zonas.length >= MAX_ZONAS) {
      Alert.alert(
        'Límite alcanzado',
        `Solo puedes registrar un máximo de ${MAX_ZONAS} zonas de interés.`
      );
      return;
    }
    setModalMode('create');
    setSelectedZona(null);
    setModalVisible(true);
  }, [zonas.length]);

  // ── Editar ────────────────────────────────────────────────────────────────

  const handleOpenEdit = useCallback((zona: ZonaInteres) => {
    setModalMode('edit');
    setSelectedZona(zona);
    setModalVisible(true);
  }, []);

  // ── Guardar (crear o editar) ──────────────────────────────────────────────

  const handleSave = useCallback(async (alias: string, lat?: number, lng?: number) => {
    setSaving(true);
    try {
      if (modalMode === 'create' && lat !== undefined && lng !== undefined) {
        const nueva = await zonasService.crearZona({ alias, latitud: lat, longitud: lng });
        // Agregar a la lista local
        setZonas((prev) => [...prev, nueva as unknown as ZonaInteres]);
      } else if (modalMode === 'edit' && selectedZona) {
        await zonasService.actualizarZona(selectedZona.id, { alias });
        setZonas((prev) =>
          prev.map((z) => (z.id === selectedZona.id ? { ...z, alias } : z))
        );
      }
      setModalVisible(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'No se pudo guardar la zona. Intenta de nuevo.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [modalMode, selectedZona]);

  // ── Toggle activo ─────────────────────────────────────────────────────────

  const handleToggle = useCallback(async (zona: ZonaInteres) => {
    const nuevoActivo = !Boolean(zona.activo);
    // Actualizar localmente primero (optimistic update)
    setZonas((prev) =>
      prev.map((z) => (z.id === zona.id ? { ...z, activo: nuevoActivo ? 1 : 0 } : z))
    );
    try {
      await zonasService.actualizarZona(zona.id, { activo: nuevoActivo });
    } catch {
      // Revertir si falla
      setZonas((prev) =>
        prev.map((z) => (z.id === zona.id ? { ...z, activo: zona.activo } : z))
      );
      Alert.alert('Error', 'No se pudo cambiar el estado de la zona.');
    }
  }, []);

  // ── Eliminar ──────────────────────────────────────────────────────────────

  const handleDelete = useCallback((zona: ZonaInteres) => {
    Alert.alert(
      'Eliminar zona',
      `¿Estás seguro de que deseas eliminar "${zona.alias}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            // Eliminar localmente primero (optimistic update)
            setZonas((prev) => prev.filter((z) => z.id !== zona.id));
            try {
              await zonasService.eliminarZona(zona.id);
            } catch {
              // Revertir si falla
              setZonas((prev) => {
                const alreadyIn = prev.find((z) => z.id === zona.id);
                return alreadyIn ? prev : [...prev, zona];
              });
              Alert.alert('Error', 'No se pudo eliminar la zona. Intenta de nuevo.');
            }
          },
        },
      ]
    );
  }, []);

  // ── Renderizar tarjeta ────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: ZonaInteres }) => (
      <ZonaCard
        item={item}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        onToggle={handleToggle}
      />
    ),
    [handleOpenEdit, handleDelete, handleToggle]
  );

  const keyExtractor = useCallback((item: ZonaInteres) => item.id.toString(), []);

  // ── Empty / Error states ──────────────────────────────────────────────────

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={T.primary} />
          <Text style={styles.loadingText}>Cargando zonas...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconBg}>
            <AlertCircle size={36} color={T.muted} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>¡Ups!</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchZonas()}
            activeOpacity={0.8}
          >
            <RefreshCw size={16} color="#FFF" strokeWidth={2.5} />
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.centerContainer}>
        <View style={styles.emptyIconBg}>
          <MapPinned size={36} color={T.muted} strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>Sin zonas todavía</Text>
        <Text style={styles.emptyText}>
          Agrega tu domicilio u otras ubicaciones para recibir alertas cuando el camión se acerque.
        </Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={handleOpenCreate}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#FFF" strokeWidth={2.5} />
          <Text style={styles.createBtnText}>Agregar mi primera zona</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Volver al perfil"
        >
          <ArrowLeft size={24} color={T.textH} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Zonas</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Info bar */}
      {!loading && !error && (
        <View style={styles.infoBar}>
          <MapPin size={14} color={T.primary} strokeWidth={2} />
          <Text style={styles.infoBarText}>
            {zonas.length}/{MAX_ZONAS} zonas registradas
          </Text>
        </View>
      )}

      {/* Lista */}
      <FlatList
        data={loading ? [] : zonas}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          (loading || error || zonas.length === 0) && styles.listContentCenter,
        ]}
        ListEmptyComponent={renderEmpty}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB — Agregar zona */}
      {!loading && !error && zonas.length < MAX_ZONAS && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleOpenCreate}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Agregar nueva zona de interés"
        >
          <Plus size={24} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>
      )}

      {/* Modal Crear/Editar */}
      <ZonaModal
        visible={modalVisible}
        mode={modalMode}
        zona={selectedZona}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        saving={saving}
      />
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: T.bgPage,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textH,
  },

  // ── Info bar ─────────────────────────────────────────────────────────────────
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: T.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  infoBarText: {
    fontSize: 13,
    color: T.muted,
    fontWeight: '500',
  },

  // ── Lista ────────────────────────────────────────────────────────────────────
  listContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  listContentCenter: {
    justifyContent: 'center',
    alignItems: 'stretch',
  },

  // ── Tarjeta de zona ──────────────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.bgCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    gap: 12,
  },
  cardInactive: {
    opacity: 0.65,
    borderStyle: 'dashed',
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardAlias: {
    fontSize: 15,
    fontWeight: '700',
    color: T.textH,
    marginBottom: 3,
  },
  cardCoords: {
    fontSize: 12,
    color: T.muted,
    fontWeight: '400',
  },
  inactiveBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: T.border,
  },
  inactiveBadgeText: {
    fontSize: 10,
    color: T.muted,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: T.bgPage,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Empty / Error states ─────────────────────────────────────────────────────
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: T.border,
  },
  loadingText: {
    fontSize: 15,
    color: T.muted,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: T.textH,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: T.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  retryText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  createBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // ── FAB ─────────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: T.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },

  // ── Modal ────────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: T.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: T.textH,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: T.text,
    lineHeight: 20,
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: T.text,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: T.textH,
    backgroundColor: T.bgPage,
    marginBottom: 20,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.primary,
    paddingVertical: 13,
    borderRadius: 10,
    gap: 8,
    marginBottom: 8,
  },
  gpsBtnSuccess: {
    backgroundColor: T.success,
  },
  gpsBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  coordsPreview: {
    fontSize: 12,
    color: T.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: T.text,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: T.primary,
    alignItems: 'center',
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
