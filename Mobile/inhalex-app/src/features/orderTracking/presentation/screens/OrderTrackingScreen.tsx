import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, AppState, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/core/theme/colors';
import { formatPrice } from '@/features/catalog/presentation/components/ProductCard';
import { HistoryBack, HistoryButton, HistoryError, statusCopy } from '@/features/orderHistory/presentation/components/HistoryUI';
import type { OrderTracking } from '../../domain/entities/OrderTracking';
import type { OrderTrackingViewModel } from '../viewModels/OrderTrackingController';
import { useOrderTrackingViewModel } from '../viewModels/useOrderTrackingViewModel';

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = typeof id === 'string' ? id.toLowerCase() : '';
  const vm = useOrderTrackingViewModel();
  const { load, refresh, close } = vm;
  useFocusEffect(useCallback(() => {
    void load(orderId);
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active' && previous !== 'active') void refresh();
      previous = next;
    });
    return () => { subscription.remove(); close(); };
  }, [load, refresh, close, orderId]));
  return <OrderTrackingView vm={vm} orderId={orderId}
    onBack={() => { if (router.canGoBack()) router.back(); else router.replace('/cuenta/historial'); }}
    onHistory={() => router.replace('/cuenta/historial')} />;
}

export function OrderTrackingView({ vm, orderId, onBack, onHistory }: {
  vm: OrderTrackingViewModel; orderId: string; onBack(): void; onHistory(): void;
}) {
  const differentOrder = vm.order !== null && vm.order.id !== orderId;
  const order = differentOrder ? null : vm.order;
  const copy = order ? statusCopy[order.status] : null;
  const loading = differentOrder || vm.status === 'idle' || vm.status === 'loading';
  return <SafeAreaView edges={['top']} style={styles.safe}>
    <ScrollView style={styles.frame} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={vm.refreshing} onRefresh={() => void vm.refresh()} tintColor={colors.primary} />}>
      <HistoryBack label="Pedido" onPress={onBack} />
      <Text style={styles.eyebrow}>INHALEX · TUS PEDIDOS</Text>
      <Text accessibilityRole="header" style={styles.title}>Sigue tu pedido.</Text>
      <Text style={styles.subtitle}>Consulta su estado y los avances registrados por nuestro equipo.</Text>
      {loading ? <View accessibilityRole="progressbar" accessibilityLabel="Consultando seguimiento" style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} /><Text style={styles.body}>Consultando tu pedido…</Text>
      </View> : null}
      {!differentOrder && vm.status === 'not-found' ? <View style={styles.card}>
        <Ionicons aria-hidden name="receipt-outline" size={32} color={colors.primary} />
        <Text accessibilityRole="header" style={styles.sectionTitle}>Pedido no disponible</Text>
        <Text style={styles.body}>No encontramos este pedido en tu cuenta. Consulta tus pedidos disponibles en el historial.</Text>
        <HistoryButton label="Ir a mis pedidos" onPress={onHistory} />
      </View> : !differentOrder && vm.errorMessage ? <HistoryError message={vm.errorMessage} onRetry={() => void vm.refresh()} busy={vm.refreshing} /> : null}
      {order && copy ? <>
        <View style={[styles.card, styles.hero]}>
          <View style={styles.heroHeading}>
            <View style={[styles.statusIcon, { backgroundColor: copy.background }]}><Ionicons aria-hidden name={copy.icon} size={28} color={copy.color} /></View>
            <View style={styles.heroCopy}><Text style={styles.label}>Referencia del pedido</Text><Text selectable style={styles.reference}>{order.reference}</Text></View>
          </View>
          <View accessibilityLiveRegion="polite" style={styles.statusBlock}>
            <Text style={styles.label}>{vm.errorMessage ? 'Último estado consultado' : 'Estado del pedido'}</Text>
            <Text accessibilityRole="header" style={[styles.statusTitle, { color: copy.color }]}>{copy.label}</Text>
            <Text style={styles.body}>{copy.description}</Text>
          </View>
          <HistoryButton label="Actualizar estado" onPress={() => void vm.refresh()} busy={vm.refreshing} />
          {vm.updatedAt ? <Text style={styles.checked}>Última consulta: {trackingDate(vm.updatedAt)}</Text> : null}
        </View>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Actividad del pedido</Text>
          <TrackingActivity order={order} />
        </View>
        <View style={styles.card}>
          <View style={styles.summaryRow}><View><Text style={styles.label}>Total de productos</Text><Text style={styles.body}>{order.totalItems} {order.totalItems === 1 ? 'unidad' : 'unidades'}</Text></View><Text style={styles.total}>{formatPrice(order.subtotal, order.currency)}</Text></View>
          <Text style={styles.body}>El pago y la entrega se coordinan con INHALEX.</Text>
          <HistoryButton label="Ir a mis pedidos" onPress={onHistory} secondary />
        </View>
      </> : null}
    </ScrollView>
  </SafeAreaView>;
}

function trackingDate(value: string) {
  return new Date(value).toLocaleString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function TrackingActivity({ order }: { order: OrderTracking }) {
  const events: { key: string; label: string; date: string | null; cancelled?: boolean }[] = [
    { key: 'created', label: 'Pedido recibido', date: order.createdAt },
  ];
  if (order.confirmedAt || order.status === 'confirmed' || order.status === 'completed') {
    events.push({ key: 'confirmed', label: 'Pedido confirmado', date: order.confirmedAt });
  }
  if (order.status === 'cancelled') events.push({ key: 'cancelled', label: 'Pedido cancelado', date: order.cancelledAt, cancelled: true });
  if (order.status === 'completed') events.push({ key: 'completed', label: 'Pedido completado', date: order.completedAt });
  return <View>{events.map((event, index) => <View key={event.key} style={styles.event}>
    <View aria-hidden style={styles.eventRail}>
      <View style={[styles.eventDot, event.cancelled && styles.cancelledDot]}><Ionicons name={event.cancelled ? 'close' : 'checkmark'} size={15} color={colors.white} /></View>
      {index < events.length - 1 ? <View style={styles.eventLine} /> : null}
    </View>
    <View style={styles.eventCopy}><Text style={styles.eventTitle}>{event.label}</Text><Text style={styles.body}>{event.date ? trackingDate(event.date) : 'Fecha no registrada'}</Text></View>
  </View>)}
    {order.status === 'pending_review' ? <Text style={styles.body}>Tu solicitud está pendiente de revisión.</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, frame: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  content: { flexGrow: 1, padding: 20, paddingBottom: 32, gap: 16 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 31, lineHeight: 37, fontWeight: '800', letterSpacing: -0.8, marginTop: -8 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 22, marginTop: -8 },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 22, backgroundColor: colors.surface, padding: 18, gap: 16 },
  hero: { backgroundColor: '#F0F7EA', borderColor: '#CDDEC6' },
  heroHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 }, statusIcon: { borderRadius: 16, padding: 12 }, heroCopy: { flex: 1, gap: 5 },
  label: { color: colors.text, fontSize: 12, fontWeight: '700' }, reference: { color: colors.primaryDark, fontSize: 19, lineHeight: 25, fontWeight: '800' },
  statusBlock: { gap: 8, borderTopWidth: 1, borderColor: '#CDDEC6', paddingTop: 16 }, statusTitle: { fontSize: 25, lineHeight: 31, fontWeight: '800', letterSpacing: -0.5 },
  body: { color: colors.textMuted, fontSize: 13, lineHeight: 21 }, checked: { color: colors.textMuted, fontSize: 11, lineHeight: 18, textAlign: 'center' },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' }, loading: { alignItems: 'center', paddingVertical: 50, gap: 16 },
  event: { flexDirection: 'row', gap: 12, minHeight: 69 }, eventRail: { alignItems: 'center', width: 26 },
  eventDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }, cancelledDot: { backgroundColor: colors.danger },
  eventLine: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 4 }, eventCopy: { flex: 1, paddingBottom: 20, gap: 3 }, eventTitle: { color: colors.text, fontSize: 14, fontWeight: '700', lineHeight: 21 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, total: { color: colors.primaryDark, fontSize: 26, fontWeight: '800' },
});
