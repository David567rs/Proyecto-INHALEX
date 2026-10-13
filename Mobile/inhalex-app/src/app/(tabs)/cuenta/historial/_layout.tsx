import { Stack } from 'expo-router';
import { colors } from '@/core/theme/colors';
import { useAuthSession } from '@/features/auth/presentation/context/AuthSessionContext';
import { OrderHistoryProvider } from '@/features/orderHistory/presentation/context/OrderHistoryProvider';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

export default function HistoryLayout() {
  const { user } = useAuthSession();
  const reduceMotion = useReducedMotion();
  return <OrderHistoryProvider key={user?.id}><Stack screenOptions={{ headerShown: false, animation: reduceMotion === false ? 'slide_from_right' : 'none', contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="index" /><Stack.Screen name="[id]" />
  </Stack></OrderHistoryProvider>;
}
