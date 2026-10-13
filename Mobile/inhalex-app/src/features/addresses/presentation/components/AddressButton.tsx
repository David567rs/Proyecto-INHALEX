import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { colors } from '@/core/theme/colors';
import { SoftPressable } from '@/shared/components/Motion';

export function AddressButton({ label, onPress, disabled = false, busy = false, variant = 'primary' }: {
  label: string; onPress(): void; disabled?: boolean; busy?: boolean; variant?: 'primary' | 'secondary' | 'danger';
}) {
  return <SoftPressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => [styles.button, variant === 'secondary' && styles.secondary, variant === 'danger' && styles.danger, (disabled || busy) && styles.disabled, pressed && styles.pressed]}>
    {busy ? <ActivityIndicator color={variant === 'secondary' ? colors.primary : colors.white} /> :
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>}
  </SoftPressable>;
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', backgroundColor: colors.primaryDark, borderRadius: 15, justifyContent: 'center', minHeight: 50, paddingHorizontal: 16, paddingVertical: 12 },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  label: { color: colors.white, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  secondaryLabel: { color: colors.primaryDark },
});
