import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/core/theme/colors';
import type { passwordChecks } from '../validation/authValidation';

type Checks = ReturnType<typeof passwordChecks>;

const requirements: { key: keyof Checks; label: string }[] = [
  { key: 'length', label: '8 caracteres' },
  { key: 'uppercase', label: 'Una mayúscula' },
  { key: 'number', label: 'Un número' },
  { key: 'special', label: 'Un símbolo' },
];

interface PasswordRequirementsProps {
  checks: Checks;
  appearance?: 'default' | 'minimal';
}

export function PasswordRequirements({ checks, appearance = 'default' }: PasswordRequirementsProps) {
  const isMinimal = appearance === 'minimal';

  return (
    <View style={[styles.container, isMinimal && styles.minimalContainer]}>
      <Text style={[styles.title, isMinimal && styles.minimalTitle]}>Tu contraseña debe incluir:</Text>
      <View style={[styles.grid, isMinimal && styles.minimalGrid]}>
        {requirements.map(({ key, label }) => (
          <View
            key={key}
            accessible
            accessibilityLabel={`${label}: ${checks[key] ? 'cumplido' : 'pendiente'}`}
            style={styles.item}
          >
            <Ionicons
              accessible={false}
              aria-hidden
              color={checks[key] ? colors.success : colors.textMuted}
              name={checks[key] ? 'checkmark-circle' : 'ellipse-outline'}
              size={isMinimal ? 14 : 16}
            />
            <Text style={[styles.label, isMinimal && styles.minimalLabel, checks[key] && styles.labelComplete]}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    marginTop: -6,
    padding: 12,
  },
  minimalContainer: {
    backgroundColor: '#F4F7F1',
    borderRadius: 14,
    borderWidth: 0,
    marginBottom: 20,
    marginTop: -4,
    padding: 12,
  },
  title: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  minimalTitle: { fontSize: 11, fontWeight: '500', lineHeight: 16, marginBottom: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 7 },
  minimalGrid: { rowGap: 8 },
  item: { alignItems: 'center', flexDirection: 'row', gap: 5, width: '50%' },
  label: { color: colors.textMuted, fontSize: 12 },
  minimalLabel: { flexShrink: 1, lineHeight: 17, paddingRight: 3 },
  labelComplete: { color: colors.success, fontWeight: '600' },
});
