import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors } from '@/core/theme/colors';

interface FormFieldProps extends TextInputProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  isPassword?: boolean;
  appearance?: 'default' | 'minimal';
}

export function FormField({
  label,
  icon,
  error,
  isPassword = false,
  appearance = 'default',
  secureTextEntry,
  ...inputProps
}: FormFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const shouldHidePassword = isPassword && !isPasswordVisible;
  const isMinimal = appearance === 'minimal';

  return (
    <View style={[styles.group, isMinimal && styles.minimalGroup]}>
      <Text style={[styles.label, isMinimal && styles.minimalLabel]}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          isMinimal && styles.minimalContainer,
          isMinimal && isPassword && styles.minimalPasswordContainer,
          isFocused && (isMinimal ? styles.minimalContainerFocused : styles.inputContainerFocused),
          error ? styles.inputContainerError : undefined,
        ]}
      >
        <Ionicons
          name={icon}
          color={isFocused ? colors.primary : isMinimal ? '#8A978D' : colors.textMuted}
          size={19}
        />
        <TextInput
          {...inputProps}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          onBlur={(event) => {
            setIsFocused(false);
            inputProps.onBlur?.(event);
          }}
          onFocus={(event) => {
            setIsFocused(true);
            inputProps.onFocus?.(event);
          }}
          placeholderTextColor={isMinimal ? colors.textMuted : '#94A099'}
          secureTextEntry={isPassword ? shouldHidePassword : secureTextEntry}
          style={[
            styles.input,
            isMinimal && styles.minimalInput,
            isMinimal && Platform.OS === 'web' && styles.webInput,
          ]}
        />
        {isPassword ? (
          <Pressable
            accessibilityLabel={isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setIsPasswordVisible((visible) => !visible)}
            style={isMinimal ? styles.passwordToggle : undefined}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              color={colors.textMuted}
              size={21}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 16 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 7 },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  inputContainerFocused: { borderColor: colors.primary, borderWidth: 1.5 },
  inputContainerError: { borderColor: colors.danger },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    minWidth: 0,
    paddingHorizontal: 11,
    paddingVertical: 12,
  },
  minimalGroup: { marginBottom: 20 },
  minimalLabel: { color: '#68766C', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  minimalContainer: {
    backgroundColor: '#F5F8F3',
    borderColor: '#E1E9E0',
    borderRadius: 16,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  minimalPasswordContainer: { paddingRight: 6 },
  minimalContainerFocused: { backgroundColor: '#F9FBF7', borderColor: colors.primary },
  minimalInput: { paddingHorizontal: 12, paddingVertical: 15 },
  passwordToggle: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 },
  webInput: { outlineStyle: 'solid', outlineWidth: 0 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 17, marginLeft: 3, marginTop: 5 },
});
