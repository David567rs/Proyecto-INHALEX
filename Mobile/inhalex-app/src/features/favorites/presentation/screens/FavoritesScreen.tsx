import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router, useIsFocused } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/core/theme/colors';
import type { CatalogCategory, CatalogProduct } from '@/features/catalog/domain/entities/CatalogProduct';
import { ProductCard } from '@/features/catalog/presentation/components/ProductCard';
import { CatalogState } from '@/features/catalog/presentation/components/CatalogState';
import { useCatalogViewModel } from '@/features/catalog/presentation/viewModels/useCatalogViewModel';
import { Reveal, SoftPressable } from '@/shared/components/Motion';
import { FavoriteButton } from '../components/FavoriteButton';
import { FavoritesNotice } from '../components/FavoritesNotice';
import type { FavoritesViewModel } from '../viewModels/FavoritesController';
import { useFavoritesViewModel } from '../viewModels/useFavoritesViewModel';

export default function FavoritesScreen() {
  const vm = useFavoritesViewModel();
  const catalog = useCatalogViewModel();
  const focused = useIsFocused();
  const refresh = vm.refresh;

  useEffect(() => {
    if (focused) void refresh();
  }, [focused, refresh]);

  return <FavoritesContent vm={vm} categories={catalog.categories}
    onOpenProduct={(product) => void catalog.openProduct(product)}
    onExplore={() => router.navigate('/(tabs)/catalogo')} />;
}

export function FavoritesContent({ vm, categories, onOpenProduct, onExplore }: {
  vm: FavoritesViewModel;
  categories: CatalogCategory[];
  onOpenProduct: (product: CatalogProduct) => void;
  onExplore: () => void;
}) {
  const { width, fontScale } = useWindowDimensions();
  const columns = width < 360 || fontScale > 1.25 ? 1 : 2;
  const cardWidth = (Math.min(width, 600) - 44 - (columns - 1) * 12) / columns;
  const hasProducts = vm.products.length > 0;
  const canRefresh = vm.status === 'ready' || vm.status === 'empty';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlatList<CatalogProduct>
        key={columns}
        style={styles.list}
        contentContainerStyle={styles.content}
        data={vm.products}
        extraData={vm.pendingIds}
        keyExtractor={(product) => product.id}
        numColumns={columns}
        columnWrapperStyle={columns === 2 ? styles.row : undefined}
        initialNumToRender={6}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={vm.refreshing} onRefresh={() => void vm.refresh()} colors={[colors.primary]} tintColor={colors.primary} />}
        ListHeaderComponent={<>
          <Reveal style={styles.header}>
            <View style={styles.headingCopy}>
              <Text style={styles.eyebrow}>TU SELECCIÓN</Text>
              <Text accessibilityRole="header" style={styles.title}>Favoritos.</Text>
            </View>
            <View aria-hidden style={styles.headingHeart}><Ionicons name="heart" color={colors.primaryDark} size={24} /></View>
          </Reveal>
          {canRefresh || hasProducts ? <View style={styles.toolbar}>
            <Text accessibilityLiveRegion="polite" style={styles.count}>{vm.products.length} {vm.products.length === 1 ? 'aroma guardado' : 'aromas guardados'}</Text>
            <SoftPressable accessibilityRole="button" accessibilityLabel="Actualizar favoritos" accessibilityState={{ busy: vm.refreshing, disabled: vm.refreshing }}
              disabled={vm.refreshing} onPress={() => void vm.refresh()} style={styles.refresh}>
              {vm.refreshing ? <ActivityIndicator color={colors.primary} size="small" /> : <Ionicons aria-hidden name="refresh-outline" color={colors.primary} size={19} />}
            </SoftPressable>
          </View> : null}
          {(vm.actionError || vm.feedback) ? <View style={styles.noticeInset}><FavoritesNotice /></View> : null}
          {vm.errorMessage && (hasProducts || vm.status === 'empty') ? <View accessibilityLiveRegion="polite" style={styles.refreshNotice}>
            <Text style={styles.refreshNoticeText}>{/sesión/i.test(vm.errorMessage) ? 'Tu sesión venció. Ve a Cuenta para iniciar sesión de nuevo.' : 'No pudimos actualizar tu selección.'}</Text>
            <SoftPressable accessibilityRole="button" disabled={vm.refreshing} onPress={() => void vm.retry()} style={styles.refreshRetry}>
              <Text style={styles.refreshRetryLabel}>Reintentar</Text>
            </SoftPressable>
          </View> : null}
        </>}
        ListEmptyComponent={vm.status === 'loading' ? <CatalogState status="loading" errorMessage={null} onRetry={() => {}} onReset={() => {}} /> : (
          <FavoritesEmpty failed={vm.status === 'error'} message={vm.errorMessage} onRetry={() => void vm.retry()} onExplore={onExplore} />
        )}
        renderItem={({ item: product, index }) => (
          <Reveal delay={Math.min(index, 5) * 30} style={[styles.cardShell, columns === 1 && styles.singleCard]}>
            <ProductCard product={product} width={cardWidth}
              categoryLabel={categories.find((category) => category.id === product.category)?.name ?? 'Colección INHALEX'}
              onPress={() => onOpenProduct(product)} action={<FavoriteButton product={product} />} />
          </Reveal>
        )}
      />
    </SafeAreaView>
  );
}

function FavoritesEmpty({ failed, message, onRetry, onExplore }: {
  failed: boolean;
  message: string | null;
  onRetry: () => void;
  onExplore: () => void;
}) {
  const sessionExpired = Boolean(message && /sesión|sesion/i.test(message));
  return (
    <Reveal key={failed ? 'error' : 'empty'} style={styles.empty}>
      <View aria-hidden style={styles.illustration}>
        <View style={styles.outerRing} />
        <View style={styles.innerRing} />
        <View style={styles.heartDisc}><Ionicons name={failed ? 'cloud-offline-outline' : 'heart-outline'} size={35} color={colors.primaryDark} /></View>
        <View style={styles.leafDisc}><Ionicons name="leaf" size={17} color={colors.primary} /></View>
        <View style={styles.dot} />
      </View>
      <View accessibilityLiveRegion="polite">
        <Text accessibilityRole="header" style={styles.emptyTitle}>{failed ? 'No pudimos cargar tus favoritos' : 'Guarda lo que te gusta'}</Text>
        <Text style={styles.emptyBody}>{failed ? (sessionExpired ? 'Tu sesión venció. Ve a Cuenta para iniciar sesión de nuevo.' : 'Revisa tu conexión y vuelve a intentarlo.') : 'Toca el corazón de un aroma para tenerlo siempre a mano.'}</Text>
      </View>
      <SoftPressable accessibilityRole="button" onPress={failed ? onRetry : onExplore} style={styles.emptyButton}>
        <Text style={styles.emptyButtonText}>{failed ? 'Reintentar' : 'Explorar aromas'}</Text>
        <Ionicons aria-hidden name={failed ? 'refresh-outline' : 'arrow-forward'} size={18} color={colors.white} />
      </SoftPressable>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  list: { alignSelf: 'center', flex: 1, maxWidth: 600, width: '100%' },
  content: { flexGrow: 1, paddingBottom: 28 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 16, marginTop: 26, marginBottom: 16, paddingHorizontal: 22 },
  headingCopy: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.8 },
  title: { color: colors.text, fontSize: 33, fontWeight: '700', letterSpacing: -1, marginTop: 6 },
  headingHeart: { alignItems: 'center', backgroundColor: '#EAF3E4', borderRadius: 28, height: 56, justifyContent: 'center', width: 56, transform: [{ rotate: '-9deg' }] },
  toolbar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 22 },
  count: { color: colors.textMuted, fontSize: 12 },
  refresh: { alignItems: 'center', justifyContent: 'center', height: 44, width: 44, borderRadius: 22 },
  row: { gap: 12, paddingHorizontal: 22 },
  cardShell: { marginBottom: 12 },
  singleCard: { marginHorizontal: 22 },
  noticeInset: { marginHorizontal: 22, marginBottom: 14 },
  refreshNotice: { alignItems: 'center', backgroundColor: colors.surfaceSoft, borderRadius: 14, flexDirection: 'row', gap: 8, marginHorizontal: 22, marginBottom: 14, paddingLeft: 13, paddingRight: 5 },
  refreshNoticeText: { color: colors.textMuted, flex: 1, fontSize: 12, lineHeight: 18 },
  refreshRetry: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 8 },
  refreshRetryLabel: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingHorizontal: 30, paddingBottom: 32, paddingTop: 32 },
  illustration: { alignItems: 'center', height: 166, justifyContent: 'center', marginBottom: 22, width: 190 },
  outerRing: { borderColor: '#E4EDDE', borderRadius: 79, borderWidth: 1, height: 158, position: 'absolute', width: 158 },
  innerRing: { borderColor: '#DAE7D2', borderRadius: 62, borderWidth: 1, height: 124, position: 'absolute', width: 124 },
  heartDisc: { alignItems: 'center', backgroundColor: '#E8F2E0', borderRadius: 47, height: 94, justifyContent: 'center', width: 94 },
  leafDisc: { alignItems: 'center', backgroundColor: '#F7FAF5', borderColor: '#D9E7D1', borderWidth: 1, borderRadius: 20, height: 38, justifyContent: 'center', position: 'absolute', right: 18, top: 19, transform: [{ rotate: '20deg' }], width: 38 },
  dot: { backgroundColor: '#A9C996', borderRadius: 5, bottom: 21, height: 9, left: 33, position: 'absolute', width: 9 },
  emptyTitle: { color: colors.text, fontSize: 23, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  emptyBody: { color: colors.textMuted, fontSize: 14, lineHeight: 22, marginTop: 11, maxWidth: 280, textAlign: 'center' },
  emptyButton: { alignItems: 'center', backgroundColor: colors.primaryDark, borderRadius: 17, flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 25, minHeight: 52, paddingHorizontal: 24, paddingVertical: 12 },
  emptyButtonText: { color: colors.white, fontSize: 14, fontWeight: '700' },
});
