import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useIsFocused } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/core/theme/colors';
import type { CatalogProduct } from '@/features/catalog/domain/entities/CatalogProduct';
import { formatPrice } from '@/features/catalog/presentation/components/ProductCard';
import { useCatalogViewModel } from '@/features/catalog/presentation/viewModels/useCatalogViewModel';
import { Reveal, SoftPressable } from '@/shared/components/Motion';
import type { CartItem } from '../../domain/entities/Cart';
import { CartItemCard } from '../components/CartItemCard';
import { CartNotice } from '../components/CartNotice';
import type { CartViewModel } from '../viewModels/CartController';
import { useCartViewModel } from '../viewModels/useCartViewModel';

export default function CartScreen() {
  const vm = useCartViewModel();
  const catalog = useCatalogViewModel();
  const focused = useIsFocused();
  const refresh = vm.refresh;
  useEffect(() => { if (focused) void refresh(); }, [focused, refresh]);
  return <CartContent vm={vm} onOpenProduct={product => void catalog.openProduct(product)} onExplore={() => router.navigate('/(tabs)/catalogo')} />;
}

export function CartContent({ vm, onOpenProduct, onExplore }: {
  vm: CartViewModel; onOpenProduct: (product: CatalogProduct) => void; onExplore: () => void;
}) {
  const hasItems = vm.cart.items.length > 0;
  const working = vm.pendingIds.length > 0 || vm.refreshing;
  return <SafeAreaView edges={['top']} style={styles.safeArea}>
    <View style={styles.frame}>
      <FlatList<CartItem>
        style={styles.list} contentContainerStyle={styles.content} data={vm.cart.items} extraData={vm}
        keyExtractor={item => item.productId} initialNumToRender={5} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={vm.refreshing} onRefresh={() => void vm.refresh()} colors={[colors.primary]} tintColor={colors.primary} />}
        ListHeaderComponent={<>
          <Reveal style={styles.heading}>
            <View style={styles.headingCopy}><Text style={styles.eyebrow}>COLECCIÓN INHALEX</Text><Text accessibilityRole="header" style={styles.title}>Tu bolsa.</Text></View>
            <View aria-hidden style={styles.bagDisc}><Ionicons name="bag-handle-outline" color={colors.primaryDark} size={26} /></View>
          </Reveal>
          {vm.status !== 'loading' || hasItems ? <View style={styles.toolbar}>
            <Text accessibilityLiveRegion="polite" style={styles.count}>{vm.cart.totalItems} {vm.cart.totalItems === 1 ? 'producto' : 'productos'}</Text>
            <SoftPressable accessibilityRole="button" accessibilityLabel="Actualizar bolsa" accessibilityState={{ disabled: working, busy: working }} disabled={working}
              onPress={() => void vm.refresh()} style={styles.refresh}>
              {working ? <ActivityIndicator color={colors.primary} size="small" /> : <Ionicons aria-hidden name="refresh-outline" color={colors.primary} size={19} />}
            </SoftPressable>
          </View> : null}
          {(vm.actionError || vm.feedback || (vm.errorMessage && (hasItems || vm.status === 'empty'))) ? <View style={styles.notice}><CartNotice includeLoadError /></View> : null}
        </>}
        ListEmptyComponent={vm.status === 'loading' ? <View accessibilityLabel="Cargando bolsa" style={styles.loading}>
          <ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>Preparando tu bolsa…</Text>
        </View> : <CartEmpty failed={vm.status === 'error'} message={vm.errorMessage} onRetry={() => void vm.retry()} onExplore={onExplore} />}
        renderItem={({ item, index }) => <Reveal delay={Math.min(index, 4) * 35} style={styles.item}>
          <CartItemCard item={item} pending={vm.pendingIds.includes(item.productId)} disabled={!vm.canMutate}
            onOpen={() => onOpenProduct(item.product)} onQuantityChange={quantity => void vm.setQuantity(item.productId, quantity)} onRemove={() => void vm.remove(item.productId)} />
        </Reveal>}
      />
      {hasItems ? <View style={styles.summary}>
        <View style={styles.totalRow}><View style={styles.summaryCopy}><Text style={styles.totalLabel}>{!vm.canMutate ? 'Último total confirmado' : 'Total de productos'}</Text>
          <Text style={styles.summaryHint}>{working ? 'Actualizando tu bolsa…' : 'Envío calculado al crear tu pedido.'}</Text></View>
          <Text accessibilityLiveRegion="polite" accessibilityLabel={`Total de productos: ${formatPrice(vm.cart.subtotal, vm.cart.currency)}`} style={styles.total}>{formatPrice(vm.cart.subtotal, vm.cart.currency)}</Text>
        </View>
        <SoftPressable accessibilityRole="button" onPress={onExplore} style={styles.exploreLink}><Text style={styles.exploreLabel}>Seguir explorando</Text><Ionicons aria-hidden name="arrow-forward" color={colors.primaryDark} size={17} /></SoftPressable>
      </View> : null}
    </View>
  </SafeAreaView>;
}

function CartEmpty({ failed, message, onRetry, onExplore }: { failed: boolean; message: string | null; onRetry: () => void; onExplore: () => void }) {
  return <Reveal style={styles.empty}>
    <View aria-hidden style={styles.illustration}><View style={styles.outerRing} /><View style={styles.innerDisc}><Ionicons name={failed ? 'cloud-offline-outline' : 'bag-handle-outline'} size={40} color={colors.primaryDark} /></View>
      <View style={styles.leaf}><Ionicons name="leaf" size={17} color={colors.primary} /></View></View>
    <Text accessibilityRole="header" style={styles.emptyTitle}>{failed ? 'No pudimos cargar tu bolsa' : 'Tu próximo aroma te espera'}</Text>
    <Text accessibilityLiveRegion="polite" style={styles.emptyCopy}>{failed ? (/sesión/i.test(message ?? '') ? 'Tu sesión venció. Ve a Cuenta para iniciar sesión de nuevo.' : 'Revisa tu conexión y vuelve a intentarlo.') : 'Explora la colección y agrega tus aromas favoritos.'}</Text>
    <SoftPressable accessibilityRole="button" onPress={failed ? onRetry : onExplore} style={styles.emptyButton}><Text style={styles.emptyButtonLabel}>{failed ? 'Reintentar' : 'Explorar aromas'}</Text><Ionicons aria-hidden name={failed ? 'refresh-outline' : 'arrow-forward'} color={colors.white} size={18} /></SoftPressable>
  </Reveal>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  frame: { alignSelf: 'center', flex: 1, maxWidth: 600, width: '100%' },
  list: { flex: 1 }, content: { flexGrow: 1, paddingBottom: 24 },
  heading: { alignItems: 'center', flexDirection: 'row', gap: 14, marginTop: 26, marginBottom: 16, paddingHorizontal: 22 },
  headingCopy: { flex: 1 }, eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 33, fontWeight: '700', letterSpacing: -1, marginTop: 6 },
  bagDisc: { alignItems: 'center', backgroundColor: '#EAF3E4', borderRadius: 28, height: 56, justifyContent: 'center', width: 56, transform: [{ rotate: '-6deg' }] },
  toolbar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 22 },
  count: { color: colors.textMuted, fontSize: 12 }, refresh: { alignItems: 'center', justifyContent: 'center', height: 44, width: 44 },
  notice: { marginBottom: 14, marginHorizontal: 22 }, item: { marginBottom: 12, marginHorizontal: 22 },
  summary: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, paddingHorizontal: 22, paddingTop: 19, paddingBottom: 6 },
  totalRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' },
  summaryCopy: { flexGrow: 1, flexShrink: 1 }, totalLabel: { color: colors.text, fontSize: 13, fontWeight: '600' },
  summaryHint: { color: colors.textMuted, fontSize: 10, marginTop: 6 }, total: { color: colors.primaryDark, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  exploreLink: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: 9, minHeight: 44, paddingHorizontal: 12, marginTop: 6 },
  exploreLabel: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  loading: { alignItems: 'center', gap: 14, paddingTop: 85 }, loadingText: { color: colors.textMuted, fontSize: 13 },
  empty: { alignItems: 'center', paddingHorizontal: 28, paddingTop: 38, paddingBottom: 36 },
  illustration: { alignItems: 'center', height: 162, justifyContent: 'center', marginBottom: 24, width: 180 },
  outerRing: { borderColor: '#DFEAD7', borderRadius: 77, borderWidth: 1, height: 154, position: 'absolute', width: 154 },
  innerDisc: { alignItems: 'center', backgroundColor: '#E8F2E0', borderRadius: 55, height: 110, justifyContent: 'center', width: 110 },
  leaf: { alignItems: 'center', backgroundColor: colors.background, borderColor: '#D9E7D1', borderWidth: 1, borderRadius: 20, height: 38, justifyContent: 'center', position: 'absolute', right: 10, top: 18, width: 38, transform: [{ rotate: '20deg' }] },
  emptyTitle: { color: colors.text, fontSize: 23, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  emptyCopy: { color: colors.textMuted, fontSize: 14, lineHeight: 22, marginTop: 11, maxWidth: 290, textAlign: 'center' },
  emptyButton: { alignItems: 'center', backgroundColor: colors.primaryDark, borderRadius: 17, flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 25, minHeight: 52, paddingHorizontal: 24, paddingVertical: 12 },
  emptyButtonLabel: { color: colors.white, fontSize: 14, fontWeight: '700' },
});
