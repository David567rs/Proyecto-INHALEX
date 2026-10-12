import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '@/core/theme/colors';
import { ProductImage, formatPrice } from '@/features/catalog/presentation/components/ProductCard';
import { SoftPressable } from '@/shared/components/Motion';
import { getCartQuantityLimit, type CartItem } from '../../domain/entities/Cart';
import { QuantityStepper } from './QuantityStepper';

export function CartItemCard({ item, disabled, pending, onOpen, onQuantityChange, onRemove }: {
  item: CartItem; disabled: boolean; pending: boolean; onOpen: () => void; onQuantityChange: (quantity: number) => void; onRemove: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  const limit = getCartQuantityLimit(item.product);
  const unavailable = limit === 0;
  const exceedsStock = item.quantity > limit;
  return <View style={styles.card}>
    <View style={styles.top}>
      <SoftPressable accessibilityRole="button" accessibilityLabel={`Ver detalles de ${item.product.name}`} onPress={onOpen}>
        <ProductImage uri={item.product.imageUrl} imagePath={item.product.image} style={styles.photo} />
      </SoftPressable>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={fontScale > 1.2 ? undefined : 2}>{item.product.name}</Text>
          <SoftPressable accessibilityRole="button" accessibilityLabel={`Quitar ${item.product.name} de la bolsa`}
            accessibilityState={{ disabled: disabled || pending, busy: pending }} disabled={disabled || pending} onPress={onRemove} style={[styles.remove, (disabled || pending) && styles.disabled]}>
            <Ionicons aria-hidden name="trash-outline" size={18} color={colors.textMuted} />
          </SoftPressable>
        </View>
        <Text style={styles.presentation}>{item.product.presentation || 'Colección INHALEX'}</Text>
        <Text style={styles.unitPrice}>{formatPrice(item.unitPrice, item.product.currency)} c/u</Text>
      </View>
    </View>
    <View style={[styles.bottom, fontScale > 1.3 && styles.stacked]}>
      <QuantityStepper value={item.quantity} max={limit} disabled={disabled} busy={pending} productName={item.product.name} onChange={onQuantityChange} />
      <Text accessibilityLabel={`Subtotal de ${item.product.name}: ${formatPrice(item.subtotal, item.product.currency)}`} style={styles.subtotal}>{formatPrice(item.subtotal, item.product.currency)}</Text>
    </View>
    {exceedsStock ? <Text style={styles.stockNotice}>{unavailable ? 'Sin disponibilidad por ahora. Puedes quitarlo de tu bolsa.' : `Disponibles: ${limit}. Ajusta la cantidad antes de continuar.`}</Text> : null}
    {item.quantity >= 25 ? <Text style={styles.limit}>Máximo 25 unidades por aroma.</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: '#E1E9DC', borderRadius: 24, borderWidth: 1, padding: 14 },
  top: { flexDirection: 'row', gap: 13 },
  photo: { borderRadius: 17, height: 91, width: 78 },
  copy: { flex: 1, minWidth: 0 },
  titleRow: { alignItems: 'center', flexDirection: 'row', minHeight: 44 },
  name: { color: colors.text, flex: 1, fontSize: 17, fontWeight: '700', lineHeight: 22 },
  remove: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44, marginRight: -6 },
  presentation: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  unitPrice: { color: colors.primary, fontSize: 12, fontWeight: '600', marginTop: 9 },
  bottom: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginTop: 14 },
  stacked: { alignItems: 'flex-start', flexDirection: 'column' },
  subtotal: { color: colors.primaryDark, flexShrink: 1, fontSize: 20, fontWeight: '800' },
  disabled: { opacity: 0.35 },
  stockNotice: { color: colors.warning, fontSize: 12, lineHeight: 18, marginTop: 12 },
  limit: { color: colors.textMuted, fontSize: 11, marginTop: 8 },
});
