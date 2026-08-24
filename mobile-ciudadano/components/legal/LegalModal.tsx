// mobile-ciudadano/components/legal/LegalModal.tsx
import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Text,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface LegalModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const T = {
  bgPage: '#FFFFFF',
  textH: '#0F172A',
  border: '#E2E8F0',
  primary: '#1763A6',
};

export function LegalModal({ visible, onClose, children }: LegalModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: T.bgPage,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.bgPage,
    zIndex: 10,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: T.textH,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
});
