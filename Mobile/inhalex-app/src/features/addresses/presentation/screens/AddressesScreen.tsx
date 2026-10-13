import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/core/theme/colors';
import { useAuthSession } from '@/features/auth/presentation/context/AuthSessionContext';
import { Reveal } from '@/shared/components/Motion';
import { emptyAddressInput, MAX_ADDRESSES, type ShippingAddress } from '../../domain/entities/ShippingAddress';
import type { AddressViewModel } from '../viewModels/AddressesController';
import { useAddressesViewModel } from '../viewModels/useAddressesViewModel';
import { AddressButton } from '../components/AddressButton';
import { AddressCard } from '../components/AddressCard';
import { AddressForm } from '../components/AddressForm';

export function AddressesScreen() {
  const vm = useAddressesViewModel();
  const { refresh } = vm;
  const { user } = useAuthSession();
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return <AddressesView vm={vm} recipientName={user?.name} phone={user?.phone}
    onBack={() => { if (router.canGoBack()) router.back(); else router.replace('/cuenta'); }} />;
}

/** Repository-backed view kept injectable for UI checks without a real customer's address. */
export function AddressesView({ vm, onBack, recipientName = '', phone = '' }: {
  vm: AddressViewModel; onBack(): void; recipientName?: string; phone?: string;
}) {
  const [editor, setEditor] = useState<{ address?: ShippingAddress } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const disabled = vm.pending || !vm.canMutate;
  const atLimit = vm.addresses.length >= MAX_ADDRESSES;
  const loading = vm.status === 'loading';
  const message = vm.actionError ?? vm.errorMessage;

  function edit(address?: ShippingAddress) {
    vm.clearFeedback();
    setDeletingId(null);
    setEditor({ address });
  }

  return <SafeAreaView edges={['top']} style={styles.safe}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={vm.refreshing} onRefresh={() => void vm.refresh()} tintColor={colors.primary} />}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver a mi cuenta" onPress={onBack} style={styles.back}>
        <Ionicons aria-hidden name="arrow-back" color={colors.primaryDark} size={21} /><Text style={styles.backLabel}>Mi cuenta</Text>
      </Pressable>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Tus lugares</Text>
        <Text accessibilityRole="header" style={styles.title}>Direcciones de envío</Text>
        <Text style={styles.subtitle}>Elige dónde recibir tus pedidos y mantén tus datos de entrega al día.</Text>
      </View>
      {message ? <View accessibilityLiveRegion="polite" style={styles.errorBox}>
        <Text style={styles.errorText}>{message}</Text>
        {!vm.canMutate || vm.errorMessage ? <AddressButton label="Actualizar direcciones" variant="secondary" busy={vm.refreshing || loading} onPress={() => void vm.refresh()} /> : null}
      </View> : null}
      {vm.feedback ? <View accessibilityLiveRegion="polite" style={styles.feedback}>
        <Ionicons aria-hidden name="checkmark-circle" color={colors.primary} size={20} /><Text style={styles.feedbackCopy}>{vm.feedback}</Text>
      </View> : null}
      {loading ? <View style={styles.state}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.subtitle}>Cargando tus direcciones…</Text></View> : null}
      {vm.status === 'empty' ? <Reveal style={styles.empty}>
        <View style={styles.emptyIcon}><Ionicons aria-hidden name="location-outline" size={34} color={colors.primary} /></View>
        <Text style={styles.emptyTitle}>Tu próximo pedido empieza aquí</Text>
        <Text style={styles.emptyCopy}>Agrega tu primera dirección. Podrás guardarla como casa, trabajo o cualquier lugar donde recibas tus pedidos.</Text>
      </Reveal> : null}
      {!loading && (vm.status !== 'error' || vm.addresses.length > 0) ? <>
        <View style={styles.toolbar}><Text style={styles.count}>{vm.addresses.length} de {MAX_ADDRESSES} direcciones</Text>
          {vm.pending ? <ActivityIndicator accessibilityLabel="Guardando dirección" size="small" color={colors.primary} /> : null}
        </View>
        <View style={styles.list}>
          {vm.addresses.map((address) => <AddressCard key={address.id} address={address} selected={vm.selectedId === address.id}
            disabled={disabled} confirmingDelete={deletingId === address.id} onSelect={() => vm.select(address.id)} onEdit={() => edit(address)}
            onDefault={() => void vm.makeDefault(address.id)} onDelete={() => setDeletingId(address.id)} onCancelDelete={() => setDeletingId(null)}
            onConfirmDelete={() => { void vm.remove(address.id).then((removed) => { if (removed) setDeletingId(null); }); }} />)}
        </View>
        <AddressButton label="Agregar dirección" disabled={disabled || atLimit} onPress={() => edit()} />
        <Text style={styles.limitHint}>{atLimit ? 'Llegaste al límite de 5 direcciones. Edita o elimina una para agregar otra.' : 'Puedes guardar hasta 5 direcciones. La principal se elige al iniciar una nueva sesión.'}</Text>
      </> : null}
    </ScrollView>
    {editor && (!editor.address || vm.addresses.some((address) => address.id === editor.address?.id)) ? <AddressForm initial={editor.address ? { ...editor.address } : { ...emptyAddressInput(), recipientName, phone, isDefault: vm.addresses.length === 0 }}
      editing={Boolean(editor.address)} lockedDefault={editor.address?.isDefault === true || vm.addresses.length === 0}
      pending={vm.pending} canSave={vm.canMutate} errorMessage={message}
      onSave={(input) => vm.save(input, editor.address?.id)} onClose={() => setEditor(null)}
      onReconcile={() => { setEditor(null); void vm.refresh(); }} /> : null}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 20, paddingBottom: 36, width: '100%', maxWidth: 600, alignSelf: 'center' },
  back: { alignSelf: 'flex-start', alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 44, marginBottom: 12 },
  backLabel: { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
  header: { marginBottom: 24 },
  eyebrow: { color: colors.primary, textTransform: 'uppercase', letterSpacing: 1.3, fontSize: 11, fontWeight: '800', marginBottom: 6 },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 9 },
  state: { alignItems: 'center', justifyContent: 'center', paddingVertical: 70 },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 24, paddingHorizontal: 22, paddingVertical: 30, marginBottom: 16 },
  emptyIcon: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSoft, width: 72, height: 72, borderRadius: 24, marginBottom: 18 },
  emptyTitle: { color: colors.primaryDark, fontSize: 20, fontWeight: '800', textAlign: 'center', lineHeight: 26 },
  emptyCopy: { color: colors.textMuted, fontSize: 13, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  count: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  list: { gap: 14, marginBottom: 18 },
  limitHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 12, textAlign: 'center' },
  errorBox: { backgroundColor: colors.dangerSoft, borderRadius: 16, padding: 15, gap: 12, marginBottom: 16 },
  errorText: { color: colors.danger, fontSize: 13, lineHeight: 20 },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: colors.surfaceSoft, borderRadius: 14, padding: 13, marginBottom: 16 },
  feedbackCopy: { flex: 1, color: colors.primaryDark, fontSize: 13, lineHeight: 19 },
});
