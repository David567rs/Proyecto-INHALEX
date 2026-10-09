import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/core/theme/colors';
import { SoftPressable } from '@/shared/components/Motion';

export function RequestError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <View accessibilityLiveRegion="polite" style={styles.errorBox}>
      <Ionicons color={colors.danger} name="alert-circle-outline" size={20} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

interface PrimaryButtonProps {
  label: string;
  loading?: boolean;
  appearance?: 'default' | 'minimal';
  onPress(): void;
}

export function PrimaryButton({ label, loading = false, appearance = 'default', onPress }: PrimaryButtonProps) {
  const Button = appearance === 'minimal' ? SoftPressable : Pressable;

  return (
    <Button
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        appearance === 'minimal' && styles.minimalButton,
        pressed && !loading ? styles.buttonPressed : undefined,
        loading ? styles.buttonDisabled : undefined,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <>
          <Text style={styles.buttonText}>{label}</Text>
          <Ionicons color={colors.white} name="arrow-forward" size={19} />
        </>
      )}
    </Button>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    alignItems: 'flex-start',
    backgroundColor: colors.dangerSoft,
    borderColor: '#F1C4BE',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginBottom: 16,
    padding: 12,
  },
  errorText: { color: colors.danger, flex: 1, fontSize: 13, lineHeight: 19 },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 15,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 52,
    ...Platform.select({
      web: { boxShadow: '0 7px 12px rgba(23, 92, 52, 0.2)' },
      default: {
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 3,
      },
    }),
  },
  minimalButton: {
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    minHeight: 56,
    ...Platform.select({
      web: { boxShadow: '0 5px 12px rgba(23, 92, 52, 0.1)' },
      default: { shadowOpacity: 0.1, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
    }),
  },
  buttonPressed: { backgroundColor: colors.primaryDark, transform: [{ scale: 0.99 }] },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
