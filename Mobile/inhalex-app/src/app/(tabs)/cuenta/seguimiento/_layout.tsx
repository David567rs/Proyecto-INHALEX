import { Stack } from 'expo-router';
import { colors } from '@/core/theme/colors';
import { useAuthSession } from '@/features/auth/presentation/context/AuthSessionContext';
import { OrderTrackingProvider } from '@/features/orderTracking/presentation/context/OrderTrackingProvider';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

export default function TrackingLayout() {
  const { user } = useAuthSession();
  const reduceMotion = useReducedMotion();
  return <OrderTrackingProvider key={user?.id}><Stack screenOptions={{ headerShown: false, animation: reduceMotion === false ? 'slide_from_right' : 'none', contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="[id]" />
  </Stack></OrderTrackingProvider>;
}
