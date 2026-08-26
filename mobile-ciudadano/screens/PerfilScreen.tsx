import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const T = {
  primary: '#1763A6',
  bgPage: '#F1F5F9',
  textH: '#0F172A',
  text: '#475569',
  border: '#E2E8F0',
};

export function PerfilScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.subtitle}>Hola, {user?.nombre}</Text>
      
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bgPage,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: T.textH,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: T.text,
    marginBottom: 24,
  },
  logoutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#DC2626',
    borderRadius: 8,
  },
  logoutText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
