import type { ImageSourcePropType } from 'react-native';

import type { CatalogProduct } from '../../domain/entities/CatalogProduct';

export interface AromaProductImage {
  source: ImageSourcePropType;
  aspectRatio: number;
}

// Original 1024 × 1536 bottle photography from Client/public/aromas.
// Keep these separate from the ingredient photography used in collection cards.
const bottleImages: Readonly<Record<string, ImageSourcePropType>> = {
  anis: require('../../../../../assets/aromas/anis.jpeg'),
  bugambilia: require('../../../../../assets/aromas/bugambilia.jpeg'),
  cafe: require('../../../../../assets/aromas/cafe.jpeg'),
  canela: require('../../../../../assets/aromas/canela.jpeg'),
  copal: require('../../../../../assets/aromas/copal.jpeg'),
  eucalipto: require('../../../../../assets/aromas/eucalipto.jpeg'),
  hierbabuena: require('../../../../../assets/aromas/hierbabuena.jpeg'),
  jengibre: require('../../../../../assets/aromas/jengibre.jpeg'),
  lavanda: require('../../../../../assets/aromas/lavanda.jpeg'),
  manzanilla: require('../../../../../assets/aromas/manzanilla.jpeg'),
  menta: require('../../../../../assets/aromas/menta.jpeg'),
  mirra: require('../../../../../assets/aromas/mirra.jpeg'),
  rosas: require('../../../../../assets/aromas/rosas.jpeg'),
  toronjil: require('../../../../../assets/aromas/toronjil.jpeg'),
  vaporub: require('../../../../../assets/aromas/vaporub.jpeg'),
};

const aliases: Readonly<Record<string, string>> = {
  'anis-estrella': 'anis',
  'mirra-azafran': 'mirra',
  'mirra-y-azafran': 'mirra',
  'rosas-castilla': 'rosas',
  'rosas-de-castilla': 'rosas',
};

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function imageFilename(image: string): string {
  const path = image.split(/[?#]/, 1)[0].replace(/\\/g, '/');
  const filename = path.slice(path.lastIndexOf('/') + 1);
  let decoded = filename;
  try {
    decoded = decodeURIComponent(filename);
  } catch {
    // A malformed URL must not prevent the product details from opening.
  }
  return decoded.replace(/\.(?:jpe?g|png|webp|avif)$/i, '');
}

export function getAromaProductImage(
  product: Pick<CatalogProduct, 'slug' | 'name' | 'image'>,
): AromaProductImage | null {
  // Aromatic notes are intentionally excluded: mint notes must never select
  // the Menta bottle for another product. Only exact product identities match.
  const candidates = [product.slug, product.name, imageFilename(product.image)];

  for (const candidate of candidates) {
    const normalized = normalizeKey(candidate);
    const key = Object.prototype.hasOwnProperty.call(aliases, normalized)
      ? aliases[normalized]
      : normalized;
    if (Object.prototype.hasOwnProperty.call(bottleImages, key)) {
      return { source: bottleImages[key], aspectRatio: 2 / 3 };
    }
  }

  // Romero currently has no bottle photo in the web's aromas directory.
  return null;
}
