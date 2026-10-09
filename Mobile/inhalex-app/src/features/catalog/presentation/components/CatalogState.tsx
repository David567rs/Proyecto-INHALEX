import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '@/core/theme/colors';
import { Reveal, SoftPressable } from '@/shared/components/Motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

interface CatalogStateProps {
  status: string;
  errorMessage: string | null;
  onRetry: () => void;
  onReset: () => void;
  hasFilters?: boolean;
}

const connectionHint = 'Revisa tu conexión y vuelve a intentarlo.';

function getErrorHint(message: string | null): string {
  const hint = message?.trim();
  if (!hint || hint.length > 180 || /(?:TypeError|ReferenceError|SyntaxError|Error:|node_modules|https?:\/\/|\bat\s+\S+\s*\(|undefined|is not a function|Cannot |Failed to fetch|Network request failed)/i.test(hint)) {
    return connectionHint;
  }
  return hint;
}

function CatalogLoading() {
  const { width, fontScale } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const singleColumn = width < 360 || fontScale > 1.25;
  const cardWidth = singleColumn ? Math.min(width, 600) - 44 : (Math.min(width, 600) - 56) / 2;
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reducedMotion !== false) {
      opacity.setValue(1);
      return;
    }
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.58, duration: 1000, easing: Easing.inOut(Easing.ease), isInteraction: false, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), isInteraction: false, useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [opacity, reducedMotion]);

  return (
    <View accessible accessibilityLabel="Cargando aromas" accessibilityState={{ busy: true }} style={styles.loading}>
      <Animated.View
        accessible={false}
        accessibilityElementsHidden
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[styles.skeletonGrid, { opacity }]}
      >
        {Array.from({ length: singleColumn ? 2 : 4 }, (_, index) => (
          <View key={index} style={[styles.skeletonCard, { width: cardWidth }]}>
            <View style={[styles.skeletonImage, { height: cardWidth - 2 }]} />
            <View style={styles.skeletonCopy}>
              <View style={styles.skeletonCategory} />
              <View style={styles.skeletonLine} />
              <View style={styles.skeletonShort} />
              <View style={styles.skeletonBottom}>
                <View style={styles.skeletonPrice} />
                <View style={styles.skeletonArrow} />
              </View>
            </View>
          </View>
        ))}
      </Animated.View>
      <Text accessible={false} aria-hidden style={styles.loadingLabel}>Preparando tu selección…</Text>
    </View>
  );
}

export function CatalogState({ status, errorMessage, onRetry, onReset, hasFilters = false }: CatalogStateProps) {
  if (status === 'ready') return null;
  if (status === 'loading') return <CatalogLoading />;

  const failed = status === 'error';
  const title = failed ? 'No pudimos cargar los aromas' : hasFilters ? 'Sin coincidencias' : 'La colección estará aquí';
  const hint = failed ? getErrorHint(errorMessage) : hasFilters ? 'Prueba otro aroma o explora la colección.' : 'Vuelve a consultar en un momento.';
  const action = failed ? 'Reintentar' : hasFilters ? 'Ver todos' : 'Actualizar catálogo';

  return (
    <Reveal key={`${status}-${hasFilters}`} style={styles.state}>
      <View
        accessible={false}
        accessibilityElementsHidden
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        style={styles.icon}
      >
        <Ionicons name={failed ? 'cloud-offline-outline' : hasFilters ? 'search-outline' : 'leaf-outline'} size={28} color={colors.primary} />
      </View>
      <View accessibilityLiveRegion="polite" style={styles.stateCopy}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.body}>{hint}</Text>
      </View>
      <SoftPressable accessibilityRole="button" onPress={failed || !hasFilters ? onRetry : onReset} style={styles.button}>
        <Ionicons accessible={false} aria-hidden name={failed || !hasFilters ? 'refresh-outline' : 'arrow-forward'} size={17} color={colors.white} />
        <Text style={styles.buttonText}>{action}</Text>
      </SoftPressable>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  loading: { paddingHorizontal: 22, paddingTop: 20 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  skeletonCard: { backgroundColor: colors.surface, borderColor: '#E3EADF', borderRadius: 23, borderWidth: 1, overflow: 'hidden' },
  skeletonImage: { backgroundColor: '#E6EEDF', borderRadius: 22, height: 168 },
  skeletonCopy: { padding: 14 },
  skeletonCategory: { backgroundColor: '#E9EEE5', borderRadius: 4, height: 8, width: '55%' },
  skeletonLine: { backgroundColor: '#E5ECE0', borderRadius: 5, height: 15, marginTop: 12, width: '78%' },
  skeletonShort: { backgroundColor: '#EEF2EB', borderRadius: 4, height: 10, marginTop: 16, width: '86%' },
  skeletonBottom: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  skeletonPrice: { backgroundColor: '#E5ECE0', borderRadius: 5, height: 17, width: '45%' },
  skeletonArrow: { backgroundColor: colors.surfaceSoft, borderRadius: 18, height: 36, width: 36 },
  loadingLabel: { color: colors.textMuted, fontSize: 12, marginTop: 18, textAlign: 'center' },
  state: { alignItems: 'center', backgroundColor: colors.surface, borderColor: '#E3EADF', borderRadius: 26, borderWidth: 1, marginHorizontal: 22, marginTop: 24, paddingHorizontal: 24, paddingVertical: 30 },
  icon: { alignItems: 'center', backgroundColor: colors.surfaceSoft, borderRadius: 32, height: 64, justifyContent: 'center', width: 64 },
  stateCopy: { alignSelf: 'stretch', marginTop: 18 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.3, lineHeight: 27, textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: 13, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  button: { alignItems: 'center', backgroundColor: colors.primaryDark, borderRadius: 16, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 22, minHeight: 48, paddingHorizontal: 20, paddingVertical: 13 },
  buttonText: { color: colors.white, flexShrink: 1, fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
