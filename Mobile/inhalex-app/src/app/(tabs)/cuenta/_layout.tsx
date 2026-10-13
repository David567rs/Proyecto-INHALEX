import { Stack } from 'expo-router';
import { colors } from '@/core/theme/colors';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { useAuthSession } from '@/features/auth/presentation/context/AuthSessionContext';
import { ProfileProvider } from '@/features/profile/presentation/context/ProfileProvider';

export default function AccountLayout() {
  const reduceMotion = useReducedMotion();
  const { user, applyProfile } = useAuthSession();
  return <ProfileProvider key={user?.id} userId={user?.id ?? ''} onProfile={applyProfile}><Stack screenOptions={{ headerShown: false, animation: reduceMotion === false ? 'slide_from_right' : 'none', contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="perfil" />
    <Stack.Screen name="direcciones" />
    <Stack.Screen name="historial" />
    <Stack.Screen name="seguimiento" />
  </Stack></ProfileProvider>;
}
