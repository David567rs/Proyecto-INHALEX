import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/core/theme/colors';
import type { CatalogProduct } from '@/features/catalog/domain/entities/CatalogProduct';
import { SoftPressable } from '@/shared/components/Motion';
import { useFavoritesViewModel } from '../viewModels/useFavoritesViewModel';

export function FavoriteButton({ product, variant = 'floating' }: {
  product: CatalogProduct;
  variant?: 'floating' | 'detail';
}) {
  const vm = useFavoritesViewModel();
  const selected = vm.products.some((favorite) => favorite.id === product.id);
  const pending = vm.pendingIds.includes(product.id);
  const unknown = vm.status === 'loading' || vm.status === 'error';
  const disabled = pending || unknown;

  return (
    <SoftPressable
      accessibilityRole="button"
      accessibilityLabel={`${selected ? 'Quitar de favoritos' : 'Guardar en favoritos'}: ${product.name}`}
      accessibilityHint={unknown ? 'Espera a que carguen tus favoritos o vuelve a intentarlo desde la pestaña Favoritos.' : undefined}
      accessibilityState={{ selected, disabled, busy: pending || vm.status === 'loading' }}
      disabled={disabled}
      onPress={() => void vm.toggle(product)}
      style={({ pressed }) => [
        styles.button,
        variant === 'detail' && styles.detail,
        selected && styles.selected,
        unknown && styles.unknown,
        pressed && styles.pressed,
      ]}
    >
      {pending ? <ActivityIndicator color={colors.primaryDark} size="small" /> : (
        <Ionicons aria-hidden name={selected ? 'heart' : 'heart-outline'} size={21} color={colors.primaryDark} />
      )}
    </SoftPressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', backgroundColor: '#FFFFFFF2', borderColor: '#DCE7DDAA', borderRadius: 23, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  detail: { backgroundColor: colors.surfaceSoft, height: 48, width: 48, borderRadius: 24 },
  selected: { backgroundColor: '#EAF4E4', borderColor: '#D3E5CB' },
  unknown: { opacity: 0.55 },
  pressed: { backgroundColor: '#DCEBCD' },
});
