import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/core/theme/colors';
import { AuthScaffold } from '../components/AuthScaffold';
import { PrimaryButton, RequestError } from '../components/AuthControls';
import { FormField } from '../components/FormField';
import { useLoginViewModel } from '../viewModels/useLoginViewModel';

export function LoginScreen() {
  const viewModel = useLoginViewModel();

  return (
    <AuthScaffold
      appearance="minimal"
      title="Bienvenido"
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tienes cuenta?</Text>
          <Pressable
            accessibilityRole="link"
            disabled={viewModel.isSubmitting}
            onPress={() => router.push('/register')}
            style={({ pressed }) => [styles.registerLink, pressed && styles.linkPressed]}
          >
            <Text style={styles.link}>Crear cuenta</Text>
            <Ionicons accessible={false} color={colors.primary} name="arrow-forward" size={15} />
          </Pressable>
        </View>
      }
    >
      <FormField
        appearance="minimal"
        autoCapitalize="none"
        autoComplete="email"
        error={viewModel.errors.email}
        icon="mail-outline"
        keyboardType="email-address"
        label="Correo electrónico"
        onChangeText={(value) => viewModel.updateField('email', value)}
        placeholder="tu@email.com"
        returnKeyType="next"
        textContentType="emailAddress"
        value={viewModel.form.email}
      />
      <FormField
        appearance="minimal"
        autoCapitalize="none"
        autoComplete="current-password"
        error={viewModel.errors.password}
        icon="lock-closed-outline"
        isPassword
        label="Contraseña"
        maxLength={128}
        onChangeText={(value) => viewModel.updateField('password', value)}
        onSubmitEditing={() => void viewModel.submit()}
        placeholder="Tu contraseña"
        returnKeyType="done"
        textContentType="password"
        value={viewModel.form.password}
      />

      <RequestError message={viewModel.requestError} />
      <PrimaryButton
        appearance="minimal"
        label="Entrar"
        loading={viewModel.isSubmitting}
        onPress={() => void viewModel.submit()}
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  footer: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'center' },
  footerText: { color: colors.textMuted, fontSize: 13 },
  registerLink: { alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 44, paddingHorizontal: 8 },
  link: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  linkPressed: { backgroundColor: colors.surfaceSoft },
});
