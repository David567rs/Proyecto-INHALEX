import { useEffect, useState } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/core/theme/colors';

interface AppScreenProps extends PropsWithChildren {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}

export function AppScreen({ title, eyebrow, action, children }: AppScreenProps) {
  const [entrance] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!mounted) return;

      if (reduceMotion) {
        entrance.setValue(1);
        return;
      }

      Animated.timing(entrance, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      mounted = false;
      entrance.stopAnimation();
    };
  }, [entrance]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={{
          opacity: entrance,
          transform: [
            { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
          ],
        }}
      >
        <View style={styles.header}>
          <Image
            accessibilityLabel="INHALEX"
            resizeMode="contain"
            source={require('../../../assets/inhalex-mark.png')}
            style={styles.mark}
          />
          <View style={styles.heading}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.title}>{title}</Text>
          </View>
          {action}
        </View>
        {children}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

export function ModuleCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>{icon}</View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: { flexGrow: 1, padding: 20, paddingBottom: 110 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 26, minHeight: 58 },
  mark: { height: 52, width: 52 },
  heading: { flex: 1, marginLeft: 12 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: colors.text, fontSize: 27, fontWeight: '800', letterSpacing: -0.5 },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 2,
  },
  cardIcon: { alignItems: 'center', backgroundColor: colors.surfaceSoft, borderRadius: 32, height: 64, justifyContent: 'center', marginBottom: 18, width: 64 },
  cardTitle: { color: colors.primaryDark, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  cardDescription: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
});
