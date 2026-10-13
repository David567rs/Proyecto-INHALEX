import { useCallback, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/core/theme/colors';
import { HistoryBack, HistoryButton, HistoryError } from '@/features/orderHistory/presentation/components/HistoryUI';
import type { ProfileInput } from '../../domain/entities/Profile';
import type { ProfileViewModel } from '../viewModels/ProfileController';
import { useProfileViewModel } from '../viewModels/useProfileViewModel';

export default function ProfileScreen() {
  const vm = useProfileViewModel();
  const { refresh } = vm;
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return <ProfileView vm={vm} onBack={() => { if (router.canGoBack()) router.back(); else router.replace('/cuenta'); }} />;
}

export function ProfileView({ vm, onBack }: { vm: ProfileViewModel; onBack(): void }) {
  const inputs = useRef<Partial<Record<keyof ProfileInput, TextInput | null>>>({});
  const focusAfterSave = useRef(false);
  const firstError = Object.keys(vm.fieldErrors)[0] as keyof ProfileInput | undefined;
  useEffect(() => {
    if (!focusAfterSave.current) return;
    focusAfterSave.current = false;
    if (firstError) inputs.current[firstError]?.focus();
  }, [firstError, vm.fieldErrors]);
  const locked = vm.saving || vm.refreshing;
  return <SafeAreaView edges={['top']} style={styles.safe}>
    <KeyboardAvoidingView style={styles.frame} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <HistoryBack label="Mi cuenta" onPress={onBack} />
        <Text style={styles.eyebrow}>INHALEX · MI CUENTA</Text>
        <Text accessibilityRole="header" style={styles.title}>Tus datos personales.</Text>
        <Text style={styles.subtitle}>Mantén tu información al día para que podamos estar en contacto contigo.</Text>
        {vm.status === 'loading' || vm.status === 'idle' ? <View style={styles.loading} accessibilityRole="progressbar" accessibilityLabel="Consultando perfil">
          <ActivityIndicator size="large" color={colors.primary} /><Text style={styles.body}>Consultando tus datos…</Text>
        </View> : null}
        {vm.errorMessage && !vm.profile ? <View accessibilityLiveRegion="polite"><HistoryError message={vm.errorMessage} onRetry={() => void vm.refresh()} busy={vm.refreshing} /></View> : null}
        {vm.profile ? <>
          <View style={styles.identity}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{vm.profile.name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('')}</Text></View>
            <View style={styles.identityCopy}><Text style={styles.savedLabel}>TU PERFIL</Text><Text style={styles.savedName}>{vm.profile.name}</Text></View>
          </View>
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>Información de contacto</Text>
            <View style={styles.email}>
              <View style={styles.emailLabel}><Ionicons aria-hidden name="mail-outline" size={18} color={colors.primaryDark} /><Text style={styles.label}>Correo electrónico</Text></View>
              <Text selectable style={styles.emailText}>{vm.profile.email}</Text>
              <Text style={styles.hint}>Este es el correo con el que accedes a tu cuenta. Se muestra solo para consulta.</Text>
            </View>
            {fields.map(field => <View key={field.key} style={styles.field}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput ref={input => { inputs.current[field.key] = input; }} accessibilityLabel={field.label}
                accessibilityHint={field.hint} accessibilityState={{ disabled: locked }} editable={!locked}
                value={vm.form[field.key]} onChangeText={value => vm.setField(field.key, value)}
                maxLength={field.key === 'phone' ? 15 : 50} autoCorrect={false}
                autoCapitalize={field.key === 'phone' ? 'none' : 'words'} keyboardType={field.key === 'phone' ? 'phone-pad' : 'default'}
                autoComplete={field.key === 'firstName' ? 'given-name' : field.key === 'lastName' ? 'family-name' : 'tel'}
                textContentType={field.key === 'firstName' ? 'givenName' : field.key === 'lastName' ? 'familyName' : 'telephoneNumber'}
                style={[styles.input, locked && styles.disabledInput, vm.fieldErrors[field.key] && styles.invalid]} />
              {vm.fieldErrors[field.key] ? <Text accessibilityLiveRegion="polite" style={styles.fieldError}>{vm.fieldErrors[field.key]}</Text> : <Text style={styles.hint}>{field.hint}</Text>}
            </View>)}
            {vm.errorMessage ? <View accessibilityLiveRegion="polite" style={styles.warning}><Ionicons aria-hidden name="alert-circle-outline" size={22} color={colors.warning} /><Text style={styles.warningText}>{vm.errorMessage}</Text></View> : null}
            {vm.successMessage ? <View accessibilityLiveRegion="polite" style={styles.success}><Ionicons aria-hidden name="checkmark-circle-outline" size={23} color={colors.primary} /><Text style={styles.successText}>{vm.successMessage}</Text></View> : null}
            <HistoryButton label="Guardar cambios" onPress={() => { focusAfterSave.current = true; void vm.save(); }} busy={vm.saving} disabled={!vm.dirty || vm.refreshing} />
            {vm.dirty ? <>
              <Text style={styles.draft}>Tienes cambios sin guardar.</Text>
              <HistoryButton label="Descartar cambios" onPress={vm.discard} secondary disabled={locked} />
            </> : null}
          </View>
          <HistoryButton label="Actualizar datos" onPress={() => void vm.refresh()} busy={vm.refreshing} secondary disabled={vm.dirty || vm.saving} />
          <Text style={styles.footer}>{vm.dirty ? 'Guarda o descarta los cambios antes de actualizar los datos.' : 'Puedes volver a consultar tus datos cuando lo necesites.'}</Text>
        </> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const fields: { key: keyof ProfileInput; label: string; hint: string }[] = [
  { key: 'firstName', label: 'Nombre(s)', hint: 'Entre 2 y 50 caracteres.' },
  { key: 'lastName', label: 'Apellidos', hint: 'Entre 2 y 50 caracteres.' },
  { key: 'phone', label: 'Teléfono', hint: 'De 10 a 15 dígitos, sin espacios ni signos.' },
];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, frame: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  content: { flexGrow: 1, padding: 20, paddingBottom: 36, gap: 16 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  title: { color: colors.text, fontSize: 31, lineHeight: 37, fontWeight: '800', letterSpacing: -0.8, marginTop: -8 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 22, marginTop: -8 },
  loading: { alignItems: 'center', paddingVertical: 50, gap: 16 }, body: { color: colors.textMuted, fontSize: 13, lineHeight: 21 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 18, borderRadius: 22, gap: 20 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, backgroundColor: colors.surfaceSoft, borderRadius: 20 },
  avatar: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.white, fontSize: 20, fontWeight: '800' }, identityCopy: { flex: 1, gap: 6 }, savedLabel: { color: colors.primary, fontSize: 9, letterSpacing: 1.2, fontWeight: '700' },
  savedName: { color: colors.text, fontSize: 17, lineHeight: 23, fontWeight: '800' }, sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  email: { backgroundColor: colors.background, padding: 13, borderRadius: 14, gap: 9 }, emailLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emailText: { color: colors.text, fontSize: 14, lineHeight: 21 }, label: { color: colors.text, fontSize: 12, fontWeight: '700' }, hint: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  field: { gap: 8 }, input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, borderRadius: 12, padding: 12, minHeight: 48, fontSize: 15 },
  disabledInput: { opacity: 0.65 }, invalid: { borderColor: colors.danger }, fieldError: { color: colors.danger, fontSize: 12, lineHeight: 19 },
  warning: { backgroundColor: colors.warningSoft, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 10 }, warningText: { color: colors.text, flex: 1, fontSize: 13, lineHeight: 21 },
  success: { backgroundColor: colors.surfaceSoft, borderColor: '#CDDEC6', borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 10 }, successText: { color: colors.primaryDark, flex: 1, fontSize: 13, lineHeight: 21, fontWeight: '700' },
  draft: { color: colors.warning, fontSize: 12, textAlign: 'center' }, footer: { color: colors.textMuted, fontSize: 11, lineHeight: 18, textAlign: 'center' },
});
