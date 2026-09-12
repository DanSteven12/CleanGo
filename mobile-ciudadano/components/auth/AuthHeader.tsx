import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CleanGoOrbitRadar } from '../ui/CleanGoOrbitRadar';

interface AuthHeaderProps {
  title: string;
  subtitle: string;
  radarSize?: number;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  title,
  subtitle,
  radarSize = 200,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.radarWrapper}>
        <CleanGoOrbitRadar size={radarSize} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  radarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14.5,
    color: '#475569',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
});
