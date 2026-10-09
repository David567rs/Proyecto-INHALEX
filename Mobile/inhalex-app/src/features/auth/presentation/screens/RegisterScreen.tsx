import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/core/theme/colors';
import { AuthScaffold } from '../components/AuthScaffold';
import { PrimaryButton, RequestError } from '../components/AuthControls';
import { FormField } from '../components/FormField';
import { PasswordRequirements } from '../components/PasswordRequirements';
import { useRegisterViewModel } from '../viewModels/useRegisterViewModel';

export function RegisterScreen() {
  const viewModel = useRegisterViewModel();

  return (
    <AuthScaffold
      appearance="minimal"
      backdrop="mirrored"
      layout="scrollable"
      title="Crear cuenta"
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tienes una cuenta?</Text>
          <Pressable
            accessibilityRole="link"
            disabled={viewModel.isSubmitting}
            onPress={() => router.replace('/sign-in')}
            style={({ pressed }) => [styles.loginLink, pressed && styles.linkPressed]}
          >
            <Ionicons accessible={false} color={colors.primary} name="arrow-back" size={15} />
            <Text style={styles.link}>Inicia sesión</Text>
          </Pressable>
        </View>
      }
    >
      <FormField
        appearance="minimal"
        autoCapitalize="words"
        autoComplete="name-given"
        error={viewModel.errors.firstName}
        icon="person-outline"
        label="Nombre"
        maxLength={50}
        onChangeText={(value) => viewModel.updateField('firstName', value)}
        placeholder="Tu nombre"
        textContentType="givenName"
        value={viewModel.form.firstName}
      />
      <FormField
        appearance="minimal"
        autoCapitalize="words"
        autoComplete="name-family"
        error={viewModel.errors.lastName}
        icon="person-outline"
        label="Apellido"
        maxLength={50}
        onChangeText={(value) => viewModel.updateField('lastName', value)}
        placeholder="Tu apellido"
        textContentType="familyName"
        value={viewModel.form.lastName}
      />
      <FormField
        appearance="minimal"
        autoCapitalize="none"
        autoComplete="email"
        error={viewModel.errors.email}
        icon="mail-outline"
        keyboardType="email-address"
        label="Correo electrónico"
        maxLength={120}
        onChangeText={(value) => viewModel.updateField('email', value)}
        placeholder="tu@email.com"
        textContentType="emailAddress"
        value={viewModel.form.email}
      />
      <FormField
        appearance="minimal"
        autoComplete="tel"
        error={viewModel.errors.phone}
        icon="call-outline"
        keyboardType="phone-pad"
        label="Número telefónico"
        maxLength={15}
        onChangeText={(value) => viewModel.updateField('phone', value)}
        placeholder="5512345678"
        textContentType="telephoneNumber"
        value={viewModel.form.phone}
      />
      <FormField
        appearance="minimal"
        autoCapitalize="none"
        autoComplete="new-password"
        error={viewModel.errors.password}
        icon="lock-closed-outline"
        isPassword
        label="Contraseña"
        maxLength={128}
        onChangeText={(value) => viewModel.updateField('password', value)}
        placeholder="Tu contraseña"
        textContentType="newPassword"
        value={viewModel.form.password}
      />
      <PasswordRequirements appearance="minimal" checks={viewModel.checks} />
      <FormField
        appearance="minimal"
        autoCapitalize="none"
        autoComplete="new-password"
        error={viewModel.errors.confirmPassword}
        icon="shield-checkmark-outline"
        isPassword
        label="Confirmar contraseña"
        maxLength={128}
        onChangeText={(value) => viewModel.updateField('confirmPassword', value)}
        onSubmitEditing={() => void viewModel.submit()}
        placeholder="Repítela"
        returnKeyType="done"
        textContentType="newPassword"
        value={viewModel.form.confirmPassword}
      />

      <RequestError message={viewModel.requestError} />
      <PrimaryButton
        appearance="minimal"
        label="Crear cuenta"
        loading={viewModel.isSubmitting}
        onPress={() => void viewModel.submit()}
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'center' },
  footerText: { color: colors.textMuted, fontSize: 13 },
  loginLink: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 44, paddingHorizontal: 8 },
  link: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  linkPressed: { backgroundColor: colors.surfaceSoft },
});
