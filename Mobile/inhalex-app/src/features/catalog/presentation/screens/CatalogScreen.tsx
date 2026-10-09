import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Keyboard, Pressable, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/core/theme/colors';
import { Reveal, SoftPressable } from '@/shared/components/Motion';
import type { CatalogProduct } from '../../domain/entities/CatalogProduct';
import { CatalogSearch, CategoryChips, CategoryLoadNotice, CatalogRefreshNotice } from '../components/CatalogControls';
import { CatalogState } from '../components/CatalogState';
import { ProductCard } from '../components/ProductCard';
import { useCatalogViewModel } from '../viewModels/useCatalogViewModel';

export default function CatalogScreen() {
  const vm = useCatalogViewModel();
  const { width, fontScale } = useWindowDimensions();
  const columns = width < 360 || fontScale > 1.25 ? 1 : 2;
  const cardWidth = (Math.min(width, 600) - 44 - (columns - 1) * 12) / columns;
  const hasFilters = vm.searchQuery.trim().length > 0 || vm.selectedCategoryId !== 'all';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlatList<CatalogProduct>
        key={columns}
        columnWrapperStyle={columns === 2 ? styles.row : undefined}
        contentContainerStyle={styles.content}
        data={vm.status === 'ready' ? vm.products : []}
        initialNumToRender={6}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(product) => product.id}
        numColumns={columns}
        refreshControl={<RefreshControl refreshing={vm.refreshing} onRefresh={() => void vm.refresh()} colors={[colors.primary]} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        style={styles.list}
        ListHeaderComponent={
          <>
            <Reveal style={styles.inset}>
              <View style={styles.heading}>
                <View style={styles.headingCopy}>
                  <Text style={styles.eyebrow}>COLECCIÓN INHALEX</Text>
                  <Text accessibilityRole="header" style={styles.title}>Un aroma para ti.</Text>
                </View>
                <SoftPressable accessibilityLabel="Volver al inicio" accessibilityRole="button" style={styles.home} onPress={() => router.navigate('/(tabs)')}>
                  <Ionicons aria-hidden name="home-outline" size={21} color={colors.primary} />
                </SoftPressable>
              </View>
              <CatalogSearch value={vm.searchQuery} onChange={vm.setSearchQuery} onSubmit={Keyboard.dismiss} />
            </Reveal>
            <Reveal delay={60} style={styles.filters}>
              <CategoryChips categories={vm.categories} selectedId={vm.selectedCategoryId} onSelect={vm.selectCategory} />
            </Reveal>
            {(vm.status === 'ready' || vm.status === 'empty') && !vm.errorMessage ? <CategoryLoadNotice error={vm.categoriesErrorMessage} onRetry={() => void vm.refresh()} refreshing={vm.refreshing} /> : null}
            {vm.status === 'ready' ? <>
              <CatalogRefreshNotice error={vm.errorMessage} onRetry={() => void vm.refresh()} refreshing={vm.refreshing} />
              <View style={[styles.results, styles.inset]}>
                <Text accessibilityLiveRegion="polite" style={styles.count}>{vm.total} {vm.total === 1 ? 'aroma' : 'aromas'}</Text>
                <Pressable
                  accessibilityLabel="Actualizar catálogo"
                  accessibilityRole="button"
                  accessibilityState={{ busy: vm.refreshing, disabled: vm.refreshing }}
                  disabled={vm.refreshing}
                  onPress={() => void vm.refresh()}
                  style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}
                >
                  {vm.refreshing ? <ActivityIndicator color={colors.primary} size="small" /> : <Ionicons aria-hidden color={colors.primary} name="refresh-outline" size={18} />}
                </Pressable>
              </View>
            </> : null}
          </>
        }
        ListEmptyComponent={<CatalogState status={vm.status} errorMessage={vm.errorMessage} hasFilters={hasFilters} onRetry={() => void vm.retry()} onReset={vm.resetFilters} />}
        renderItem={({ item: product, index }) => (
          <Reveal delay={Math.min(index, 5) * 35} style={[styles.cardShell, columns === 1 && styles.singleCard]}>
            <ProductCard
              product={product}
              width={cardWidth}
              categoryLabel={vm.categories.find((category) => category.id === product.category)?.name ?? 'Colección INHALEX'}
              onPress={() => { Keyboard.dismiss(); void vm.openProduct(product); }}
            />
          </Reveal>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  list: { alignSelf: 'center', flex: 1, maxWidth: 600, width: '100%' },
  content: { flexGrow: 1, paddingBottom: 28 },
  inset: { paddingHorizontal: 22 },
  heading: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 20, marginTop: 24 },
  headingCopy: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: colors.text, fontSize: 29, fontWeight: '700', letterSpacing: -0.8, marginTop: 6 },
  home: { alignItems: 'center', backgroundColor: colors.surfaceSoft, borderRadius: 24, height: 44, justifyContent: 'center', width: 44 },
  filters: { marginTop: 18 },
  results: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, marginTop: 8 },
  count: { color: colors.textMuted, fontSize: 12 },
  refresh: { alignItems: 'center', borderRadius: 22, justifyContent: 'center', minHeight: 44, minWidth: 44 },
  pressed: { backgroundColor: colors.surfaceSoft },
  row: { gap: 12, paddingHorizontal: 22 },
  cardShell: { marginBottom: 12 },
  singleCard: { marginHorizontal: 22 },
});
