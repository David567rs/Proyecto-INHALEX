import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme/colors';
import { getDisplayError } from '@/core/network/ApiError';
import { useAuthSession } from '@/features/auth/presentation/context/AuthSessionContext';
import { AppScreen } from '@/shared/components/AppScreen';

export default function AccountScreen() {
  const { user, logout } = useAuthSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setIsLoggingOut(true);
    setError(null);

    try {
      await logout();
    } catch (logoutError) {
      setError(getDisplayError(logoutError, 'No se pudo eliminar la sesion segura.'));
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <AppScreen eyebrow="Perfil" title="Mi cuenta">
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>{initials(user?.name ?? '')}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
      </View>

      <View style={styles.securityRow}>
        <Ionicons color={colors.success} name="lock-closed-outline" size={22} />
        <View style={styles.securityCopy}>
          <Text style={styles.securityTitle}>Acceso seguro</Text>
          <Text style={styles.securityText}>{Platform.OS === 'web'
            ? 'Sesión temporal para la vista web de desarrollo. Se cierra al recargar la página.'
            : 'Token cifrado con el almacenamiento seguro del dispositivo.'}</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        disabled={isLoggingOut}
        onPress={() => void handleLogout()}
        style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutPressed]}
      >
        {isLoggingOut ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <>
            <Ionicons color={colors.danger} name="log-out-outline" size={21} />
            <Text style={styles.logoutLabel}>Cerrar sesion</Text>
          </>
        )}
      </Pressable>
    </AppScreen>
  );
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  profileCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 24, borderWidth: 1, padding: 26 },
  avatar: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 38, height: 76, justifyContent: 'center', marginBottom: 14, width: 76 },
  avatarLabel: { color: colors.white, fontSize: 26, fontWeight: '800' },
  name: { color: colors.text, fontSize: 21, fontWeight: '800', textAlign: 'center' },
  email: { color: colors.textMuted, fontSize: 14, marginTop: 5 },
  phone: { color: colors.textMuted, fontSize: 14, marginTop: 3 },
  securityRow: { alignItems: 'flex-start', backgroundColor: colors.surfaceSoft, borderRadius: 18, flexDirection: 'row', marginTop: 16, padding: 16 },
  securityCopy: { flex: 1, marginLeft: 12 },
  securityTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  securityText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  error: { color: colors.danger, fontSize: 13, marginTop: 14, textAlign: 'center' },
  logoutButton: { alignItems: 'center', borderColor: '#E8C7C2', borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 18, minHeight: 52 },
  logoutPressed: { backgroundColor: colors.dangerSoft },
  logoutLabel: { color: colors.danger, fontSize: 15, fontWeight: '800' },
});
