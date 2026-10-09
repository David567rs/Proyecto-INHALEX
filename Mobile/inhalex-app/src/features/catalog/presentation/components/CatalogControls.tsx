import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '@/core/theme/colors';
import { SoftPressable } from '@/shared/components/Motion';

export function CatalogSearch({ value, onChange, onSubmit }: { value: string; onChange: (value: string) => void; onSubmit?: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.search, focused && styles.searchFocused]}>
      <Ionicons aria-hidden name="search-outline" size={21} color={colors.primary} />
      <TextInput
        accessibilityLabel="Buscar aromas"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChange}
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        onSubmitEditing={onSubmit}
        placeholder="Busca tu próximo aroma"
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        style={[styles.input, Platform.OS === 'web' && styles.webInput]}
        value={value}
      />
      {value.length > 0 ? (
        <Pressable accessibilityLabel="Limpiar búsqueda" accessibilityRole="button" hitSlop={6} onPress={() => onChange('')} style={styles.clear}>
          <Ionicons aria-hidden name="close-circle" color={colors.textMuted} size={20} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function CategoryChips({ categories, selectedId, onSelect }: {
  categories: readonly { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const options = [{ id: 'all', name: 'Todos' }, ...categories.filter((category) => category.id !== 'all')];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.map((category) => {
        const selected = selectedId === category.id;
        return (
          <SoftPressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={category.id}
            onPress={() => onSelect(category.id)}
            style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
          >
            {category.id === 'all' ? <Ionicons aria-hidden name="grid-outline" size={14} color={selected ? colors.white : colors.primary} /> : null}
            <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{category.name.replace(/^L[ií]nea\s+/i, '')}</Text>
          </SoftPressable>
        );
      })}
    </ScrollView>
  );
}

export function CategoryLoadNotice({ error, onRetry, refreshing = false }: { error: string | null; onRetry: () => void; refreshing?: boolean }) {
  if (!error) return null;
  return <View accessibilityLiveRegion="polite" style={styles.categoryNotice}>
    <Text style={styles.noticeText}>No pudimos actualizar las líneas.</Text>
    <SoftPressable accessibilityRole="button" accessibilityState={{ disabled: refreshing }} disabled={refreshing} onPress={onRetry} style={styles.noticeRetry}><Text style={styles.noticeRetryLabel}>Reintentar</Text></SoftPressable>
  </View>;
}

export function CatalogRefreshNotice({ error, onRetry, refreshing = false }: { error: string | null; onRetry: () => void; refreshing?: boolean }) {
  if (!error) return null;
  return <View accessibilityLiveRegion="polite" style={styles.categoryNotice}>
    <View style={styles.noticeCopy}>
      <Text style={styles.noticeTitle}>No se pudo actualizar</Text>
      <Text style={styles.noticeText}>Mostramos la última consulta.</Text>
    </View>
    <SoftPressable accessibilityRole="button" accessibilityState={{ disabled: refreshing }} disabled={refreshing} onPress={onRetry} style={styles.noticeRetry}><Text style={styles.noticeRetryLabel}>Reintentar</Text></SoftPressable>
  </View>;
}

const styles = StyleSheet.create({
  search: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 10, minHeight: 53, paddingLeft: 16, paddingRight: 8 },
  searchFocused: { borderColor: colors.primary },
  input: { color: colors.text, flex: 1, fontSize: 14, minHeight: 51, minWidth: 0, paddingVertical: 12 },
  webInput: { outlineStyle: 'solid', outlineWidth: 0 },
  clear: { alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44 },
  chips: { gap: 8, paddingHorizontal: 22, paddingVertical: 4 },
  chip: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 24, borderWidth: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 44, paddingHorizontal: 17 },
  chipSelected: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  chipLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipLabelSelected: { color: colors.white },
  pressed: { opacity: 0.75 },
  categoryNotice: { alignItems: 'center', backgroundColor: colors.surfaceSoft, borderRadius: 14, flexDirection: 'row', gap: 12, marginHorizontal: 22, marginTop: 12, paddingHorizontal: 13, paddingVertical: 8 },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: colors.text, fontSize: 12, fontWeight: '600', marginBottom: 3 },
  noticeText: { color: colors.textMuted, flexShrink: 1, fontSize: 12, lineHeight: 18 },
  noticeRetry: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 4 },
  noticeRetryLabel: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
});
