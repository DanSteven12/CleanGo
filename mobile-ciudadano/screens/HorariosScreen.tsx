import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, MapPin, CalendarClock } from 'lucide-react-native';
import { horariosService, RutaSearchResult } from '../services/horariosService';

const T = {
  primary: '#1763A6',
  bgPage: '#F1F5F9',
  bgCard: '#FFFFFF',
  textH: '#0F172A',
  text: '#475569',
  border: '#E2E8F0',
  muted: '#94A3B8',
};

// Custom hook for debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export function HorariosScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  
  const [results, setResults] = useState<RutaSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await horariosService.searchRutas(q);
      setResults(data);
    } catch (err) {
      setError('Error al conectar. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      search(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, search]);

  const handleSelectRuta = (rutaId: number) => {
    router.push(`/horarios/${rutaId}` as any);
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={T.primary} />
          <Text style={styles.emptyText}>Buscando...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>¡Ups!</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => search(debouncedQuery)}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (debouncedQuery.trim().length >= 2 && results.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Search size={48} color={T.muted} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Sin coincidencias</Text>
          <Text style={styles.emptyText}>No encontramos ninguna colonia que coincida con "{debouncedQuery}".</Text>
        </View>
      );
    }

    if (debouncedQuery.trim().length < 2) {
      return (
        <View style={styles.emptyContainer}>
          <CalendarClock size={64} color={T.muted} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>Consulta tu horario de recolección</Text>
          <Text style={styles.emptyText}>Encuentra los días y horarios en los que pasa el camión por tu zona.</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>¿Cuándo pasa el camión?</Text>
        <Text style={styles.subtitle}>Busca tu colonia para conocer los días y horarios de recolección.</Text>
        
        <View style={styles.searchContainer}>
          <Search size={20} color={T.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar colonia (ej. Reforma)"
            placeholderTextColor={T.muted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.resultCard}
            onPress={() => handleSelectRuta(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.resultIconBg}>
              <MapPin size={24} color={T.primary} />
            </View>
            <View style={styles.resultTextContainer}>
              <Text style={styles.resultTitle}>{item.nombre}</Text>
              {item.descripcion && (
                <Text style={styles.resultDesc} numberOfLines={2}>{item.descripcion}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
  },
  header: {
    padding: 24,
    backgroundColor: T.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: T.textH,
  },
  subtitle: {
    fontSize: 14,
    color: T.text,
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.bgPage,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: T.border,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: T.textH,
  },
  listContent: {
    flexGrow: 1,
    padding: 20,
  },
  resultCard: {
    flexDirection: 'row',
    backgroundColor: T.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  resultIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE', // light blue
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: T.textH,
    marginBottom: 4,
  },
  resultDesc: {
    fontSize: 13,
    color: T.text,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: T.textH,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: T.text,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: T.primary,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
