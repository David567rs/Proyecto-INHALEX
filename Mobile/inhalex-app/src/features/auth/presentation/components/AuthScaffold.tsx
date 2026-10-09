import type { PropsWithChildren, ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/core/theme/colors';
import { Reveal } from '@/shared/components/Motion';
import { AuthBackdrop } from './AuthBackdrop';

interface AuthScaffoldProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  appearance?: 'default' | 'minimal';
  layout?: 'centered' | 'scrollable';
  backdrop?: 'default' | 'mirrored';
  footer?: ReactNode;
}

export function AuthScaffold({
  title,
  subtitle,
  appearance = 'default',
  layout = 'centered',
  backdrop = 'default',
  footer,
  children,
}: AuthScaffoldProps) {
  const { height, fontScale } = useWindowDimensions();
  const isMinimal = appearance === 'minimal';
  const isCompact = height < 700 || fontScale > 1.25;

  return (
    <SafeAreaView style={[styles.safeArea, isMinimal && styles.decoratedSafeArea]} edges={['top', 'bottom']}>
      {isMinimal ? <AuthBackdrop compact={isCompact} mirrored={backdrop === 'mirrored'} /> : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            isMinimal && styles.minimalContent,
            isMinimal && isCompact && styles.compactContent,
            isMinimal && layout === 'scrollable' && styles.scrollableContent,
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isMinimal ? (
            <View style={styles.minimalShell}>
              <Reveal style={[
                styles.minimalBrand,
                isCompact && styles.compactBrand,
                layout === 'scrollable' && styles.scrollableBrand,
              ]}>
                <Image
                  source={require('../../../../../assets/home/brand.png')}
                  resizeMode="contain"
                  style={[styles.minimalLogo, isCompact && styles.compactLogo]}
                  accessibilityLabel="INHALEX, el respiro que alivia"
                />
              </Reveal>

              <Reveal delay={70} style={[styles.minimalCard, isCompact && styles.compactCard]}>
                <Text accessibilityRole="header" style={styles.minimalTitle}>{title}</Text>
                {children}
              </Reveal>

              {footer ? <Reveal delay={120} style={styles.minimalFooter}>{footer}</Reveal> : null}
            </View>
          ) : (
            <>
              <View style={styles.brandPanel}>
                <View style={styles.orbLarge} />
                <View style={styles.orbSmall} />
                <Image
                  source={require('../../../../../assets/NuevoLogo.png')}
                  resizeMode="cover"
                  style={styles.logo}
                  accessibilityLabel="INHALEX, el respiro que alivia"
                />
                <Text style={styles.brandMessage}>Bienestar respiratorio, siempre contigo.</Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                {children}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  decoratedSafeArea: { overflow: 'hidden' },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 28 },
  brandPanel: {
    minHeight: 210,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  orbLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#DFF2D2',
    right: -95,
    top: -125,
  },
  orbSmall: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#D7F1E8',
    left: -62,
    bottom: -80,
  },
  logo: { width: '100%', maxWidth: 320, height: 112 },
  brandMessage: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '600',
    marginTop: -4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    marginHorizontal: 18,
    paddingHorizontal: 22,
    paddingVertical: 26,
    ...Platform.select({
      web: { boxShadow: '0 10px 20px rgba(18, 53, 31, 0.09)' },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.09,
        shadowRadius: 20,
        elevation: 4,
      },
    }),
  },
  title: {
    color: colors.primaryDark,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    marginTop: 7,
    textAlign: 'center',
  },
  minimalContent: {
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 32,
  },
  compactContent: { justifyContent: 'flex-start', paddingVertical: 20 },
  scrollableContent: { justifyContent: 'flex-start', paddingVertical: 24 },
  minimalShell: { alignSelf: 'center', maxWidth: 420, width: '100%' },
  minimalBrand: { alignItems: 'center', marginBottom: 32 },
  compactBrand: { marginBottom: 24 },
  scrollableBrand: { marginBottom: 24 },
  minimalLogo: { height: 92, maxWidth: 252, width: '100%' },
  compactLogo: { height: 76, maxWidth: 230 },
  minimalCard: {
    backgroundColor: colors.surface,
    borderColor: '#E7EEE5',
    borderRadius: 28,
    borderWidth: 1,
    padding: 26,
    ...Platform.select({
      web: { boxShadow: '0 12px 28px rgba(18, 53, 31, 0.045)' },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.045,
        shadowRadius: 18,
        elevation: 2,
      },
    }),
  },
  compactCard: { padding: 22 },
  minimalTitle: {
    color: colors.primaryDark,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.65,
    marginBottom: 26,
    textAlign: 'center',
  },
  minimalFooter: { marginTop: 18 },
});
