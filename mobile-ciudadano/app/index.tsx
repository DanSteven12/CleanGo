import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

const T = {
  primary: '#1763A6',
  bgPage: '#FFFFFF',
  textH: '#0F172A',
  text: '#475569',
  border: '#E2E8F0',
  destructive: '#DC2626',
};

export default function HomeScreen() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={T.primary} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Hola, {user?.nombre}</Text>
        
        <View style={styles.card}>
          <Text style={styles.label}>Información de sesión:</Text>
          <Text style={styles.value}>Correo: {user?.correo}</Text>
          <Text style={styles.value}>Rol: {user?.rol}</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: T.textH,
    marginBottom: 32,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    width: '100%',
    maxWidth: 400,
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: T.textH,
    marginBottom: 12,
  },
  value: {
    fontSize: 16,
    color: T.text,
    marginBottom: 8,
  },
  logoutButton: {
    backgroundColor: T.destructive,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
