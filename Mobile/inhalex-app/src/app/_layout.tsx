import { useEffect } from 'react';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/core/theme/colors';
import { AuthSessionProvider, useAuthSession } from '@/features/auth/presentation/context/AuthSessionContext';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthSessionProvider>
      <StatusBar style="dark" />
      <SplashController />
      <RootNavigator />
    </AuthSessionProvider>
  );
}

function SplashController() {
  const { status } = useAuthSession();

  useEffect(() => {
    if (status !== 'restoring') {
      SplashScreen.hide();
    }
  }, [status]);

  return null;
}

function RootNavigator() {
  const { status } = useAuthSession();

  if (status === 'restoring') {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        animation: 'fade_from_bottom',
        contentStyle: { backgroundColor: colors.background },
        headerShown: false,
      }}
    >
      <Stack.Protected guard={status === 'authenticated'}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'unauthenticated'}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'error'}>
        <Stack.Screen name="session-error" />
      </Stack.Protected>
    </Stack>
  );
}
