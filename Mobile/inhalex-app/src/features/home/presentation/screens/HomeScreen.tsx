import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Keyboard, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/core/theme/colors';
import { useAuthSession } from '@/features/auth/presentation/context/AuthSessionContext';
import { CatalogSearch, CategoryChips, CategoryLoadNotice, CatalogRefreshNotice } from '@/features/catalog/presentation/components/CatalogControls';
import { CatalogState } from '@/features/catalog/presentation/components/CatalogState';
import { useCatalogViewModel } from '@/features/catalog/presentation/viewModels/useCatalogViewModel';
import { BottomSheet } from '@/shared/components/BottomSheet';
import { Reveal, SoftPressable } from '@/shared/components/Motion';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { HomeProductCarousel } from '../components/HomeProductCarousel';
import { ExperienceVideo } from '../components/ExperienceVideo';

export default function HomeScreen() {
  const { user } = useAuthSession();
  const firstName = user?.firstName?.trim() || user?.name.trim().split(/\s+/)[0] || 'bienvenido';
  return <HomeView firstName={firstName} />;
}

export function HomeView({ firstName }: { firstName: string }) {
  const vm = useCatalogViewModel();
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const catalogY = useRef(0);
  const [aboutVisible, setAboutVisible] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const carouselWidth = Math.min(width, 600) - 44;
  const categoryLabel = (categoryId: string) => vm.categories.find((category) => category.id === categoryId)?.name ?? 'Colección INHALEX';
  const filtered = vm.searchQuery.trim().length > 0 || vm.selectedCategoryId !== 'all';

  function explore() {
    Keyboard.dismiss();
    scrollRef.current?.scrollTo({ y: catalogY.current - 12, animated: reducedMotion === false });
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={vm.refreshing} onRefresh={() => void vm.refresh()} colors={[colors.primary]} tintColor={colors.primary} />}>
        <Reveal style={styles.inset}>
          <View style={styles.header}>
            <Image accessibilityLabel="INHALEX, el respiro que alivia" resizeMode="contain" source={require('../../../../../assets/home/brand.png')} style={styles.logo} />
            <Pressable accessibilityLabel="Ir a mi cuenta" accessibilityRole="button" onPress={() => router.navigate('/(tabs)/cuenta')} style={({ pressed }) => [styles.account, pressed && styles.pressed]}><Ionicons name="person-outline" size={20} color={colors.primaryDark} /></Pressable>
          </View>
          <View style={styles.welcome}><Text style={styles.welcomeEyebrow}>UN MOMENTO PARA TI</Text><Text accessibilityRole="header" style={styles.welcomeTitle}>Hola, {firstName}<Text style={styles.greetingDot}>.</Text></Text></View>
          <CatalogSearch value={vm.searchQuery} onChange={vm.setSearchQuery} onSubmit={explore} />
        </Reveal>
        <Reveal delay={65} style={styles.inset}>
          <View style={styles.hero}>
            <Image accessible={false} source={require('../../../../../assets/home/hero-botanical.jpg')} resizeMode="cover" style={styles.heroPhoto} />
            <View pointerEvents="none" style={styles.heroWash} />
            <View style={styles.heroCopy}>
              <View style={styles.heroBadge}><View style={styles.badgeDot} /><Text style={styles.heroBadgeLabel}>INHALADORES AROMÁTICOS</Text></View>
              <Text accessibilityRole="header" style={styles.heroTitle}>El respiro{'\n'}que <Text style={styles.heroAccent}>alivia.</Text></Text>
              <Text style={styles.heroBody}>Encuentra el aroma que acompaña tu día. Tu próxima pausa empieza aquí.</Text>
              <SoftPressable accessibilityRole="button" onPress={explore} style={styles.heroButton}><Text style={styles.heroButtonLabel}>Descubrir aromas</Text><Ionicons name="arrow-forward" color={colors.white} size={18} /></SoftPressable>
            </View>
            {fontScale <= 1.2 ? <View accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.heroSeal}><Ionicons name="leaf-outline" color={colors.primaryDark} size={26} /><Text style={styles.heroSealLabel}>ESENCIA{'\n'}INHALEX</Text></View> : null}
          </View>
          <View style={styles.featureStrip}>
            {([['leaf-outline', 'Perfiles', 'aromáticos'], ['water-outline', 'Formato', 'portátil'], ['sparkles-outline', 'Experiencia', 'personal']] as const).map(([icon, firstLine, secondLine], index) => (
              <View key={icon} style={[styles.feature, index > 0 && styles.featureDivider]}><Ionicons color={colors.primary} name={icon} size={20} /><Text style={styles.featureLabel}>{firstLine}{'\n'}{secondLine}</Text></View>
            ))}
          </View>
        </Reveal>
        <View onLayout={(event) => { catalogY.current = event.nativeEvent.layout.y; }} style={styles.collection}>
          <View style={[styles.sectionHeading, styles.inset]}>
            <View style={styles.sectionCopy}><Text style={styles.eyebrow}>NUESTRA COLECCIÓN</Text><Text accessibilityRole="header" style={styles.sectionTitle}>{filtered ? 'Tu selección' : 'Encuentra tu aroma'}</Text></View>
            <Pressable accessibilityRole="button" onPress={() => router.navigate('/(tabs)/catalogo')} style={styles.textLink}><Text style={styles.textLinkLabel}>Ver todos</Text><Ionicons name="arrow-forward" size={16} color={colors.primary} /></Pressable>
          </View>
          <CategoryChips categories={vm.categories} selectedId={vm.selectedCategoryId} onSelect={vm.selectCategory} />
          {(vm.status === 'ready' || vm.status === 'empty') && !vm.errorMessage ? <CategoryLoadNotice error={vm.categoriesErrorMessage} onRetry={() => void vm.refresh()} refreshing={vm.refreshing} /> : null}
          {vm.status === 'ready' ? <CatalogRefreshNotice error={vm.errorMessage} onRetry={() => void vm.refresh()} refreshing={vm.refreshing} /> : null}
          <CatalogState status={vm.status} errorMessage={vm.errorMessage} hasFilters={filtered} onRetry={() => void vm.retry()} onReset={vm.resetFilters} />
          {vm.status === 'ready' ? <HomeProductCarousel
            key={`${carouselWidth}:${fontScale}:${vm.featuredProducts.map((product) => product.id).join(',')}`}
            products={vm.featuredProducts}
            width={carouselWidth}
            fontScale={fontScale}
            categoryLabel={categoryLabel}
            onOpen={(product) => { Keyboard.dismiss(); void vm.openProduct(product); }}
          /> : null}
        </View>
        <View style={styles.inset}>
          <SoftPressable accessibilityRole="button" accessibilityLabel="Conocer la experiencia INHALEX" onPress={() => setAboutVisible(true)} style={styles.ritual}>
            <View style={styles.ritualArtwork}><Ionicons name="leaf-outline" color="#C8DABB" size={76} /><View style={styles.ritualSmallLeaf}><Ionicons name="leaf" color="#90B381" size={32} /></View></View>
            <View style={styles.ritualCopy}><Text style={styles.eyebrow}>LA EXPERIENCIA INHALEX</Text><Text style={styles.ritualTitle}>Una pequeña pausa.{'\n'}Un momento para ti.</Text><View style={styles.ritualLink}><Text style={styles.ritualLinkLabel}>Conocer más</Text><Ionicons name="arrow-forward" color={colors.primaryDark} size={17} /></View></View>
          </SoftPressable>
          <View style={styles.closing}><View style={styles.closingLine} /><Image source={require('../../../../../assets/inhalex-mark.png')} resizeMode="contain" style={styles.closingMark} /><View style={styles.closingLine} /></View>
          <Text style={styles.closingCopy}>Tu bienestar, siempre contigo.</Text>
        </View>
      </ScrollView>
      <BottomSheet visible={aboutVisible} onClose={() => setAboutVisible(false)} title="La experiencia INHALEX">
        <Text style={styles.aboutTitle}>Elige tu aroma.{'\n'}Haz tuya la pausa.</Text>
        <Text style={styles.aboutBody}>INHALEX reúne perfiles florales, herbales, frescos y especiados en un formato práctico para acompañar tus momentos cotidianos.</Text>
        {aboutVisible ? <ExperienceVideo /> : null}
        <View style={[styles.guideSteps, fontScale > 1.4 && { flexDirection: 'column' }]}>{['Aplica', 'Frota', 'Inhala'].map((step, index) => <View key={step} style={styles.guideStep}><Text style={styles.stepNumber}>0{index + 1}</Text><Text style={styles.stepLabel}>{step}</Text></View>)}</View>
        <Text style={styles.aboutBody}>Consulta la información y las indicaciones específicas de cada producto para conocer su presentación y perfil aromático.</Text>
        <SoftPressable accessibilityRole="button" onPress={() => { setAboutVisible(false); explore(); }} style={[styles.heroButton, styles.aboutButton]}><Text style={styles.heroButtonLabel}>Encontrar mi aroma</Text><Ionicons name="arrow-forward" color={colors.white} size={18} /></SoftPressable>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  content: { alignSelf: 'center', maxWidth: 600, paddingBottom: 28, width: '100%' },
  inset: { paddingHorizontal: 22 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  logo: { height: 44, width: 142 },
  account: { alignItems: 'center', backgroundColor: '#ECF3E7', borderColor: '#E0E9D9', borderRadius: 24, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  pressed: { opacity: 0.7 },
  welcome: { marginBottom: 17, marginTop: 25 },
  welcomeEyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 1.7 },
  welcomeTitle: { color: colors.text, fontSize: 27, fontWeight: '700', letterSpacing: -0.8, marginTop: 5 },
  greetingDot: { color: colors.primary },
  hero: { backgroundColor: '#E9F1E3', borderColor: '#DEE8D5', borderRadius: 28, borderWidth: 1, marginTop: 20, overflow: 'hidden' },
  heroPhoto: { bottom: 0, height: '100%', opacity: 0.3, position: 'absolute', right: 0, width: '100%' },
  heroWash: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#EDF4E4', opacity: 0.42 },
  heroCopy: { padding: 25, paddingBottom: 27 },
  heroBadge: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#FFFFFFAC', borderRadius: 14, flexDirection: 'row', gap: 6, maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 7 },
  badgeDot: { backgroundColor: colors.primary, borderRadius: 4, height: 5, width: 5 },
  heroBadgeLabel: { color: colors.primaryDark, flexShrink: 1, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  heroTitle: { color: colors.text, fontSize: 41, fontWeight: '700', letterSpacing: -1.7, lineHeight: 45, marginTop: 20 },
  heroAccent: { color: colors.primary },
  heroBody: { color: '#4A6250', fontSize: 13, lineHeight: 21, marginTop: 12, maxWidth: 228 },
  heroButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.primaryDark, borderRadius: 15, flexDirection: 'row', gap: 13, justifyContent: 'center', marginTop: 21, minHeight: 48, paddingHorizontal: 18, paddingVertical: 13 },
  heroButtonLabel: { color: colors.white, flexShrink: 1, fontSize: 13, fontWeight: '700' },
  heroSeal: { alignItems: 'center', bottom: 28, position: 'absolute', right: 19, transform: [{ rotate: '-9deg' }] },
  heroSealLabel: { color: colors.primaryDark, fontSize: 7, fontWeight: '700', letterSpacing: 1.3, lineHeight: 11, marginTop: 5, textAlign: 'center' },
  featureStrip: { flexDirection: 'row', marginTop: 21, paddingVertical: 4 },
  feature: { alignItems: 'center', flex: 1, gap: 7, paddingHorizontal: 4 },
  featureDivider: { borderLeftColor: colors.border, borderLeftWidth: 1 },
  featureLabel: { color: '#596B5A', fontSize: 10, fontWeight: '500', lineHeight: 15, textAlign: 'center' },
  collection: { marginTop: 31 },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginBottom: 18 },
  sectionCopy: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  sectionTitle: { color: colors.text, fontSize: 23, fontWeight: '700', letterSpacing: -0.7, marginTop: 6 },
  textLink: { alignItems: 'center', flexDirection: 'row', gap: 5, minHeight: 44 },
  textLinkLabel: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  ritual: { backgroundColor: '#EAF1E3', borderColor: '#DDE7D5', borderRadius: 24, borderWidth: 1, marginTop: 30, overflow: 'hidden', padding: 23 },
  ritualCopy: { position: 'relative' },
  ritualTitle: { color: colors.text, fontSize: 21, fontWeight: '600', letterSpacing: -0.4, lineHeight: 28, marginTop: 11 },
  ritualArtwork: { bottom: 3, opacity: 0.6, position: 'absolute', right: -14, transform: [{ rotate: '-25deg' }] },
  ritualSmallLeaf: { position: 'absolute', right: 56, top: 22, transform: [{ rotate: '80deg' }] },
  ritualLink: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 12, marginTop: 18, minHeight: 30 },
  ritualLinkLabel: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  closing: { alignItems: 'center', flexDirection: 'row', gap: 15, justifyContent: 'center', marginTop: 27 },
  closingLine: { backgroundColor: colors.border, height: 1, width: 54 },
  closingMark: { height: 27, opacity: 0.65, width: 26 },
  closingCopy: { color: colors.textMuted, fontSize: 11, marginTop: 8, textAlign: 'center' },
  aboutTitle: { color: colors.primaryDark, fontSize: 29, fontWeight: '700', letterSpacing: -0.7, lineHeight: 35, marginBottom: 13 },
  aboutBody: { color: colors.textMuted, fontSize: 14, lineHeight: 23 },
  guideSteps: { flexDirection: 'row', gap: 10, marginBottom: 23, marginTop: 17 },
  guideStep: { backgroundColor: colors.surfaceSoft, borderRadius: 14, flex: 1, padding: 12 },
  stepNumber: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  stepLabel: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 5 },
  aboutButton: { alignSelf: 'stretch', marginTop: 22 },
});
