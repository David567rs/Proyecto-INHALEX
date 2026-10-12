import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors } from '@/core/theme/colors';
import { useBottomSheetDismiss } from '@/shared/components/BottomSheet';
import { SoftPressable } from '@/shared/components/Motion';

/** Navigation accesses only; saving favorites and adding items belong to their modules. */
export function ProductDetailActions({ onOpenFavorites, onOpenBag }: {
  onOpenFavorites: () => void;
  onOpenBag: () => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const dismiss = useBottomSheetDismiss();
  const stacked = width < 360 || fontScale > 1.2;

  return (
    <View style={[styles.actions, stacked && styles.stacked]}>
      <View style={[styles.actionItem, stacked && styles.stackedItem]}>
        <SoftPressable
          accessibilityLabel="Ver mis favoritos"
          accessibilityHint="Cierra el detalle y abre la pestaña Favoritos"
          accessibilityRole="button"
          onPress={() => dismiss(onOpenFavorites)}
          style={({ pressed }) => [styles.button, styles.favoritesButton, pressed && styles.pressed]}
        >
          <Ionicons aria-hidden name="heart-outline" color={colors.primaryDark} size={19} />
          <Text style={[styles.label, styles.favoritesLabel]}>Ver favoritos</Text>
        </SoftPressable>
      </View>
      <View style={[styles.actionItem, stacked && styles.stackedItem]}>
        <SoftPressable
          accessibilityLabel="Ir a mi bolsa de compras"
          accessibilityHint="Cierra el detalle y abre la pestaña Bolsa"
          accessibilityRole="button"
          onPress={() => dismiss(onOpenBag)}
          style={({ pressed }) => [styles.button, styles.bagButton, pressed && styles.pressed]}
        >
          <Ionicons aria-hidden name="bag-handle-outline" color={colors.white} size={19} />
          <Text style={[styles.label, styles.bagLabel]}>Ir a la bolsa</Text>
        </SoftPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10 },
  stacked: { flexDirection: 'column' },
  actionItem: { flexGrow: 1, flexBasis: 0, minWidth: 0 },
  stackedItem: { flexGrow: 0, flexBasis: 'auto' },
  button: { alignItems: 'center', borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 52, paddingHorizontal: 12, paddingVertical: 14 },
  favoritesButton: { backgroundColor: colors.surface, borderColor: colors.border },
  bagButton: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  label: { flexShrink: 1, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  favoritesLabel: { color: colors.primaryDark },
  bagLabel: { color: colors.white },
  pressed: { opacity: 0.8 },
});
