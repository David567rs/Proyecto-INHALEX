import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/core/theme/colors';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { validateAddressInput, type AddressInput } from '../../domain/entities/ShippingAddress';
import { AddressButton } from './AddressButton';

type FieldName = Exclude<keyof AddressInput, 'isDefault'>;
type FieldSpec = { name: FieldName; label: string; placeholder: string; maxLength: number; numeric?: boolean };
const fields: FieldSpec[] = [
  { name: 'label', label: 'Nombre de la dirección', placeholder: 'Ej. Casa o trabajo', maxLength: 40 },
  { name: 'recipientName', label: 'Nombre de quien recibe', placeholder: 'Nombre completo', maxLength: 120 },
  { name: 'phone', label: 'Teléfono', placeholder: '10 a 15 dígitos', maxLength: 15, numeric: true },
  { name: 'postalCode', label: 'Código postal', placeholder: '5 dígitos', maxLength: 5, numeric: true },
  { name: 'street', label: 'Calle', placeholder: 'Nombre de la calle', maxLength: 120 },
  { name: 'exteriorNumber', label: 'Número exterior', placeholder: 'Ej. 24 o S/N', maxLength: 20 },
  { name: 'interiorNumber', label: 'Número interior (opcional)', placeholder: 'Departamento o piso', maxLength: 20 },
  { name: 'neighborhood', label: 'Colonia', placeholder: 'Nombre de la colonia', maxLength: 100 },
  { name: 'municipality', label: 'Municipio o alcaldía', placeholder: 'Municipio o alcaldía', maxLength: 100 },
  { name: 'state', label: 'Estado', placeholder: 'Estado de la República', maxLength: 100 },
  { name: 'references', label: 'Referencias (opcional)', placeholder: 'Cómo identificar el domicilio', maxLength: 300 },
];

export function AddressForm({ initial, editing, lockedDefault, pending, canSave, errorMessage, onSave, onClose, onReconcile }: {
  initial: AddressInput; editing: boolean; lockedDefault: boolean; pending: boolean; canSave: boolean; errorMessage: string | null;
  onSave(input: AddressInput): Promise<boolean>; onClose(): void; onReconcile(): void;
}) {
  const reduceMotion = useReducedMotion();
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressInput, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const inputs = useRef<Partial<Record<FieldName, TextInput | null>>>({});
  const scroll = useRef<ScrollView | null>(null);
  const fieldPositions = useRef<Partial<Record<FieldName, number>>>({});

  function change(name: FieldName, value: string) {
    const next = { ...draft, [name]: value };
    setDraft(next);
    if (submitted) setErrors(validateAddressInput(next).errors);
  }

  async function save() {
    if (pending || !canSave) return;
    const validation = validateAddressInput(draft);
    setSubmitted(true);
    setErrors(validation.errors);
    if (!validation.isValid) {
      const first = fields.find((field) => validation.errors[field.name]);
      if (first) {
        scroll.current?.scrollTo({ y: Math.max(0, (fieldPositions.current[first.name] ?? 0) - 12), animated: !reduceMotion });
        inputs.current[first.name]?.focus();
      }
      return;
    }
    if (await onSave(validation.value)) onClose();
  }

  return <Modal visible animationType={reduceMotion === false ? 'slide' : 'none'} onRequestClose={() => { if (!pending) onClose(); }}>
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.heading}><Text style={styles.eyebrow}>Direcciones de envío</Text><Text accessibilityRole="header" style={styles.title}>{editing ? 'Editar dirección' : 'Nueva dirección'}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar formulario de dirección" accessibilityState={{ disabled: pending }} disabled={pending} onPress={onClose} style={styles.close}>
            <Ionicons aria-hidden name="close" size={24} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.hint}>Completa los campos para recibir tus pedidos. Solo el interior y las referencias son opcionales.</Text>
          {submitted && Object.keys(errors).length > 0 ? <Text accessibilityLiveRegion="polite" style={styles.errorSummary}>Revisa los campos señalados.</Text> : null}
          {fields.map((field) => <View key={field.name} style={styles.field} onLayout={(event) => { fieldPositions.current[field.name] = event.nativeEvent.layout.y; }}>
            <Text style={styles.label}>{field.label}</Text>
            <TextInput ref={(input) => { inputs.current[field.name] = input; }}
              accessibilityLabel={field.label} accessibilityHint={errors[field.name]}
              editable={!pending} value={draft[field.name] ?? ''} onChangeText={(value) => change(field.name, value)}
              maxLength={field.maxLength} placeholder={field.placeholder} placeholderTextColor={colors.textMuted}
              keyboardType={field.numeric ? 'number-pad' : 'default'} autoCapitalize={field.numeric ? 'none' : 'sentences'}
              autoCorrect={!field.numeric} multiline={field.name === 'references'}
              style={[styles.input, field.name === 'references' && styles.multiline, errors[field.name] && styles.invalid]} />
            {errors[field.name] ? <Text style={styles.fieldError}>{errors[field.name]}</Text> : null}
          </View>)}
          <View style={styles.defaultRow}>
            <View style={styles.heading}>
              <Text style={styles.label}>Usar como principal</Text>
              <Text style={styles.defaultHint}>{lockedDefault ? 'Siempre tendrás una dirección principal. Puedes elegir otra desde tu lista.' : 'Se elegirá inicialmente cuando abras tus direcciones.'}</Text>
            </View>
            <Switch accessibilityLabel="Usar como dirección principal" disabled={pending || lockedDefault} value={draft.isDefault || lockedDefault}
              onValueChange={(isDefault) => setDraft((current) => ({ ...current, isDefault }))}
              trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.white} />
          </View>
          {errorMessage ? <View accessibilityLiveRegion="polite" style={styles.errorBox}>
            <Text style={styles.fieldError}>{errorMessage}</Text>
            {!canSave && !pending ? <AddressButton label="Actualizar direcciones" variant="secondary" onPress={onReconcile} /> : null}
          </View> : null}
          <View style={styles.buttons}>
            <AddressButton label={editing ? 'Guardar cambios' : 'Guardar dirección'} busy={pending} disabled={!canSave} onPress={() => void save()} />
            <AddressButton label="Cancelar" variant="secondary" disabled={pending} onPress={onClose} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, width: '100%', maxWidth: 600, alignSelf: 'center' },
  heading: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  title: { color: colors.text, fontSize: 25, fontWeight: '800', letterSpacing: -0.5 },
  close: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceSoft, borderRadius: 22 },
  content: { paddingHorizontal: 20, paddingBottom: 32, width: '100%', maxWidth: 600, alignSelf: 'center' },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 22 },
  field: { marginBottom: 17 },
  label: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 7 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, color: colors.text, fontSize: 16, minHeight: 52, paddingHorizontal: 14, paddingVertical: 13 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  invalid: { borderColor: colors.danger },
  fieldError: { color: colors.danger, fontSize: 12, lineHeight: 18, marginTop: 5 },
  errorSummary: { color: colors.danger, marginBottom: 16, fontSize: 13, fontWeight: '700' },
  defaultRow: { alignItems: 'center', flexDirection: 'row', gap: 10, backgroundColor: colors.surfaceSoft, borderRadius: 16, padding: 15, marginBottom: 20 },
  defaultHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  errorBox: { backgroundColor: colors.dangerSoft, padding: 14, borderRadius: 14, gap: 12, marginBottom: 16 },
  buttons: { gap: 10 },
});
