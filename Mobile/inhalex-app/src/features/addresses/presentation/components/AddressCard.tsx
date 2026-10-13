import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme/colors';
import type { ShippingAddress } from '../../domain/entities/ShippingAddress';
import { AddressButton } from './AddressButton';

export function AddressCard({ address, selected, disabled, confirmingDelete, onSelect, onEdit, onDelete, onCancelDelete, onConfirmDelete, onDefault }: {
  address: ShippingAddress; selected: boolean; disabled: boolean; confirmingDelete: boolean;
  onSelect(): void; onEdit(): void; onDelete(): void; onCancelDelete(): void; onConfirmDelete(): void; onDefault(): void;
}) {
  return <View style={[styles.card, selected && styles.selected]}>
    <Pressable accessibilityRole="radio" accessibilityLabel={`Seleccionar ${address.label}`} aria-checked={selected}
      accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onSelect} style={styles.selectArea}>
      <View style={styles.heading}>
        <View style={styles.icon}><Ionicons aria-hidden name="location-outline" color={colors.primaryDark} size={22} /></View>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{address.label}</Text>
          {address.isDefault ? <Text style={styles.defaultLabel}>Principal</Text> : null}
        </View>
        <Ionicons aria-hidden name={selected ? 'radio-button-on' : 'radio-button-off'} size={24} color={selected ? colors.primary : colors.textMuted} />
      </View>
      <Text style={styles.recipient}>{address.recipientName}</Text>
      <Text style={styles.copy}>{address.street} {address.exteriorNumber}{address.interiorNumber ? `, interior ${address.interiorNumber}` : ''}</Text>
      <Text style={styles.copy}>{address.neighborhood}, {address.municipality}</Text>
      <Text style={styles.copy}>{address.state} · C.P. {address.postalCode}</Text>
      <Text style={styles.copy}>Tel. {address.phone}</Text>
      {address.references ? <Text style={styles.references}>{address.references}</Text> : null}
      {selected ? <Text style={styles.selectedLabel}>Seleccionada para envío</Text> : null}
    </Pressable>
    <View style={styles.actions}>
      <Action label="Editar" accessible={`Editar ${address.label}`} icon="create-outline" disabled={disabled} onPress={onEdit} />
      {!address.isDefault ? <Action label="Hacer principal" accessible={`Hacer principal ${address.label}`} icon="star-outline" disabled={disabled} onPress={onDefault} /> : null}
      <Action label="Eliminar" accessible={`Eliminar ${address.label}`} icon="trash-outline" disabled={disabled} onPress={onDelete} danger />
    </View>
    {confirmingDelete ? <View accessibilityLiveRegion="polite" style={styles.confirmation}>
      <Text style={styles.confirmTitle}>¿Eliminar {address.label}?</Text>
      <Text style={styles.copy}>Esta dirección dejará de estar disponible para nuevos pedidos.</Text>
      <View style={styles.confirmActions}>
        <AddressButton label="Sí, eliminar" variant="danger" disabled={disabled} onPress={onConfirmDelete} />
        <AddressButton label="Conservar dirección" variant="secondary" disabled={disabled} onPress={onCancelDelete} />
      </View>
    </View> : null}
  </View>;
}

function Action({ label, accessible, icon, disabled, onPress, danger = false }: {
  label: string; accessible: string; icon: keyof typeof Ionicons.glyphMap; disabled: boolean; onPress(): void; danger?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessible} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.action, disabled && styles.disabled, pressed && styles.pressed]}>
    <Ionicons aria-hidden name={icon} size={17} color={danger ? colors.danger : colors.primaryDark} />
    <Text style={[styles.actionLabel, danger && styles.danger]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
  selected: { borderColor: colors.primary, borderWidth: 2 },
  selectArea: { padding: 18 },
  heading: { alignItems: 'center', flexDirection: 'row', gap: 11, marginBottom: 14 },
  icon: { alignItems: 'center', justifyContent: 'center', height: 42, width: 42, borderRadius: 14, backgroundColor: colors.surfaceSoft },
  headingCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  defaultLabel: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 3 },
  recipient: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 5 },
  copy: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  references: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  selectedLabel: { color: colors.primaryDark, fontSize: 12, fontWeight: '700', marginTop: 12 },
  actions: { borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingVertical: 3, gap: 2 },
  action: { alignItems: 'center', flexDirection: 'row', gap: 5, paddingHorizontal: 9, minHeight: 44 },
  actionLabel: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  danger: { color: colors.danger },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.65 },
  confirmation: { backgroundColor: colors.dangerSoft, padding: 16, gap: 8 },
  confirmTitle: { color: colors.danger, fontSize: 15, fontWeight: '800' },
  confirmActions: { gap: 8, marginTop: 5 },
});
