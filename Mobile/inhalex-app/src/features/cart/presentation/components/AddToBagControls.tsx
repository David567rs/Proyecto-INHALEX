import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '@/core/theme/colors';
import type { CatalogProduct } from '@/features/catalog/domain/entities/CatalogProduct';
import { SoftPressable } from '@/shared/components/Motion';
import { getCartQuantityLimit } from '../../domain/entities/Cart';
import { useCartViewModel } from '../viewModels/useCartViewModel';
import { QuantityStepper } from './QuantityStepper';
import { CartNotice } from './CartNotice';

/** Keyed by product at the detail overlay, so each aroma starts with one unit. */
export function AddToBagControls({ product }: { product: CatalogProduct }) {
  const vm = useCartViewModel();
  const { width, fontScale } = useWindowDimensions();
  const [quantity, setQuantity] = useState(1);
  const existing = vm.cart.items.find(item => item.productId === product.id);
  const limit = Math.min(getCartQuantityLimit(product), existing ? getCartQuantityLimit(existing.product) : Infinity);
  const available = Math.max(0, limit - (existing?.quantity ?? 0));
  const selected = Math.max(1, Math.min(quantity, available));
  const pending = vm.pendingIds.includes(product.id);
  const disabled = !vm.canMutate || pending || available === 0;
  const stacked = fontScale > 1.2;
  const label = pending ? 'Agregando…' : available === 0 ? (limit === 0 ? 'No disponible' : 'Límite alcanzado') : width < 380 ? 'Agregar' : 'Agregar a bolsa';

  return <View style={styles.section}>
    <CartNotice includeLoadError />
    {existing || available === 0 ? <Text accessibilityLiveRegion="polite" style={styles.hint}>
      {existing ? `${existing.quantity} ${existing.quantity === 1 ? 'unidad' : 'unidades'} en tu bolsa` : 'Este aroma no está disponible por ahora.'}
    </Text> : null}
    <View style={[styles.row, stacked && styles.stacked]}>
      <QuantityStepper value={selected} max={available} disabled={disabled} productName={product.name} onChange={setQuantity} />
      <View style={[styles.buttonShell, stacked && styles.stackedButton]}><SoftPressable accessibilityRole="button" accessibilityLabel={`Agregar ${selected} de ${product.name} a la bolsa`}
        accessibilityState={{ disabled, busy: pending }} disabled={disabled} onPress={() => void vm.add(product, selected)}
        style={[styles.add, disabled && styles.disabled]}>
        {pending ? <ActivityIndicator color={colors.white} size="small" /> : <Ionicons aria-hidden name="bag-add-outline" size={20} color={colors.white} />}
        <Text style={styles.addLabel}>{label}</Text>
      </SoftPressable></View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 8, marginBottom: 10 },
  hint: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  stacked: { alignItems: 'stretch', flexDirection: 'column' },
  buttonShell: { flex: 1, minWidth: 0 },
  stackedButton: { flex: 0 },
  add: { alignItems: 'center', backgroundColor: colors.primaryDark, borderRadius: 16, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 50, paddingHorizontal: 10, paddingVertical: 10 },
  addLabel: { color: colors.white, flexShrink: 1, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  disabled: { opacity: 0.5 },
});
