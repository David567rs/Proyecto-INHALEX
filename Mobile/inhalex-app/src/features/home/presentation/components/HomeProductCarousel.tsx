import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme/colors';
import type { CatalogProduct } from '@/features/catalog/domain/entities/CatalogProduct';
import { ProductCard } from '@/features/catalog/presentation/components/ProductCard';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';

interface HomeProductCarouselProps {
  products: CatalogProduct[];
  width: number;
  fontScale: number;
  categoryLabel: (id: string) => string;
  onOpen: (product: CatalogProduct) => void;
}

export function HomeProductCarousel({ products, width, fontScale, categoryLabel, onOpen }: HomeProductCarouselProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [activePage, setActivePage] = useState(0);
  const reducedMotion = useReducedMotion();
  const perPage = width < 316 || fontScale > 1.25 ? 1 : 2;
  const cardWidth = perPage === 2 ? (width - 12) / 2 : Math.min(width, 300);
  const pages = Array.from({ length: Math.ceil(products.length / perPage) }, (_, index) => products.slice(index * perPage, (index + 1) * perPage));
  const pageInterval = width + 12;

  function goToPage(index: number) {
    setActivePage(index);
    scrollRef.current?.scrollTo({ x: index * pageInterval, animated: reducedMotion === false });
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        style={{ width }}
        contentContainerStyle={styles.pages}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        disableIntervalMomentum
        snapToAlignment="start"
        snapToInterval={pageInterval}
        onMomentumScrollEnd={(event) => setActivePage(Math.min(pages.length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / pageInterval))))}
      >
        {pages.map((page, pageIndex) => <View key={pageIndex} style={[styles.page, { width }, perPage === 1 && styles.singlePage]}>
          {page.map((product) => <ProductCard compact key={product.id} product={product} width={cardWidth} categoryLabel={categoryLabel(product.category)} onPress={() => onOpen(product)} />)}
        </View>)}
      </ScrollView>
      {pages.length > 1 ? <View style={styles.navigation}>
        <View style={styles.hint}><Ionicons name="swap-horizontal-outline" size={14} color={colors.textMuted} /><Text style={styles.hintText}>Desliza para explorar</Text></View>
        <View style={styles.dots}>{pages.map((_, index) => <Pressable key={index} accessibilityLabel={`Ver selección ${index + 1} de ${pages.length}`} accessibilityRole="button" accessibilityState={{ selected: index === activePage }} hitSlop={6} onPress={() => goToPage(index)} style={styles.dotButton}>
          <View style={[styles.dot, index === activePage && styles.dotActive]} />
        </Pressable>)}</View>
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 22, marginTop: 16 },
  pages: { gap: 12, paddingBottom: 2 },
  page: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  singlePage: { justifyContent: 'center' },
  navigation: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'space-between', marginTop: 1 },
  hint: { alignItems: 'center', flexDirection: 'row', flexShrink: 1, gap: 6 },
  hintText: { color: colors.textMuted, flexShrink: 1, fontSize: 10 },
  dots: { alignItems: 'center', flexDirection: 'row' },
  dotButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 32 },
  dot: { backgroundColor: '#D9E4D3', borderRadius: 4, height: 5, width: 5 },
  dotActive: { backgroundColor: colors.primary, width: 15 },
});
