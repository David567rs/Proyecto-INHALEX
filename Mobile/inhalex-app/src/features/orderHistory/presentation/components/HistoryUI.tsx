import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme/colors';
import { SoftPressable } from '@/shared/components/Motion';
import type { OrderHistoryEntry } from '../../domain/entities/OrderHistory';

export const statusCopy = {
  pending_review: { label: 'Pendiente de revisión', description: 'Recibimos tu solicitud. El equipo de INHALEX revisará tu pedido.', icon: 'time-outline', color: '#805100', background: colors.warningSoft },
  confirmed: { label: 'Confirmado', description: 'INHALEX confirmó tu pedido. El pago y la entrega se coordinan por separado.', icon: 'checkmark-circle-outline', color: colors.primaryDark, background: colors.surfaceSoft },
  completed: { label: 'Completado', description: 'Este pedido figura como completado en INHALEX.', icon: 'checkmark-done-outline', color: colors.primaryDark, background: colors.surfaceSoft },
  cancelled: { label: 'Cancelado', description: 'Este pedido fue cancelado.', icon: 'close-circle-outline', color: colors.danger, background: colors.dangerSoft },
} as const;

export function historyDate(value: string) {
  return new Date(value).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function HistoryStatus({ status }: { status: OrderHistoryEntry['status'] }) {
  const copy = statusCopy[status];
  return <View style={[styles.badge, { backgroundColor: copy.background }]}>
    <Ionicons aria-hidden name={copy.icon} color={copy.color} size={15} />
    <Text style={[styles.badgeText, { color: copy.color }]}>{copy.label}</Text>
  </View>;
}

export function HistoryButton({ label, onPress, busy = false, secondary = false, disabled = false }: {
  label: string; onPress(): void; busy?: boolean; secondary?: boolean; disabled?: boolean;
}) {
  return <SoftPressable accessibilityRole="button" accessibilityLabel={label} disabled={busy || disabled}
    accessibilityState={{ busy, disabled: busy || disabled }} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, (busy || disabled || pressed) && styles.dimmed]}>
    {busy ? <ActivityIndicator color={secondary ? colors.primary : colors.white} /> :
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>}
  </SoftPressable>;
}

export function HistoryBack({ label, onPress }: { label: string; onPress(): void }) {
  return <SoftPressable accessibilityRole="button" accessibilityLabel={`Volver a ${label.toLowerCase()}`} onPress={onPress} style={styles.back}>
    <Ionicons aria-hidden name="arrow-back" size={20} color={colors.primaryDark} /><Text style={styles.backText}>{label}</Text>
  </SoftPressable>;
}

export function HistoryError({ message, onRetry, busy = false, label = 'Reintentar' }: { message: string; onRetry(): void; busy?: boolean; label?: string }) {
  return <View accessibilityLiveRegion="polite" style={styles.error}>
    <Text style={styles.errorText}>{message}</Text><HistoryButton label={label} onPress={onRetry} busy={busy} secondary />
  </View>;
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, flexShrink: 1 },
  badgeText: { fontSize: 11, fontWeight: '700', flexShrink: 1, lineHeight: 16 },
  button: { minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, secondaryText: { color: colors.primaryDark }, dimmed: { opacity: 0.65 },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 44, gap: 8, marginBottom: 12 }, backText: { color: colors.primaryDark, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  error: { backgroundColor: colors.dangerSoft, borderRadius: 16, padding: 16, gap: 12, marginBottom: 16 }, errorText: { color: colors.danger, fontSize: 13, lineHeight: 20 },
});
