import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useIsFocused } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/core/theme/colors';
import type { ShippingAddress } from '@/features/addresses/domain/entities/ShippingAddress';
import { AddressButton } from '@/features/addresses/presentation/components/AddressButton';
import type { AddressViewModel } from '@/features/addresses/presentation/viewModels/AddressesController';
import { useAddressesViewModel } from '@/features/addresses/presentation/viewModels/useAddressesViewModel';
import { useCartViewModel } from '@/features/cart/presentation/viewModels/useCartViewModel';
import { formatPrice } from '@/features/catalog/presentation/components/ProductCard';
import { Reveal, SoftPressable } from '@/shared/components/Motion';
import type { OrderContact, OrderPreview, OrderStatus } from '../../domain/entities/Order';
import type { OrdersViewModel } from '../viewModels/OrdersController';
import { useOrdersViewModel } from '../viewModels/useOrdersViewModel';

export default function OrderScreen() {
  const vm = useOrdersViewModel();
  const addresses = useAddressesViewModel();
  const bag = useCartViewModel();
  const focused = useIsFocused();
  const { review, cancelReview, setAddress } = vm;
  const refreshAddresses = addresses.refresh;
  const selected = addresses.addresses.find(address => address.id === addresses.selectedId) ?? null;
  useEffect(() => {
    if (!focused) { cancelReview(); return; }
    if (vm.status === 'idle' && !vm.restoring && !vm.recoveryBlocked && bag.status !== 'loading' && !bag.refreshing) {
      void review(bag.cart.items.map(({ productId, quantity }) => ({ productId, quantity })));
    }
  }, [focused, vm.status, vm.restoring, vm.recoveryBlocked, bag.status, bag.refreshing, bag.cart.items, review, cancelReview]);
  useEffect(() => {
    if (focused && vm.canEdit) setAddress(addresses.errorMessage || addresses.refreshing || addresses.pending ? null : selected);
  }, [focused, vm.canEdit, addresses.errorMessage, addresses.refreshing, addresses.pending, selected, setAddress]);
  useEffect(() => { if (focused) void refreshAddresses(); }, [focused, refreshAddresses]);
  useEffect(() => () => cancelReview(), [cancelReview]);
  return <OrderContent vm={vm} addresses={addresses}
    onBack={() => { cancelReview(); router.replace('/bolsa'); }}
    onManageAddresses={() => router.navigate('/cuenta/direcciones')}
    onReview={() => void review(bag.cart.items.map(({ productId, quantity }) => ({ productId, quantity })))}
    onDone={() => { vm.reset(); router.replace('/bolsa'); }} />;
}

export function OrderContent({ vm, addresses, onBack, onManageAddresses, onReview, onDone }: {
  vm: OrdersViewModel; addresses: AddressViewModel; onBack(): void; onManageAddresses(): void; onReview(): void; onDone(): void;
}) {
  const scroll = useRef<ScrollView>(null);
  const inputs = useRef<Partial<Record<keyof OrderContact, TextInput | null>>>({});
  const contactTop = useRef(0);
  const firstError = Object.keys(vm.contactErrors)[0] as keyof OrderContact | undefined;
  useEffect(() => {
    if (['success', 'uncertain', 'error', 'loading'].includes(vm.status)) scroll.current?.scrollTo({ y: 0, animated: false });
  }, [vm.status]);
  useEffect(() => {
    if (!firstError) return;
    inputs.current[firstError]?.focus();
    scroll.current?.scrollTo({ y: contactTop.current, animated: false });
  }, [firstError, vm.contactErrors]);
  const locked = !vm.canEdit;
  const success = vm.status === 'success' && vm.order;
  const preview = success ? vm.order : vm.preview;
  return <SafeAreaView edges={['top']} style={styles.safe}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.frame}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SoftPressable accessibilityRole="button" accessibilityLabel="Volver a la bolsa" onPress={onBack} style={styles.back}>
          <Ionicons aria-hidden name="arrow-back" size={19} color={colors.primaryDark} /><Text style={styles.backLabel}>Bolsa</Text>
        </SoftPressable>
        <Reveal><Text style={styles.eyebrow}>TU COLECCIÓN, A UN PASO</Text><Text accessibilityRole="header" style={styles.title}>{success ? 'Pedido recibido.' : 'Revisa tu pedido.'}</Text>
          <Text style={styles.subtitle}>{success ? 'Guardamos tu solicitud. Conserva la referencia para consultar tu pedido.' : 'Confirma los productos, tus datos y la dirección de entrega.'}</Text></Reveal>

        {vm.restoring || vm.status === 'loading' ? <View accessibilityRole="progressbar" accessibilityLabel="Preparando resumen del pedido" style={styles.loading}>
          <ActivityIndicator color={colors.primary} /><Text style={styles.body}>{vm.restoring ? 'Recuperando tu pedido…' : 'Consultando precios y disponibilidad…'}</Text>
        </View> : null}
        {vm.errorMessage ? <View accessibilityLiveRegion="polite" style={styles.notice}><Text style={styles.noticeText}>{vm.errorMessage}</Text></View> : null}
        {vm.recoveryBlocked ? <AddressButton label="Recuperar pedido pendiente" onPress={() => void vm.retryRecovery()} /> : null}
        {vm.status === 'error' && !vm.recoveryBlocked ? <AddressButton label="Actualizar resumen" onPress={onReview} variant="secondary" /> : null}
        {vm.status === 'uncertain' ? <View style={styles.card}>
          <Ionicons aria-hidden name="cloud-offline-outline" size={27} color={colors.primaryDark} />
          <Text accessibilityRole="header" style={styles.sectionTitle}>Vamos a verificar tu pedido</Text>
          <Text style={styles.body}>El envío pudo haberse completado. Conservamos este intento para recuperar la confirmación sin crear otro pedido.</Text>
          <AddressButton label="Verificar confirmación" onPress={() => void vm.retryConfirmation()} />
        </View> : null}

        {success ? <View style={[styles.card, styles.successCard]}>
          <View style={styles.successHeading}><Ionicons aria-hidden name="checkmark-circle" size={32} color={colors.primary} /><Text style={styles.sectionTitle}>Tu referencia</Text></View>
          <Text selectable accessibilityLabel={`Referencia ${success.reference}`} style={styles.reference}>{success.reference}</Text>
          <Text style={styles.status}>{orderStatusLabel(success.status)}</Text>
          <Text style={styles.body}>{success.status === 'pending_review' ? 'El equipo de INHALEX revisará tu pedido. El pago y la entrega se coordinarán posteriormente.' : 'Este es el estado registrado para tu pedido.'}</Text>
          {vm.cleanupStatus === 'pending' ? <Text accessibilityLiveRegion="polite" style={styles.body}>Actualizando tu bolsa…</Text> : null}
          {vm.cleanupStatus === 'changed' ? <Text style={styles.body}>Tu bolsa cambió durante el proceso. Conservamos su contenido actualizado; revísalo antes de hacer otro pedido.</Text> : null}
          {vm.cleanupStatus === 'failed' ? <><Text style={styles.body}>El pedido ya está registrado. Falta actualizar tu bolsa.</Text><AddressButton label="Reintentar actualización de bolsa" onPress={() => void vm.retryCleanup()} variant="secondary" /></> : null}
          {vm.cleanupStatus === 'cleared' || vm.cleanupStatus === 'changed' ? <AddressButton label="Volver a mi bolsa" onPress={onDone} /> : null}
        </View> : null}

        {preview ? <OrderSummary preview={preview} /> : null}

        {!success && preview ? <>
          <View style={styles.card} onLayout={event => { contactTop.current = event.nativeEvent.layout.y; }}>
            <StepTitle number="02" title="Datos de contacto" />
            <Text style={styles.body}>Usaremos estos datos para dar seguimiento a tu pedido.</Text>
            {contactFields.map(field => <View key={field.key} style={styles.field}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput ref={input => { inputs.current[field.key] = input; }} accessibilityLabel={field.label}
                accessibilityState={{ disabled: locked }} editable={!locked} value={vm.contact[field.key]}
                onChangeText={text => vm.setContact(field.key, text)} maxLength={field.key === 'customerPhone' ? 15 : 120}
                keyboardType={field.key === 'customerEmail' ? 'email-address' : field.key === 'customerPhone' ? 'phone-pad' : 'default'}
                autoCapitalize={field.key === 'customerName' ? 'words' : 'none'} autoCorrect={false}
                autoComplete={field.key === 'customerName' ? 'name' : field.key === 'customerEmail' ? 'email' : 'tel'}
                style={[styles.input, locked && styles.inputDisabled, vm.contactErrors[field.key] && styles.invalid]} />
              {vm.contactErrors[field.key] ? <Text accessibilityLiveRegion="polite" style={styles.error}>{vm.contactErrors[field.key]}</Text> : null}
            </View>)}
          </View>
          <View style={styles.card}>
            <StepTitle number="03" title="Dirección de entrega" />
            {locked ? vm.address ? <AddressDetails address={vm.address} /> : null : <>
              {addresses.status === 'loading' || addresses.refreshing ? <Text style={styles.body}>Actualizando direcciones…</Text> : null}
              {addresses.errorMessage ? <><Text style={styles.error}>No pudimos verificar tus direcciones. Actualízalas antes de confirmar.</Text><AddressButton label="Actualizar direcciones" onPress={() => void addresses.refresh()} variant="secondary" busy={addresses.refreshing} /></> : null}
              {addresses.addresses.map(address => <SoftPressable key={address.id} accessibilityRole="radio" aria-checked={vm.address?.id === address.id}
                accessibilityLabel={`${address.label}, ${address.street} ${address.exteriorNumber}, ${address.postalCode}`}
                accessibilityState={{ checked: vm.address?.id === address.id, disabled: addresses.refreshing || addresses.pending || !!addresses.errorMessage }}
                disabled={addresses.refreshing || addresses.pending || !!addresses.errorMessage}
                onPress={() => { addresses.select(address.id); vm.setAddress(address); }} style={[styles.address, vm.address?.id === address.id && styles.selectedAddress]}>
                <View style={styles.addressHeading}><Ionicons aria-hidden name={vm.address?.id === address.id ? 'radio-button-on' : 'radio-button-off'} size={21} color={colors.primary} /><Text style={styles.addressLabel}>{address.label}</Text>{address.isDefault ? <Text style={styles.badge}>Principal</Text> : null}</View>
                <AddressDetails address={address} />
              </SoftPressable>)}
              {addresses.status === 'empty' ? <Text style={styles.body}>Agrega una dirección para recibir tu pedido.</Text> : null}
              <AddressButton label={addresses.addresses.length ? 'Administrar direcciones' : 'Agregar dirección'} onPress={onManageAddresses} variant="secondary" />
            </>}
            {vm.addressError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{vm.addressError}</Text> : null}
          </View>
        </> : null}
        {!success && preview && vm.status !== 'uncertain' ? <View style={styles.confirmBlock}>
          <Text style={styles.body}>Al confirmar enviaremos tu pedido para revisión. El importe mostrado corresponde a los productos; el envío se coordinará posteriormente.</Text>
          <AddressButton label="Confirmar pedido" onPress={() => void vm.confirm()} disabled={!vm.canConfirm || addresses.refreshing || addresses.pending || !!addresses.errorMessage}
            busy={vm.status === 'confirming'} />
          {vm.canEdit ? <AddressButton label="Modificar mi bolsa" onPress={onBack} variant="secondary" /> : null}
        </View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const contactFields: { key: keyof OrderContact; label: string }[] = [
  { key: 'customerName', label: 'Nombre completo' }, { key: 'customerEmail', label: 'Correo electrónico' }, { key: 'customerPhone', label: 'Teléfono de contacto' },
];

function orderStatusLabel(status: OrderStatus) { return { pending_review: 'Pendiente de revisión', confirmed: 'Confirmado', completed: 'Completado', cancelled: 'Cancelado' }[status]; }

function StepTitle({ number, title }: { number: string; title: string }) {
  return <View style={styles.step}><Text aria-hidden style={styles.stepNumber}>{number}</Text><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text></View>;
}

function AddressDetails({ address }: { address: ShippingAddress }) {
  return <View style={styles.addressCopy}><Text style={styles.addressRecipient}>{address.recipientName}</Text>
    <Text style={styles.body}>{address.street} {address.exteriorNumber}{address.interiorNumber ? `, interior ${address.interiorNumber}` : ''}</Text>
    <Text style={styles.body}>{address.neighborhood}, {address.municipality}, {address.state}, C. P. {address.postalCode}</Text>
    <Text style={styles.body}>Tel. {address.phone}</Text>{address.references ? <Text style={styles.body}>Referencias: {address.references}</Text> : null}
  </View>;
}

function OrderSummary({ preview }: { preview: OrderPreview }) {
  return <View style={styles.card}>
    <StepTitle number="01" title="Resumen de productos" />
    {preview.items.map(item => <View key={item.productId} style={styles.item}>
      <View style={styles.itemRow}><Text style={styles.productName}>{item.productName}</Text><Text style={styles.itemPrice}>{formatPrice(item.subtotal, item.currency)}</Text></View>
      <Text style={styles.body}>{item.quantity} × {formatPrice(item.unitPrice, item.currency)}{item.presentation ? ` · ${item.presentation}` : ''}</Text>
      {item.requestedQuantity !== item.quantity ? <Text style={styles.adjusted}>Cantidad ajustada de {item.requestedQuantity} a {item.quantity}.</Text> : null}
      {item.message ? <Text style={styles.body}>{item.message}</Text> : null}
    </View>)}
    {preview.issues.map((issue, index) => <View key={`${issue.code}-${index}`} style={styles.issue}><Text style={styles.issueTitle}>{issue.title}</Text><Text style={styles.body}>{issue.description}</Text></View>)}
    <View style={styles.totalRow}><View><Text style={styles.label}>Total de productos</Text><Text style={styles.body}>{preview.totalItems} {preview.totalItems === 1 ? 'unidad' : 'unidades'}</Text></View><Text style={styles.total}>{formatPrice(preview.subtotal, preview.currency)}</Text></View>
    {!preview.canConfirmOrder ? <Text accessibilityLiveRegion="polite" style={styles.error}>Revisa tu bolsa: estos productos no se pueden confirmar en este momento.</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, frame: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: 640 },
  content: { paddingHorizontal: 20, paddingBottom: 30, gap: 18 }, back: { alignSelf: 'flex-start', minHeight: 44, flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6 },
  backLabel: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 }, eyebrow: { fontSize: 10, letterSpacing: 1.7, color: colors.primary, fontWeight: '700' },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 7 }, subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 22, marginTop: 10 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 18, gap: 15 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 9 }, stepNumber: { color: colors.primary, backgroundColor: colors.surfaceSoft, borderRadius: 9, padding: 7, fontSize: 11, fontWeight: '800' },
  sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 17, flexShrink: 1 }, body: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  loading: { alignItems: 'center', gap: 14, paddingVertical: 28 }, notice: { backgroundColor: colors.warningSoft, borderRadius: 15, padding: 16 }, noticeText: { color: colors.text, fontSize: 13, lineHeight: 21 },
  item: { paddingBottom: 13, borderBottomWidth: 1, borderColor: colors.border, gap: 7 }, itemRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' },
  productName: { color: colors.text, fontSize: 14, fontWeight: '700', flexGrow: 1, flexShrink: 1, flexBasis: 130 }, itemPrice: { color: colors.text, fontWeight: '700', fontSize: 14 },
  issue: { backgroundColor: colors.warningSoft, borderRadius: 12, padding: 12, gap: 4 }, issueTitle: { color: colors.text, fontSize: 13, fontWeight: '700' }, adjusted: { color: colors.warning, fontSize: 12, lineHeight: 18 },
  totalRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, total: { color: colors.primaryDark, fontSize: 27, fontWeight: '800', letterSpacing: -0.6 },
  field: { gap: 7 }, label: { color: colors.text, fontSize: 12, fontWeight: '700' }, input: { borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 48, fontSize: 15, color: colors.text, backgroundColor: colors.background },
  inputDisabled: { opacity: 0.7 }, invalid: { borderColor: colors.danger }, error: { color: colors.danger, fontSize: 12, lineHeight: 19 },
  address: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 13, gap: 10 }, selectedAddress: { borderColor: colors.primary, backgroundColor: '#F4F9F1' },
  addressHeading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 }, addressLabel: { color: colors.text, fontSize: 14, fontWeight: '700', flexShrink: 1 }, badge: { color: colors.primaryDark, backgroundColor: colors.surfaceSoft, fontSize: 10, fontWeight: '700', borderRadius: 8, padding: 5 },
  addressCopy: { gap: 2 }, addressRecipient: { color: colors.text, fontWeight: '600', fontSize: 13, lineHeight: 20 }, confirmBlock: { gap: 12 },
  successCard: { borderColor: '#BBD6AF', backgroundColor: '#F0F7EA' }, successHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, reference: { fontWeight: '800', fontSize: 23, color: colors.primaryDark }, status: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
});
