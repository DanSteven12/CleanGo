import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';

const cleangoIcon = require('../../assets/images/cleango-icon.png');

interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ title, subtitle }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Interpolate scale: 1 to 1.18
  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });

  // Interpolate opacity: 0.18 to 0.45
  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.45],
  });

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {/* Glow Ring (Pulse) */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              transform: [{ scale }],
              opacity,
            },
          ]}
        />
        {/* Static Logo wrapper with styling matching Web's TechOrbitDisplay */}
        <View style={styles.logoWrapper}>
          <Image source={cleangoIcon} style={styles.logo} resizeMode="cover" />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  glowRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#90BF49', // CleanGo Green pulse
    zIndex: 1,
  },
  logoWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: 'rgba(144, 191, 73, 0.6)',
    backgroundColor: '#152C40',
    overflow: 'hidden',
    zIndex: 2,
    // Add shadow
    shadowColor: '#1763A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 22,
  },
});
