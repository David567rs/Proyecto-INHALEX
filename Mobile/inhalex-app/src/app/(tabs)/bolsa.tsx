import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/core/theme/colors';
import { AppScreen, ModuleCard } from '@/shared/components/AppScreen';

export default function CartScreen() {
  return (
    <AppScreen eyebrow="Tu compra" title="Bolsa">
      <ModuleCard
        description="Los productos que agregues estaran disponibles aqui para continuar tu pedido."
        icon={<Ionicons color={colors.primary} name="bag-handle-outline" size={31} />}
        title="Tu bolsa esta lista"
      />
    </AppScreen>
  );
}
