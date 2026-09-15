// mobile-ciudadano/components/legal/LegalLinks.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LegalModal } from './LegalModal';
import { TermsContent } from './TermsContent';
import { PrivacyContent } from './PrivacyContent';

interface LegalLinksProps {
  actionText?: string; // e.g. "iniciar sesión" or "registrarte"
  disabled?: boolean;
}

const T = {
  text: '#475569',
  primary: '#1763A6',
};

export function LegalLinks({ actionText = 'continuar', disabled = false }: LegalLinksProps) {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.text}>
          Al {actionText} aceptas nuestros{' '}
          <Text
            style={styles.link}
            onPress={() => !disabled && setShowTerms(true)}
            suppressHighlighting
          >
            Términos y Condiciones
          </Text>{' '}
          y nuestra{' '}
          <Text
            style={styles.link}
            onPress={() => !disabled && setShowPrivacy(true)}
            suppressHighlighting
          >
            Política de Privacidad
          </Text>
          .
        </Text>
      </View>

      <LegalModal visible={showTerms} onClose={() => setShowTerms(false)}>
        {showTerms ? <TermsContent /> : null}
      </LegalModal>

      <LegalModal visible={showPrivacy} onClose={() => setShowPrivacy(false)}>
        {showPrivacy ? <PrivacyContent /> : null}
      </LegalModal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  text: {
    fontSize: 12,
    color: T.text,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: T.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
