import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/core/theme/colors';

interface AuthBackdropProps {
  compact?: boolean;
  mirrored?: boolean;
}

export function AuthBackdrop({ compact = false, mirrored = false }: AuthBackdropProps) {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.backdrop, mirrored && styles.mirrored]}
    >
      <View style={styles.topGreen} />
      <View style={styles.topMint} />
      <View style={[styles.bottomPetal, compact && styles.compactPetal]} />
      <Ionicons
        accessible={false}
        color="#CADCC6"
        name="leaf-outline"
        size={compact ? 116 : 164}
        style={[styles.leafLeft, compact && styles.compactLeafLeft]}
      />
      <Ionicons
        accessible={false}
        color="#DAE6D5"
        name="leaf-outline"
        size={compact ? 104 : 132}
        style={[styles.leafRight, compact && styles.compactLeafRight]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  mirrored: { transform: [{ scaleX: -1 }] },
  topGreen: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: '#DFF2D2',
    right: -112,
    top: -126,
  },
  topMint: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#D7F1E8',
    left: -82,
    top: 22,
  },
  bottomPetal: {
    position: 'absolute',
    width: 230,
    height: 180,
    borderTopLeftRadius: 160,
    borderTopRightRadius: 90,
    borderBottomLeftRadius: 90,
    borderBottomRightRadius: 160,
    backgroundColor: '#EAF2E4',
    right: -72,
    bottom: -126,
    transform: [{ rotate: '-18deg' }],
  },
  compactPetal: { bottom: -157, right: -105 },
  leafLeft: {
    position: 'absolute',
    left: -48,
    bottom: -20,
    opacity: 0.72,
    transform: [{ rotate: '-24deg' }],
  },
  leafRight: {
    position: 'absolute',
    right: -35,
    bottom: 28,
    opacity: 0.72,
    transform: [{ rotate: '126deg' }],
  },
  compactLeafLeft: { bottom: -32, left: -44, opacity: 0.5 },
  compactLeafRight: { bottom: -16, right: -38, opacity: 0.55 },
});
