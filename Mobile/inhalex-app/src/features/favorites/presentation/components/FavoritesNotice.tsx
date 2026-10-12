import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme/colors';
import { SoftPressable } from '@/shared/components/Motion';
import { useFavoritesViewModel } from '../viewModels/useFavoritesViewModel';

/** Used in the active detail modal as well as above the tab bar. */
export function FavoritesNotice({ productId, includeLoadError = false }: {
  productId?: string;
  includeLoadError?: boolean;
}) {
  const vm = useFavoritesViewModel();
  const actionError = vm.actionError && (!productId || vm.actionError.productId === productId) ? vm.actionError : null;
  const loadError = includeLoadError && vm.status === 'error';
  if (!actionError && !vm.feedback && !loadError) return null;
  const failed = Boolean(actionError || loadError);
  const message = actionError?.message ?? (loadError ? vm.errorMessage : vm.feedback?.message);

  return (
    <View accessibilityLiveRegion="polite" style={[styles.notice, failed && styles.failed]}>
      <Ionicons aria-hidden name={failed ? 'cloud-offline-outline' : 'checkmark-circle'} size={19} color={failed ? colors.danger : colors.primary} />
      <Text style={[styles.text, failed && styles.errorText]}>{message}</Text>
      {loadError && !actionError ? (
        <SoftPressable accessibilityRole="button" accessibilityLabel="Volver a cargar favoritos" disabled={vm.refreshing}
          onPress={() => void vm.retry()} style={styles.action}>
          {vm.refreshing ? <ActivityIndicator size="small" color={colors.primaryDark} /> : <Text style={styles.actionLabel}>Reintentar</Text>}
        </SoftPressable>
      ) : (
        <SoftPressable accessibilityRole="button" accessibilityLabel="Cerrar aviso de favoritos"
          onPress={actionError ? vm.clearActionError : vm.clearFeedback} style={styles.close}>
          <Ionicons aria-hidden name="close" size={17} color={failed ? colors.danger : colors.primaryDark} />
        </SoftPressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { alignItems: 'center', backgroundColor: '#EDF5E7', borderColor: '#D5E5CC', borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 9, paddingLeft: 14, paddingRight: 4, minHeight: 52 },
  failed: { backgroundColor: '#FFF6F2', borderColor: '#F0DCD3' },
  text: { color: colors.primaryDark, flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 18, paddingVertical: 10 },
  errorText: { color: colors.danger },
  action: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 9 },
  actionLabel: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  close: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 },
});
