import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/core/theme/colors';
import { getDisplayError } from '@/core/network/ApiError';
import { useAuthSession } from '@/features/auth/presentation/context/AuthSessionContext';

export default function SessionErrorScreen() {
  const { restoreError, retryRestore, logout } = useAuthSession();
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  async function clearSession() {
    setIsClearing(true);
    setClearError(null);
    try {
      await logout();
    } catch (error) {
      setClearError(getDisplayError(error, 'No se pudo cerrar la sesión. Intenta de nuevo.'));
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.icon}>
          <Ionicons color={colors.warning} name="cloud-offline-outline" size={38} />
        </View>
        <Text style={styles.title}>No pudimos validar tu sesion</Text>
        <Text accessibilityLiveRegion="polite" style={styles.message}>{clearError ?? restoreError}</Text>
        <Pressable onPress={() => void retryRestore()} style={styles.primaryButton}>
          <Ionicons color={colors.white} name="refresh" size={19} />
          <Text style={styles.primaryLabel}>Reintentar</Text>
        </Pressable>
        <Pressable disabled={isClearing} onPress={() => void clearSession()} style={styles.secondaryButton}>
          {isClearing ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.secondaryLabel}>Cerrar sesion en este dispositivo</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 28 },
  icon: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.warningSoft, borderRadius: 40, height: 80, justifyContent: 'center', marginBottom: 22, width: 80 },
  title: { color: colors.text, fontSize: 25, fontWeight: '800', textAlign: 'center' },
  message: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginBottom: 28, marginTop: 10, textAlign: 'center' },
  primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 15, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 52 },
  primaryLabel: { color: colors.white, fontSize: 16, fontWeight: '800' },
  secondaryButton: { alignItems: 'center', justifyContent: 'center', minHeight: 50, marginTop: 10 },
  secondaryLabel: { color: colors.primary, fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
