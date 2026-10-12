import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme/colors';
import { SoftPressable } from '@/shared/components/Motion';

export function QuantityStepper({ value, max, disabled = false, busy = false, productName, onChange }: {
  value: number; max: number; disabled?: boolean; busy?: boolean; productName: string; onChange: (value: number) => void;
}) {
  const decreaseDisabled = disabled || busy || value <= 1;
  const increaseDisabled = disabled || busy || value >= max;
  return <View style={styles.stepper}>
    <SoftPressable accessibilityRole="button" accessibilityLabel={`Reducir cantidad de ${productName}`}
      accessibilityState={{ disabled: decreaseDisabled }} disabled={decreaseDisabled} onPress={() => onChange(value - 1)}
      style={[styles.button, decreaseDisabled && styles.disabled]}>
      <Ionicons aria-hidden name="remove" size={18} color={colors.primaryDark} />
    </SoftPressable>
    {busy ? <View style={styles.number}><ActivityIndicator accessibilityLabel="Actualizando cantidad" size="small" color={colors.primary} /></View> :
      <Text accessibilityLabel={`${value} ${value === 1 ? 'unidad' : 'unidades'} de ${productName}`} accessibilityLiveRegion="polite" style={styles.number}>{value}</Text>}
    <SoftPressable accessibilityRole="button" accessibilityLabel={`Aumentar cantidad de ${productName}`}
      accessibilityState={{ disabled: increaseDisabled }} disabled={increaseDisabled} onPress={() => onChange(value + 1)}
      style={[styles.button, increaseDisabled && styles.disabled]}>
      <Ionicons aria-hidden name="add" size={18} color={colors.primaryDark} />
    </SoftPressable>
  </View>;
}

const styles = StyleSheet.create({
  stepper: { alignItems: 'center', backgroundColor: colors.surfaceSoft, borderColor: '#DFE9D9', borderRadius: 16, borderWidth: 1, flexDirection: 'row', flexShrink: 0 },
  button: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  disabled: { opacity: 0.3 },
  number: { color: colors.primaryDark, fontSize: 14, fontWeight: '700', textAlign: 'center', width: 26 },
});
