import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/core/theme/colors';
import { CatalogProvider } from '@/features/catalog/presentation/context/CatalogProvider';
import { CatalogProductOverlay } from '@/features/catalog/presentation/components/ProductDetails';

type TabIconName = keyof typeof Ionicons.glyphMap;

interface TabIconProps {
  color: ColorValue;
  focused: boolean;
  size: number;
  focusedName: TabIconName;
  outlineName: TabIconName;
  reduceMotion: boolean;
}

function TabIcon({ color, focused, size, focusedName, outlineName, reduceMotion }: TabIconProps) {
  const [progress] = useState(() => new Animated.Value(focused ? 1 : 0));

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(focused ? 1 : 0);
      return;
    }

    const animation = Animated.spring(progress, {
      damping: 18,
      mass: 0.7,
      stiffness: 260,
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [focused, progress, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.iconContainer,
        focused && styles.iconContainerFocused,
        {
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.76, 1] }),
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
          ],
        },
      ]}
    >
      <Ionicons color={color} name={focused ? focusedName : outlineName} size={size} />
    </Animated.View>
  );
}

export default function TabsLayout() {
  return <CatalogProvider><TabNavigator /><CatalogProductOverlay /></CatalogProvider>;
}

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomProtection = Math.max(insets.bottom, 8);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((isEnabled) => {
      if (mounted) setReduceMotion(isEnabled);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const renderTabIcon = (focusedName: TabIconName, outlineName: TabIconName) =>
    function RenderTabIcon(props: Omit<TabIconProps, 'focusedName' | 'outlineName' | 'reduceMotion'>) {
      return (
        <TabIcon
          {...props}
          focusedName={focusedName}
          outlineName={outlineName}
          reduceMotion={reduceMotion}
        />
      );
    };

  return (
    <Tabs
      screenOptions={{
        animation: reduceMotion ? 'none' : 'shift',
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.primary,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarItemStyle: { paddingTop: 2 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          elevation: 12,
          height: 60 + bottomProtection,
          paddingBottom: bottomProtection,
          paddingTop: 4,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: -5 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        transitionSpec: reduceMotion
          ? undefined
          : { animation: 'timing', config: { duration: 220 } },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: renderTabIcon('home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="catalogo"
        options={{
          title: 'Catálogo',
          tabBarIcon: renderTabIcon('leaf', 'leaf-outline'),
        }}
      />
      <Tabs.Screen
        name="favoritos"
        options={{
          title: 'Favoritos',
          tabBarIcon: renderTabIcon('heart', 'heart-outline'),
        }}
      />
      <Tabs.Screen
        name="bolsa"
        options={{
          title: 'Bolsa',
          tabBarIcon: renderTabIcon('bag', 'bag-outline'),
        }}
      />
      <Tabs.Screen
        name="cuenta"
        options={{
          title: 'Cuenta',
          tabBarIcon: renderTabIcon('person', 'person-outline'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 48,
  },
  iconContainerFocused: { backgroundColor: colors.surfaceSoft },
});
