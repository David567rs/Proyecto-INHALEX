import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/core/theme/colors';
import { formatPrice } from '@/features/catalog/presentation/components/ProductCard';
import { Reveal, SoftPressable } from '@/shared/components/Motion';
import type { OrderHistoryEntry } from '../../domain/entities/OrderHistory';
import { HistoryBack, HistoryButton, HistoryError, HistoryStatus, historyDate, statusCopy } from '../components/HistoryUI';
import type { OrderHistoryViewModel } from '../viewModels/OrderHistoryController';
import { useOrderHistoryViewModel } from '../viewModels/useOrderHistoryViewModel';

export default function OrderHistoryScreen() {
  const vm = useOrderHistoryViewModel();
  const { refresh } = vm;
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return <OrderHistoryView vm={vm} onBack={() => router.replace('/cuenta')}
    onCatalog={() => router.navigate('/catalogo')}
    onSelect={id => router.push({ pathname: '/cuenta/historial/[id]', params: { id } })} />;
}

export function OrderHistoryView({ vm, onBack, onCatalog, onSelect }: {
  vm: OrderHistoryViewModel; onBack(): void; onCatalog(): void; onSelect(id: string): void;
}) {
  const loading = vm.status === 'idle' || vm.status === 'loading';
  return <SafeAreaView edges={['top']} style={styles.safe}>
    <FlatList data={vm.orders} keyExtractor={item => item.id} style={styles.frame}
      contentContainerStyle={styles.content} ItemSeparatorComponent={Separator}
      refreshControl={<RefreshControl refreshing={vm.refreshing} onRefresh={() => void vm.refresh()} tintColor={colors.primary} />}
      ListHeaderComponent={<>
        <HistoryBack label="Mi cuenta" onPress={onBack} />
        <Reveal style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons aria-hidden name="receipt-outline" size={25} color={colors.white} /></View>
          <Text style={styles.eyebrow}>TU HISTORIA CON INHALEX</Text>
          <Text accessibilityRole="header" style={styles.title}>Mis pedidos</Text>
          <Text style={styles.heroCopy}>Tus productos, sus detalles y el estado de cada pedido, en un solo lugar.</Text>
        </Reveal>
        {vm.errorMessage ? <HistoryError message={vm.errorMessage}
          onRetry={() => void vm.refresh()} busy={vm.refreshing} label="Actualizar historial" /> : null}
        <View style={styles.toolbar}>
          <View style={styles.toolbarCopy}><Text style={styles.sectionTitle}>Historial de pedidos</Text><Text style={styles.orderHint}>Más recientes primero</Text></View>
          <SoftPressable accessibilityRole="button" accessibilityLabel="Actualizar historial" disabled={loading || vm.refreshing}
            accessibilityState={{ disabled: loading || vm.refreshing, busy: vm.refreshing }} onPress={() => void vm.refresh()} style={styles.refresh}>
            {vm.refreshing ? <ActivityIndicator color={colors.primary} /> : <Ionicons aria-hidden name="refresh" size={21} color={colors.primary} />}
          </SoftPressable>
        </View>
      </>}
      ListEmptyComponent={loading ? <View accessibilityRole="progressbar" accessibilityLabel="Cargando historial" style={styles.state}>
        <ActivityIndicator size="large" color={colors.primary} /><Text style={styles.body}>Consultando tus pedidos…</Text>
      </View> : vm.status === 'empty' ? <Reveal style={styles.empty}>
        <View style={styles.emptyIcon}><Ionicons aria-hidden name="bag-handle-outline" size={34} color={colors.primary} /></View>
        <Text style={styles.emptyTitle}>Aún no tienes pedidos</Text><Text style={styles.emptyText}>Cuando confirmes tu primer pedido, podrás consultar sus detalles aquí.</Text>
        <HistoryButton label="Explorar productos" onPress={onCatalog} />
      </Reveal> : null}
      renderItem={({ item }) => <OrderHistoryCard order={item} onPress={() => onSelect(item.id)} />}
      ListFooterComponent={<View style={styles.footer}>
        {vm.loadMoreError ? <HistoryError message={vm.loadMoreError} onRetry={() => void (vm.hasMore ? vm.loadMore() : vm.refresh())} busy={vm.loadingMore || vm.refreshing} label={vm.hasMore ? 'Reintentar más pedidos' : 'Actualizar historial'} /> : null}
        {vm.hasMore && !vm.loadMoreError ? <HistoryButton label="Ver más pedidos" onPress={() => void vm.loadMore()} busy={vm.loadingMore} disabled={vm.refreshing} secondary /> : null}
        {vm.orders.length > 0 ? <Text style={styles.footnote}>{vm.orders.length} {vm.orders.length === 1 ? 'pedido mostrado' : 'pedidos mostrados'}{!vm.hasMore && !vm.loadMoreError && !vm.errorMessage ? ' · Estás al día' : ''}</Text> : null}
      </View>} />
  </SafeAreaView>;
}

function Separator() { return <View style={styles.separator} />; }

function OrderHistoryCard({ order, onPress }: { order: OrderHistoryEntry; onPress(): void }) {
  return <SoftPressable accessibilityRole="button" accessibilityLabel={`Pedido ${order.reference}, ${historyDate(order.createdAt)}, ${statusCopy[order.status].label}, ${formatPrice(order.subtotal, order.currency)}. Ver detalle.`}
    onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
    <View style={styles.cardHeader}><Text style={styles.reference}>{order.reference}</Text><Ionicons aria-hidden name="chevron-forward" color={colors.primary} size={19} /></View>
    <Text style={styles.date}>{historyDate(order.createdAt)}</Text>
    <View style={styles.cardMiddle}><HistoryStatus status={order.status} /></View>
    <View style={styles.cardBottom}><View style={styles.totalCopy}><Text style={styles.totalLabel}>Total de productos</Text><Text style={styles.units}>{order.totalItems} {order.totalItems === 1 ? 'unidad' : 'unidades'}</Text></View>
      <Text style={styles.amount}>{formatPrice(order.subtotal, order.currency)}</Text></View>
  </SoftPressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, frame: { width: '100%', maxWidth: 640, alignSelf: 'center' }, content: { flexGrow: 1, padding: 20, paddingBottom: 32 },
  hero: { backgroundColor: colors.primaryDark, borderRadius: 24, padding: 23, marginBottom: 24 }, heroIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#2C7047', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  eyebrow: { color: '#CDE5BE', fontSize: 10, fontWeight: '700', letterSpacing: 1.3 }, title: { color: colors.white, fontSize: 32, letterSpacing: -1, fontWeight: '800', marginTop: 7 }, heroCopy: { color: '#E2EFDC', fontSize: 13, lineHeight: 21, marginTop: 10 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16 }, toolbarCopy: { flex: 1 }, sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, orderHint: { color: colors.textMuted, fontSize: 12, marginTop: 4 }, refresh: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surfaceSoft },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 18 }, cardPressed: { backgroundColor: colors.surfaceSoft }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' }, reference: { color: colors.text, fontSize: 15, fontWeight: '800', flex: 1 }, date: { color: colors.textMuted, fontSize: 12, marginTop: 6 }, cardMiddle: { marginTop: 14, marginBottom: 16 },
  cardBottom: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, alignItems: 'center' }, totalCopy: { flexShrink: 1 }, totalLabel: { color: colors.textMuted, fontSize: 11 }, units: { color: colors.text, fontSize: 12, fontWeight: '600', marginTop: 4 }, amount: { color: colors.primaryDark, fontSize: 22, fontWeight: '800', letterSpacing: -0.6 }, separator: { height: 14 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 14 }, body: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  empty: { backgroundColor: colors.surface, padding: 24, borderWidth: 1, borderColor: colors.border, borderRadius: 22, gap: 14 }, emptyIcon: { width: 70, height: 70, backgroundColor: colors.surfaceSoft, borderRadius: 24, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }, emptyTitle: { color: colors.primaryDark, fontSize: 20, fontWeight: '800', textAlign: 'center' }, emptyText: { color: colors.textMuted, fontSize: 13, lineHeight: 21, textAlign: 'center', marginBottom: 6 },
  footer: { paddingTop: 20 }, footnote: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 16 },
});
