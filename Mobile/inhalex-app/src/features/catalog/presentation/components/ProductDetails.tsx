import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme/colors';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { SoftPressable } from '@/shared/components/Motion';
import type { CatalogProduct } from '../../domain/entities/CatalogProduct';
import { formatPrice } from './ProductCard';
import { ProductBottleImage } from './ProductBottleImage';
import { useCatalogViewModel } from '../viewModels/useCatalogViewModel';

export function CatalogProductOverlay() {
  const vm = useCatalogViewModel();
  const categoryLabel = vm.categories.find((category) => category.id === vm.selectedProduct?.category)?.name ?? 'Colección INHALEX';
  return <ProductDetails product={vm.selectedProduct} categoryLabel={categoryLabel} loading={vm.detailLoading} errorMessage={vm.detailError} onClose={vm.closeProduct} onRetry={() => void vm.retryDetail()} />;
}

export function ProductDetails({ product, categoryLabel, loading, errorMessage, onClose, onRetry }: {
  product: CatalogProduct | null;
  categoryLabel: string;
  loading: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  return (
    <BottomSheet visible={Boolean(product)} title="Tu próximo aroma" onClose={onClose}>
      {product ? <>
        <ProductBottleImage key={product.id} product={product} />
        <Text style={styles.category}>{categoryLabel}</Text>
        <Text accessibilityRole="header" style={styles.name}>{product.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(product.effectivePrice, product.currency)}</Text>
          <View style={styles.stock}><View style={[styles.stockDot, !product.inStock && { backgroundColor: colors.textMuted }]} /><Text style={styles.stockLabel}>{product.inStock ? 'Disponible' : 'Sin disponibilidad'}</Text></View>
        </View>
        {loading ? <ActivityIndicator accessibilityLabel="Actualizando detalles" color={colors.primary} style={styles.loading} /> : null}
        {errorMessage ? <View accessibilityLiveRegion="polite" style={styles.detailNotice}>
          <Text style={styles.noticeText}>No se pudo actualizar el detalle.</Text>
          <SoftPressable accessibilityRole="button" disabled={loading} onPress={onRetry} style={styles.noticeRetry}><Text style={styles.noticeRetryLabel}>Reintentar</Text></SoftPressable>
        </View> : null}
        <Text style={styles.body}>{product.longDescription || product.description}</Text>
        {product.aromas.length > 0 ? <View style={styles.info}><Ionicons name="leaf-outline" color={colors.primary} size={21} /><View style={styles.infoCopy}><Text style={styles.infoTitle}>Perfil aromático</Text><Text style={styles.body}>{product.aromas.join(' · ')}</Text></View></View> : null}
        {product.presentation ? <View style={styles.info}><Ionicons name="flask-outline" color={colors.primary} size={21} /><View style={styles.infoCopy}><Text style={styles.infoTitle}>Presentación</Text><Text style={styles.body}>{product.presentation}</Text></View></View> : null}
        {product.origin ? <View style={styles.info}><Ionicons name="location-outline" color={colors.primary} size={21} /><View style={styles.infoCopy}><Text style={styles.infoTitle}>Origen</Text><Text style={styles.body}>{product.origin}</Text></View></View> : null}
        {product.benefits.length > 0 ? <View style={styles.benefits}><Text style={styles.infoTitle}>Sobre este aroma</Text>{product.benefits.map((benefit) => <View key={benefit} style={styles.benefit}><Ionicons name="checkmark-circle-outline" color={colors.primary} size={18} /><Text style={styles.benefitText}>{benefit}</Text></View>)}</View> : null}
      </> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  category: { color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 23, textTransform: 'uppercase' },
  name: { color: colors.text, fontSize: 29, fontWeight: '700', letterSpacing: -0.7, marginTop: 7 },
  priceRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', marginVertical: 16 },
  price: { color: colors.primaryDark, fontSize: 25, fontWeight: '800' },
  stock: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  stockDot: { backgroundColor: colors.primary, borderRadius: 4, height: 6, width: 6 },
  stockLabel: { color: colors.textMuted, fontSize: 12 },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 23 },
  loading: { marginBottom: 15 },
  detailNotice: { alignItems: 'center', backgroundColor: colors.surfaceSoft, borderRadius: 14, flexDirection: 'row', gap: 12, marginBottom: 15, paddingHorizontal: 13, paddingVertical: 7 },
  noticeText: { color: colors.textMuted, flex: 1, fontSize: 12, lineHeight: 18 },
  noticeRetry: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 4 },
  noticeRetryLabel: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  info: { alignItems: 'flex-start', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 12, marginTop: 18, paddingTop: 18 },
  infoCopy: { flex: 1 },
  infoTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  benefits: { backgroundColor: colors.surfaceSoft, borderRadius: 18, marginTop: 20, padding: 17 },
  benefit: { alignItems: 'flex-start', flexDirection: 'row', gap: 8, marginTop: 10 },
  benefitText: { color: colors.textMuted, flex: 1, fontSize: 13, lineHeight: 19 },
});
