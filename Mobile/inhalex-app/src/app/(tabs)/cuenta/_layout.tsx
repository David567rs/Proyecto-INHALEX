import { Stack } from 'expo-router';
import { colors } from '@/core/theme/colors';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

export default function AccountLayout() {
  const reduceMotion = useReducedMotion();
  return <Stack screenOptions={{ headerShown: false, animation: reduceMotion === false ? 'slide_from_right' : 'none', contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="direcciones" />
    <Stack.Screen name="historial" />
    <Stack.Screen name="seguimiento" />
  </Stack>;
}
