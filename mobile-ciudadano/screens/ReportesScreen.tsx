import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const T = {
  primary: '#1763A6',
  bgPage: '#F1F5F9',
  textH: '#0F172A',
  text: '#475569',
};

export function ReportesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reportes Ciudadanos</Text>
      <Text style={styles.subtitle}>Módulo en desarrollo...</Text>
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
  },
});
