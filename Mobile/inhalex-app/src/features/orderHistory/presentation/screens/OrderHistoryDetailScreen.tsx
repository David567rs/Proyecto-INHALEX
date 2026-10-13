import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/core/theme/colors';
import { formatPrice } from '@/features/catalog/presentation/components/ProductCard';
import { HistoryBack, HistoryButton, HistoryError, HistoryStatus, historyDate, statusCopy } from '../components/HistoryUI';
import type { OrderHistoryViewModel } from '../viewModels/OrderHistoryController';
import { useOrderHistoryViewModel } from '../viewModels/useOrderHistoryViewModel';

export default function OrderHistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = typeof id === 'string' ? id.toLowerCase() : '';
  const vm = useOrderHistoryViewModel();
  const { loadDetail, closeDetail } = vm;
  const active = vm.status !== 'idle';
  useFocusEffect(useCallback(() => { if (active) void loadDetail(orderId); return closeDetail; }, [loadDetail, closeDetail, orderId, active]));
  return <OrderHistoryDetailView vm={vm} orderId={orderId}
    onBack={() => { if (router.canGoBack()) router.back(); else router.replace('/cuenta/historial'); }} />;
}

export function OrderHistoryDetailView({ vm, orderId, onBack }: { vm: OrderHistoryViewModel; orderId: string; onBack(): void }) {
  const current = vm.selectedId === orderId;
  const order = current && vm.detail?.id === orderId && vm.detailStatus === 'ready' ? vm.detail : null;
  const sessionError = !vm.selectedId && vm.detailStatus === 'error' ? vm.detailError : null;
  const loading = !sessionError && (!current || vm.detailStatus === 'loading' || vm.detailStatus === 'idle');
  const missing = current && vm.detailStatus === 'not-found';
  const address = order?.shippingAddress;
  return <SafeAreaView edges={['top']} style={styles.safe}>
    <ScrollView style={styles.frame} contentContainerStyle={styles.content}>
      <HistoryBack label="Mis pedidos" onPress={onBack} />
      <Text style={styles.eyebrow}>CADA DETALLE, A LA MANO</Text>
      <Text accessibilityRole="header" style={styles.title}>Detalle del pedido</Text>
      {loading ? <View accessibilityRole="progressbar" accessibilityLabel="Cargando detalle" style={styles.state}>
        <ActivityIndicator size="large" color={colors.primary} /><Text style={styles.body}>Consultando tu pedido…</Text>
      </View> : null}
      {sessionError ? <HistoryError message={sessionError} onRetry={() => void vm.loadDetail(orderId)} /> : null}
      {missing ? <View style={styles.card}>
        <Ionicons aria-hidden name="receipt-outline" size={32} color={colors.primary} /><Text style={styles.sectionTitle}>Pedido no disponible</Text>
        <Text style={styles.body}>No encontramos este pedido en tu cuenta. Vuelve al historial para consultar tus pedidos disponibles.</Text>
        <HistoryButton label="Volver al historial" onPress={onBack} />
      </View> : current && vm.detailError ? <HistoryError message={vm.detailError} onRetry={() => void vm.loadDetail(orderId)} /> : null}
      {order ? <>
        <View style={[styles.card, styles.summary]}>
          <Text style={styles.label}>Referencia</Text><Text selectable style={styles.reference}>{order.reference}</Text>
          <Text style={styles.body}>{historyDate(order.createdAt)}</Text><HistoryStatus status={order.status} />
          <Text style={styles.body}>{statusCopy[order.status].description}</Text>
        </View>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Productos de tu pedido</Text>
          {order.items.map(item => <View key={item.productId} style={styles.item}>
            <View style={styles.itemHeader}><View style={styles.quantity}><Text style={styles.quantityText}>{item.quantity}×</Text></View>
              <View style={styles.itemCopy}><Text style={styles.itemName}>{item.productName}</Text>{item.presentation ? <Text style={styles.body}>{item.presentation}</Text> : null}</View></View>
            <View style={styles.priceRow}><Text style={styles.body}>{formatPrice(item.unitPrice, item.currency)} por unidad</Text><Text style={styles.itemTotal}>{formatPrice(item.subtotal, item.currency)}</Text></View>
          </View>)}
          <View style={styles.totalRow}><View><Text style={styles.label}>Total de productos</Text><Text style={styles.body}>{order.totalItems} {order.totalItems === 1 ? 'unidad' : 'unidades'}</Text></View><Text style={styles.total}>{formatPrice(order.subtotal, order.currency)}</Text></View>
          <Text style={styles.hint}>Importes registrados al crear tu pedido. El envío y el pago se coordinan por separado.</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.addressHeader}><Ionicons aria-hidden name="location-outline" size={22} color={colors.primary} /><Text accessibilityRole="header" style={styles.sectionTitle}>Dirección de entrega</Text></View>
          {address ? <>
            <Text style={styles.addressName}>{address.label} · {address.recipientName}</Text>
            <Text style={styles.body}>{address.street} {address.exteriorNumber}{address.interiorNumber ? `, interior ${address.interiorNumber}` : ''}{'\n'}{address.neighborhood}{'\n'}{address.municipality}, {address.state}{'\n'}C. P. {address.postalCode}</Text>
            <Text style={styles.body}>Tel. {address.phone}</Text>{address.references ? <Text style={styles.body}>Referencias: {address.references}</Text> : null}
            <Text style={styles.hint}>Esta es la dirección guardada con el pedido.</Text>
          </> : <Text style={styles.body}>Este pedido no tiene una dirección de entrega registrada.</Text>}
        </View>
        <HistoryButton label="Volver al historial" onPress={onBack} secondary />
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, frame: { width: '100%', maxWidth: 640, alignSelf: 'center' }, content: { flexGrow: 1, padding: 20, paddingBottom: 32, gap: 16 },
  eyebrow: { color: colors.primary, fontWeight: '700', fontSize: 10, letterSpacing: 1.4 }, title: { fontSize: 29, lineHeight: 35, fontWeight: '800', color: colors.text, letterSpacing: -0.7, marginTop: -8, marginBottom: 4 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 18, gap: 13 }, summary: { backgroundColor: colors.surfaceSoft, borderColor: '#CDDEC6' }, label: { color: colors.text, fontSize: 12, fontWeight: '700' }, reference: { color: colors.primaryDark, fontSize: 23, fontWeight: '800', letterSpacing: -0.4 }, body: { color: colors.textMuted, fontSize: 13, lineHeight: 21 }, sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800', flexShrink: 1 },
  state: { alignItems: 'center', paddingVertical: 60, gap: 16 }, item: { borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 12, gap: 12 }, itemHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, quantity: { backgroundColor: colors.surfaceSoft, minWidth: 38, minHeight: 38, padding: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, quantityText: { color: colors.primaryDark, fontWeight: '800', fontSize: 13 }, itemCopy: { flex: 1 }, itemName: { color: colors.text, fontWeight: '700', fontSize: 14, lineHeight: 20 }, priceRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, itemTotal: { color: colors.text, fontSize: 14, fontWeight: '700' },
  totalRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14, paddingTop: 6 }, total: { color: colors.primaryDark, fontWeight: '800', fontSize: 26, letterSpacing: -0.5 }, hint: { color: colors.textMuted, fontSize: 11, lineHeight: 18 }, addressHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 }, addressName: { color: colors.text, fontSize: 14, fontWeight: '700', lineHeight: 21 },
});
