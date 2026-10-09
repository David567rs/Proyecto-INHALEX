import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/core/theme/colors';
import { SoftPressable } from '@/shared/components/Motion';
import type { CatalogProduct } from '../../domain/entities/CatalogProduct';
import { getBundledProductImage } from '../assets/productImages';

export function formatPrice(value: number, currency: string) {
  try { return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value); }
  catch { return `${value.toFixed(2)} ${currency}`; }
}

export function ProductImage({ uri, imagePath, style, imageStyle, resizeMode = 'cover' }: { uri: string | null; imagePath: string; style?: StyleProp<ViewStyle>; imageStyle?: StyleProp<ImageStyle>; resizeMode?: 'cover' | 'contain' }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const bundled = getBundledProductImage(imagePath);
  const source = uri && failedUri !== uri ? { uri } : bundled;
  return (
    <View style={[styles.imageStage, style]}>
      {source ? (
        <Image accessible={false} source={source} resizeMode={resizeMode} style={[styles.image, imageStyle]} onError={() => setFailedUri(uri)} />
      ) : (
        <View style={styles.imageFallback}>
          <Image source={require('../../../../../assets/inhalex-mark.png')} resizeMode="contain" style={styles.fallbackMark} />
          <Text style={styles.fallbackLabel}>INHALEX</Text>
        </View>
      )}
    </View>
  );
}

export function ProductCard({ product, categoryLabel, width, onPress, compact = false }: {
  product: CatalogProduct;
  categoryLabel: string;
  width: number;
  onPress: () => void;
  compact?: boolean;
}) {
  const hasPromotion = product.effectivePrice < product.price;
  return (
    <SoftPressable accessibilityRole="button" accessibilityLabel={`${product.name}, ${formatPrice(product.effectivePrice, product.currency)}. Ver detalles`} onPress={onPress} style={[styles.card, compact && styles.compactCard, { width }]}>
      <View>
        <ProductImage
          uri={product.imageUrl}
          imagePath={product.image}
          style={compact ? [styles.compactImageStage, { height: Math.min((width - 2) * 0.78, 190) }] : { height: width - 2 }}
          imageStyle={compact ? { position: 'absolute', bottom: 0, height: width - 2 } : undefined}
        />
        {hasPromotion ? <View style={styles.badge}><Text style={styles.badgeLabel}>Precio especial</Text></View> : null}
      </View>
      <View style={[styles.copy, compact && styles.compactCopy]}>
        <Text style={[styles.category, compact && styles.compactCategory]} numberOfLines={1}>{categoryLabel.replace(/^L[ií]nea\s+/i, '')}</Text>
        <Text style={[styles.name, compact && styles.compactName]} numberOfLines={2}>{product.name}</Text>
        <Text style={[styles.aromas, compact && styles.compactAromas]} numberOfLines={1}>{product.aromas.length ? product.aromas.join(' · ') : product.presentation}</Text>
        <View style={[styles.bottom, compact && styles.compactBottom]}>
          <View style={styles.priceCopy}>
            {hasPromotion ? <Text style={styles.originalPrice}>{formatPrice(product.price, product.currency)}</Text> : null}
            <Text style={[styles.price, compact && styles.compactPrice]}>{formatPrice(product.effectivePrice, product.currency)}</Text>
          </View>
          <View style={[styles.arrow, compact && styles.compactArrow]}><Ionicons accessible={false} aria-hidden name="arrow-forward" size={compact ? 16 : 18} color={colors.primaryDark} /></View>
        </View>
        {!product.inStock ? <Text style={styles.unavailable}>Sin disponibilidad</Text> : null}
      </View>
    </SoftPressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: '#E3EADF', borderRadius: 23, borderWidth: 1, overflow: 'hidden' },
  imageStage: { alignItems: 'center', backgroundColor: '#EDF3E9', borderRadius: 22, height: 168, justifyContent: 'center', overflow: 'hidden' },
  image: { height: '100%', width: '100%' },
  imageFallback: { alignItems: 'center', opacity: 0.6 },
  fallbackMark: { width: 55, height: 60 },
  fallbackLabel: { color: colors.primaryDark, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginTop: 7 },
  badge: { backgroundColor: '#FFFFFFEB', borderRadius: 12, left: 10, paddingHorizontal: 9, paddingVertical: 5, position: 'absolute', top: 10 },
  badgeLabel: { color: colors.primaryDark, fontSize: 10, fontWeight: '700' },
  copy: { padding: 14 },
  category: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
  name: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 21, marginTop: 6, minHeight: 42 },
  aromas: { color: colors.textMuted, fontSize: 11, marginTop: 4, minHeight: 16 },
  bottom: { alignItems: 'center', flexDirection: 'row', gap: 4, justifyContent: 'space-between', marginTop: 12 },
  priceCopy: { flex: 1 },
  price: { color: colors.primaryDark, fontSize: 17, fontWeight: '800' },
  originalPrice: { color: colors.textMuted, fontSize: 11, textDecorationLine: 'line-through' },
  arrow: { alignItems: 'center', backgroundColor: colors.surfaceSoft, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  unavailable: { color: colors.textMuted, fontSize: 11, marginTop: 8 },
  compactCard: { borderRadius: 20 },
  compactImageStage: { borderRadius: 19 },
  compactCopy: { padding: 12 },
  compactCategory: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2, textTransform: 'none' },
  compactName: { fontSize: 15, lineHeight: 19, marginTop: 5, minHeight: 38 },
  compactAromas: { marginTop: 3 },
  compactBottom: { marginTop: 9 },
  compactPrice: { fontSize: 16 },
  compactArrow: { borderRadius: 15, height: 30, width: 30 },
});
