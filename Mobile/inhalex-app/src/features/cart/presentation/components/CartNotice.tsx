import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme/colors';
import { SoftPressable } from '@/shared/components/Motion';
import { useCartViewModel } from '../viewModels/useCartViewModel';

export function CartNotice({ includeLoadError = false }: { includeLoadError?: boolean }) {
  const vm = useCartViewModel();
  const loadError = includeLoadError ? vm.errorMessage : null;
  const message = vm.actionError?.message ?? loadError ?? vm.feedback?.message;
  if (!message) return null;
  const failed = Boolean(vm.actionError || loadError);
  const needsRefresh = failed && (!vm.canMutate || Boolean(loadError));
  return <View accessibilityLiveRegion="polite" style={[styles.notice, failed && styles.failed]}>
    <Ionicons aria-hidden name={failed ? 'cloud-offline-outline' : 'checkmark-circle'} size={18} color={failed ? colors.danger : colors.primary} />
    <Text style={[styles.copy, failed && styles.error]}>{message}</Text>
    {needsRefresh ? <SoftPressable accessibilityRole="button" accessibilityLabel="Volver a cargar la bolsa" disabled={vm.refreshing || vm.status === 'loading'} onPress={() => void vm.refresh()} style={styles.action}>
      {vm.refreshing || vm.status === 'loading' ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.retry}>Actualizar</Text>}
    </SoftPressable> : <SoftPressable accessibilityRole="button" accessibilityLabel="Cerrar aviso de bolsa" onPress={failed ? vm.clearActionError : vm.clearFeedback} style={styles.close}>
      <Ionicons aria-hidden name="close" size={17} color={failed ? colors.danger : colors.primaryDark} />
    </SoftPressable>}
  </View>;
}

const styles = StyleSheet.create({
  notice: { alignItems: 'center', backgroundColor: '#EDF5E7', borderColor: '#D5E5CC', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 8, minHeight: 50, paddingLeft: 12, paddingRight: 3 },
  failed: { backgroundColor: '#FFF6F2', borderColor: '#F0DCD3' },
  copy: { color: colors.primaryDark, flex: 1, fontSize: 12, lineHeight: 18, paddingVertical: 9 },
  error: { color: colors.danger },
  action: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 8 },
  retry: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  close: { alignItems: 'center', justifyContent: 'center', height: 44, width: 44 },
});
