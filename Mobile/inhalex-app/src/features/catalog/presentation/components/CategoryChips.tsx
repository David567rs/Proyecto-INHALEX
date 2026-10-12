import { useCallback, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Easing, Platform, ScrollView, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import { colors } from '@/core/theme/colors';
import { SoftPressable } from '@/shared/components/Motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

interface CategoryChipsProps {
  categories: readonly { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading?: boolean;
  focused?: boolean;
}

const edgeSpace = 22;

function CategoryButton({ id, label, selected, index, reducedMotion, onSelect }: {
  id: string;
  label: string;
  selected: boolean;
  index: number;
  reducedMotion: boolean | null;
  onSelect: (id: string) => void;
}) {
  const [entry] = useState(() => new Animated.Value(reducedMotion === false ? 0 : 1));

  useEffect(() => {
    if (reducedMotion !== false) { entry.setValue(1); return; }
    const animation = Animated.timing(entry, {
      toValue: 1, duration: 280, delay: Math.min(index, 5) * 30,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [entry, index, reducedMotion]);

  return (
    <Animated.View style={{ opacity: entry, transform: [{ scale: entry.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) }] }}>
      <SoftPressable
        accessibilityLabel={id === 'all' ? 'Todas las líneas' : `Línea ${label}`}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onSelect(id)}
        style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
      >
        {id === 'all' ? <Ionicons aria-hidden name="grid-outline" size={14} color={selected ? colors.white : colors.primary} /> : null}
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      </SoftPressable>
    </Animated.View>
  );
}

/** Presentation-only scroll state; the selected filter still belongs to the ViewModel. */
export function CategoryChips({ categories, selectedId, onSelect, loading = false, focused = true }: CategoryChipsProps) {
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const layouts = useRef(new Map<string, Pick<LayoutRectangle, 'x' | 'width'>>());
  const viewport = useRef({ width: 0, contentWidth: 0, offset: 0 });
  const revealedSelection = useRef<string | null>(null);
  const pendingReveal = useRef(true);
  const motionPreference = useRef<boolean | null>(null);
  const options = [{ id: 'all', name: 'Todos' }, ...categories.filter((category) => category.id !== 'all')];
  const initialLoading = loading && options.length === 1;

  useEffect(() => { motionPreference.current = reducedMotion; }, [reducedMotion]);

  const revealSelection = useCallback((animate: boolean) => {
    if (!focused || !pendingReveal.current) return;
    const chip = layouts.current.get(selectedId);
    const { width, contentWidth, offset } = viewport.current;
    if (!chip || width <= 0 || contentWidth <= 0 || !scrollRef.current) return;
    // A chip can finish layout before the ScrollView reports its new content width.
    if (chip.x + chip.width + edgeSpace > contentWidth + 1) return;

    const availableWidth = width - edgeSpace * 2;
    let target = offset;
    if (chip.width > availableWidth || chip.x < offset + edgeSpace) {
      target = chip.x - edgeSpace;
    } else if (chip.x + chip.width > offset + width - edgeSpace) {
      target = chip.x + chip.width - width + edgeSpace;
    }
    target = Math.max(0, Math.min(target, contentWidth - width));
    const previouslyMeasured = revealedSelection.current !== null;
    revealedSelection.current = selectedId;
    pendingReveal.current = false;
    if (Math.abs(target - offset) <= 1) return;

    viewport.current.offset = target;
    scrollRef.current.scrollTo({
      x: target,
      animated: animate && previouslyMeasured && motionPreference.current === false,
    });
  }, [focused, selectedId]);

  useEffect(() => {
    pendingReveal.current = true;
    revealSelection(true);
  }, [revealSelection]);

  function measureChip(id: string, layout: LayoutRectangle) {
    // Measure the direct row child, rather than the Pressable inside SoftPressable.
    const previous = layouts.current.get(id);
    layouts.current.set(id, { x: layout.x, width: layout.width });
    if (id === selectedId && (previous?.x !== layout.x || previous?.width !== layout.width)) {
      pendingReveal.current = true;
      revealSelection(false);
    }
  }

  return (
    <ScrollView
      ref={scrollRef}
      accessibilityState={{ busy: loading }}
      contentContainerStyle={styles.chips}
      fadingEdgeLength={Platform.OS === 'android' ? 16 : 0}
      horizontal
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={(width) => {
        viewport.current.contentWidth = width;
        revealSelection(false);
      }}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        if (width !== viewport.current.width) {
          viewport.current.width = width;
          pendingReveal.current = true;
          revealSelection(false);
        }
      }}
      onScroll={(event) => { viewport.current.offset = event.nativeEvent.contentOffset.x; }}
      scrollEventThrottle={16}
      showsHorizontalScrollIndicator={false}
    >
      {options.map((category, index) => {
        const selected = selectedId === category.id;
        const label = category.name.replace(/^L[ií]nea\s+/i, '');
        return (
          <View key={category.id} onLayout={(event) => measureChip(category.id, event.nativeEvent.layout)}>
            <CategoryButton id={category.id} label={label} selected={selected} index={index}
              reducedMotion={reducedMotion} onSelect={onSelect} />
          </View>
        );
      })}
      {initialLoading ? (
        <View accessible accessibilityLabel="Cargando líneas" accessibilityState={{ busy: true }}>
          <View aria-hidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.placeholders}>
            {[116, 168, 110].map((width, index) => (
              <View key={index} style={[styles.placeholder, { width }]} />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chips: { alignItems: 'center', gap: 8, paddingHorizontal: edgeSpace, paddingVertical: 4 },
  chip: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 24, borderWidth: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', minHeight: 44, paddingHorizontal: 17, paddingVertical: 10 },
  chipSelected: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  labelSelected: { color: colors.white },
  pressed: { opacity: 0.8 },
  placeholders: { flexDirection: 'row', gap: 8 },
  placeholder: { backgroundColor: '#E8EFE4', borderColor: '#E1E9DD', borderRadius: 24, borderWidth: 1, height: 44 },
});
