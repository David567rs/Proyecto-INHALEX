import type { ImageSourcePropType } from 'react-native';

// The web catalog returns these local paths; Android bundles the same photos.
const bundledProductImages: Readonly<Record<string, ImageSourcePropType>> = {
  '/products/anis-estrella.jpg': require('../../../../../assets/products/anis-estrella.jpg'),
  '/products/bugambilia.jpg': require('../../../../../assets/products/bugambilia.jpg'),
  '/products/cafe.jpg': require('../../../../../assets/products/cafe.jpg'),
  '/products/canela.jpg': require('../../../../../assets/products/canela.jpg'),
  '/products/copal.jpg': require('../../../../../assets/products/copal.jpg'),
  '/products/eucalipto.jpg': require('../../../../../assets/products/eucalipto.jpg'),
  '/products/hierbabuena.jpg': require('../../../../../assets/products/hierbabuena.jpg'),
  '/products/jengibre.jpg': require('../../../../../assets/products/jengibre.jpg'),
  '/products/lavanda.jpg': require('../../../../../assets/products/lavanda.jpg'),
  '/products/manzanilla.jpg': require('../../../../../assets/products/manzanilla.jpg'),
  '/products/menta.jpg': require('../../../../../assets/products/menta.jpg'),
  '/products/mirra-azafran.jpg': require('../../../../../assets/products/mirra-azafran.jpg'),
  '/products/romero.jpg': require('../../../../../assets/products/romero.jpg'),
  '/products/rosas-castilla.jpg': require('../../../../../assets/products/rosas-castilla.jpg'),
  '/products/toronjil.jpg': require('../../../../../assets/products/toronjil.jpg'),
  '/products/vaporub.jpg': require('../../../../../assets/products/vaporub.jpg'),
};

export function getBundledProductImage(imagePath: string): ImageSourcePropType | null {
  return Object.prototype.hasOwnProperty.call(bundledProductImages, imagePath)
    ? bundledProductImages[imagePath]
    : null;
}
