import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/core/theme/colors';
import { AppScreen, ModuleCard } from '@/shared/components/AppScreen';

export default function FavoritesScreen() {
  return (
    <AppScreen eyebrow="Tu seleccion" title="Favoritos">
      <ModuleCard
        description="Aqui encontraras los aromas que marques para consultarlos rapidamente."
        icon={<Ionicons color={colors.primary} name="heart-outline" size={31} />}
        title="Tus favoritos"
      />
    </AppScreen>
  );
}
