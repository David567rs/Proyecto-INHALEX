import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '@/core/theme/colors';
import { Reveal } from '@/shared/components/Motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import type { CatalogProduct } from '../../domain/entities/CatalogProduct';
import { getAromaProductImage } from '../assets/aromaImages';

export function ProductBottleImage({ product }: { product: CatalogProduct }) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const photo = getAromaProductImage(product);
  const availableWidth = Math.max(1, Math.min(width, 600) - 44);
  // Match the photo's proportions so its own background fills the whole frame.
  // On shorter screens, shrink both dimensions together to keep the bottle visible.
  const frameHeight = photo
    ? Math.min(availableWidth / photo.aspectRatio, Math.max(240, height * 0.68))
    : Math.max(240, Math.min(440, height * 0.48));
  const frameWidth = photo ? frameHeight * photo.aspectRatio : availableWidth;
  const volume = product.presentation.match(/\b\d+(?:[.,]\d+)?\s*ml\b/i)?.[0];

  return (
    <Reveal delay={90} style={[styles.frame, !photo && styles.placeholderFrame, { width: frameWidth, height: frameHeight }]}>
      {photo ? <Image
        accessible
        accessibilityLabel={`Frasco de ${product.name}, producto INHALEX`}
        accessibilityRole="image"
        source={photo.source}
        resizeMode="contain"
        fadeDuration={reducedMotion === false ? 240 : 0}
        style={{ width: frameWidth, height: frameHeight }}
      /> : <View style={styles.placeholder}>
        <Image accessible={false} source={require('../../../../../assets/inhalex-mark.png')} resizeMode="contain" style={styles.mark} />
        <Text style={styles.placeholderTitle}>{product.name}</Text>
        <Text style={styles.placeholderCopy}>Imagen del producto no disponible</Text>
      </View>}
      <Text accessible={false} pointerEvents="none" style={styles.signature}>INHALEX</Text>
      {photo && volume ? <View pointerEvents="none" style={styles.volume}><Text style={styles.volumeLabel}>{volume}</Text></View> : null}
    </Reveal>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', alignSelf: 'center', borderRadius: 24, justifyContent: 'center', overflow: 'hidden' },
  placeholderFrame: { backgroundColor: '#FFFFFF', borderColor: '#E1E9DC', borderWidth: 1 },
  signature: { color: '#89968A', fontSize: 9, fontWeight: '700', left: 17, letterSpacing: 2, position: 'absolute', top: 18 },
  volume: { backgroundColor: '#F5F8F1', borderColor: '#E5EBDF', borderRadius: 14, borderWidth: 1, bottom: 15, paddingHorizontal: 12, paddingVertical: 6, position: 'absolute', right: 15 },
  volumeLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  placeholder: { alignItems: 'center', maxWidth: '75%' },
  mark: { height: 65, marginBottom: 16, opacity: 0.7, width: 58 },
  placeholderTitle: { color: colors.primaryDark, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  placeholderCopy: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 7, textAlign: 'center' },
});
