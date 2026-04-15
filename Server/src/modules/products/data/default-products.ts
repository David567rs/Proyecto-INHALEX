import { ProductCategory } from '../enums/product-category.enum';
import { ProductStatus } from '../enums/product-status.enum';

export interface DefaultProductSeed {
  name: string;
  description: string;
  longDescription?: string;
  price: number;
  currency: string;
  image: string;
  category: ProductCategory;
  benefits: string[];
  aromas: string[];
  presentation: string;
  origin: string;
  rawMaterialName?: string;
  rawMaterialInitialStockMl?: number;
  rawMaterialConsumptionPerBatchMl?: number;
  rawMaterialBatchYieldUnits?: number;
  stockAvailable?: number;
  stockMin?: number;
  allowBackorder?: boolean;
  inStock: boolean;
  rating?: number;
  reviews?: number;
  status: ProductStatus;
  sortOrder: number;
}

export const DEFAULT_PRODUCTS: DefaultProductSeed[] = [
  {
    name: 'Toronjil',
    description:
      'Frescura citrica y herbacea que alivia el estres y proporciona serenidad.',
    longDescription:
      'El Toronjil, tambien conocido como melisa, es una planta aromatica reconocida por sus propiedades calmantes y relajantes. Nuestro macerado captura la esencia pura de esta hierba medicinal, ofreciendo un aroma fresco y citrico que ayuda a reducir la ansiedad, calmar los nervios y promover un estado de paz interior.',
    price: 60,
    currency: 'MXN',
    image: '/products/toronjil.jpg',
    category: ProductCategory.LINEA_INSOMNIO,
    benefits: ['Alivia el estres', 'Promueve la calma', 'Aroma refrescante'],
    aromas: ['toronjil', 'melisa', 'citrico', 'herbaceo'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    rating: 4.8,
    reviews: 124,
    status: ProductStatus.ACTIVE,
    sortOrder: 1,
  },
  {
    name: 'Mirra y Azafran',
    description:
      'Combinacion exotica y sofisticada que eleva el espiritu y proporciona bienestar.',
    longDescription:
      'Una fusion unica de dos ingredientes legendarios. La mirra, con su aroma profundo y balsamico, se combina con el azafran para crear una experiencia olfativa sofisticada que eleva el espiritu y proporciona una sensacion de lujo y bienestar.',
    price: 60,
    currency: 'MXN',
    image: '/products/mirra-azafran.jpg',
    category: ProductCategory.LINEA_ANSIEDAD_ESTRES,
    benefits: ['Aroma exotico', 'Eleva el espiritu', 'Sofisticado'],
    aromas: ['mirra', 'azafran', 'resina', 'especiado'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    rating: 4.9,
    reviews: 89,
    status: ProductStatus.ACTIVE,
    sortOrder: 2,
  },
  {
    name: 'Copal',
    description:
      'Esencia ancestral purificadora que limpia el ambiente y proporciona paz interior.',
    longDescription:
      'El Copal es una resina sagrada utilizada desde tiempos prehispanicos por las culturas mesoamericanas. Su aroma distintivo tiene propiedades purificadoras que ayudan a limpiar espacios de energias negativas, promoviendo un ambiente de paz, meditacion y conexion espiritual.',
    price: 60,
    currency: 'MXN',
    image: '/products/copal.jpg',
    category: ProductCategory.LINEA_ESTIMULANTE,
    benefits: [
      'Purifica el ambiente',
      'Promueve la meditacion',
      'Conexion espiritual',
    ],
    aromas: ['copal', 'resina', 'amaderado', 'ritual'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    rating: 4.7,
    reviews: 156,
    status: ProductStatus.ACTIVE,
    sortOrder: 3,
  },
  {
    name: 'Anis Estrella',
    description:
      'Dulzura especiada unica que reconforta y proporciona calidez aromatica.',
    longDescription:
      'El Anis Estrella es una especia con forma de estrella que emana un aroma dulce y especiado inconfundible. Nuestro macerado captura su esencia reconfortante, perfecta para momentos de relajacion y para crear un ambiente calido y acogedor.',
    price: 60,
    currency: 'MXN',
    image: '/products/anis-estrella.jpg',
    category: ProductCategory.LINEA_ANSIEDAD_ESTRES,
    benefits: ['Aroma reconfortante', 'Proporciona calidez', 'Dulce y especiado'],
    aromas: ['anis', 'especiado', 'dulce', 'estrella'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    rating: 4.6,
    reviews: 98,
    status: ProductStatus.ACTIVE,
    sortOrder: 4,
  },
  {
    name: 'Eucalipto',
    description:
      'Frescura mentolada que despeja las vias respiratorias y revitaliza los sentidos.',
    longDescription:
      'El Eucalipto es reconocido por sus propiedades descongestionantes. Su aroma fresco y mentolado ayuda a despejar las vias respiratorias, aliviando la congestion nasal y proporcionando una sensacion de frescura y claridad mental.',
    price: 60,
    currency: 'MXN',
    image: '/products/eucalipto.jpg',
    category: ProductCategory.LINEA_VERDE,
    benefits: [
      'Despeja vias respiratorias',
      'Alivia congestion',
      'Revitaliza',
    ],
    aromas: ['eucalipto', 'mentolado', 'fresco', 'respiratorio'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    rating: 4.9,
    reviews: 234,
    status: ProductStatus.ACTIVE,
    sortOrder: 5,
  },
  {
    name: 'Lavanda',
    description:
      'Aroma floral relajante que calma la mente y favorece el descanso profundo.',
    longDescription:
      'La Lavanda es la reina de las plantas aromaticas relajantes. Su distintivo aroma floral tiene propiedades calmantes comprobadas que ayudan a reducir el estres, aliviar dolores de cabeza tensionales y promover un sueno reparador.',
    price: 60,
    currency: 'MXN',
    image: '/products/lavanda.jpg',
    category: ProductCategory.LINEA_INSOMNIO,
    benefits: ['Calma la mente', 'Favorece el descanso', 'Alivia tension'],
    aromas: ['lavanda', 'floral', 'calmante', 'suave'],
    presentation: '10ml',
    origin: '100% Natural',
    rawMaterialName: 'Compuesto de lavanda',
    rawMaterialInitialStockMl: 750,
    rawMaterialConsumptionPerBatchMl: 250,
    rawMaterialBatchYieldUnits: 70,
    inStock: true,
    stockMin: 20,
    rating: 4.8,
    reviews: 187,
    status: ProductStatus.ACTIVE,
    sortOrder: 6,
  },
  {
    name: 'Menta',
    description:
      'Frescura intensa que activa la mente y proporciona energia instantanea.',
    longDescription:
      'La Menta es conocida por su aroma intenso y refrescante que estimula los sentidos. Ideal para momentos que requieren concentracion y energia, ayuda a despejar la mente y proporcionar una sensacion de vitalidad.',
    price: 60,
    currency: 'MXN',
    image: '/products/menta.jpg',
    category: ProductCategory.LINEA_VERDE,
    benefits: [
      'Activa la mente',
      'Proporciona energia',
      'Alivia dolor de cabeza',
    ],
    aromas: ['menta', 'fresco', 'mentolado', 'estimulante'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    rating: 4.7,
    reviews: 145,
    status: ProductStatus.ACTIVE,
    sortOrder: 7,
  },
  {
    name: 'Romero',
    description:
      'Esencia herbacea vigorizante que mejora la concentracion y la memoria.',
    longDescription:
      'El Romero es una hierba mediterranea con un aroma herbaceo distintivo. Conocido por mejorar la memoria y la concentracion, ofrece beneficios vigorizantes que ayudan a mantener la mente clara.',
    price: 60,
    currency: 'MXN',
    image: '/products/romero.jpg',
    category: ProductCategory.LINEA_RESFRIADO,
    benefits: ['Mejora concentracion', 'Fortalece memoria', 'Vigorizante'],
    aromas: ['romero', 'herbaceo', 'verde', 'mediterraneo'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    rating: 4.6,
    reviews: 112,
    status: ProductStatus.ACTIVE,
    sortOrder: 8,
  },
  {
    name: 'Canela',
    description:
      'Calidez especiada que reconforta el cuerpo y estimula la circulacion.',
    longDescription:
      'La Canela es una especia milenaria apreciada por su aroma calido y envolvente. Nuestro macerado captura su esencia reconfortante, ideal para aliviar malestares respiratorios y estimular la circulacion.',
    price: 60,
    currency: 'MXN',
    image: '/products/canela.jpg',
    category: ProductCategory.LINEA_RESFRIADO,
    benefits: [
      'Reconforta el cuerpo',
      'Estimula circulacion',
      'Aroma calido',
    ],
    aromas: ['canela', 'especiado', 'calido', 'dulce'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    rating: 4.7,
    reviews: 134,
    status: ProductStatus.ACTIVE,
    sortOrder: 9,
  },
  {
    name: 'Jengibre',
    description:
      'Energia picante y revitalizante que activa el cuerpo y despeja la mente.',
    longDescription:
      'El Jengibre es una raiz con propiedades energizantes y descongestionantes. Su aroma picante y calido ayuda a aliviar nauseas, mejorar la circulacion y proporcionar sensacion de vitalidad.',
    price: 60,
    currency: 'MXN',
    image: '/products/jengibre.jpg',
    category: ProductCategory.LINEA_RESFRIADO,
    benefits: [
      'Revitalizante',
      'Despeja vias respiratorias',
      'Mejora circulacion',
    ],
    aromas: ['jengibre', 'picante', 'calido', 'especiado'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    rating: 4.8,
    reviews: 98,
    status: ProductStatus.ACTIVE,
    sortOrder: 10,
  },
  {
    name: 'Café',
    description:
      'Aroma intenso y estimulante que despierta los sentidos y activa la mente.',
    longDescription:
      'El Café es reconocido por su aroma intenso y vigorizante. Nuestro macerado captura la esencia de los granos tostados, ofreciendo propiedades estimulantes para combatir la fatiga.',
    price: 60,
    currency: 'MXN',
    image: '/products/cafe.jpg',
    category: ProductCategory.LINEA_ESTIMULANTE,
    benefits: ['Estimulante', 'Combate fatiga', 'Despierta los sentidos'],
    aromas: ['café', 'tostado', 'intenso', 'estimulante'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    rating: 4.9,
    reviews: 167,
    status: ProductStatus.ACTIVE,
    sortOrder: 11,
  },
  {
    name: 'Hierbabuena',
    description:
      'Frescura suave y digestiva que calma el estomago y refresca el aliento.',
    longDescription:
      'La Hierbabuena es una variedad de menta con aroma mas suave y dulce. Conocida por sus propiedades digestivas, ayuda a aliviar malestares estomacales y refrescar el aliento.',
    price: 60,
    currency: 'MXN',
    image: '/products/hierbabuena.jpg',
    category: ProductCategory.LINEA_VERDE,
    benefits: ['Digestiva', 'Refresca el aliento', 'Aroma suave'],
    aromas: ['hierbabuena', 'menta suave', 'fresco', 'digestivo'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    rating: 4.6,
    reviews: 89,
    status: ProductStatus.ACTIVE,
    sortOrder: 12,
  },
  {
    name: 'Vaporub',
    description:
      'Planta aromatica descongestionante que alivia sintomas de gripe y resfriado.',
    longDescription:
      'La planta Vaporub (Plectranthus tomentosa) es conocida por su intenso aroma mentolado. Sus hojas liberan un aroma descongestionante natural ideal para aliviar congestion nasal y tos.',
    price: 60,
    currency: 'MXN',
    image: '/products/vaporub.jpg',
    category: ProductCategory.LINEA_VERDE,
    benefits: ['Descongestionante', 'Alivia gripe', 'Alivio inmediato'],
    aromas: ['vaporub', 'mentolado', 'respiratorio', 'fresco'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    rating: 4.9,
    reviews: 278,
    status: ProductStatus.ACTIVE,
    sortOrder: 13,
  },
  {
    name: 'Rosas de Castilla',
    description:
      'Delicadeza floral romantica que calma emociones y nutre el espiritu.',
    longDescription:
      'Las Rosas de Castilla son flores apreciadas por su aroma y propiedades terapeuticas. Nuestro macerado captura su esencia delicada para calmar emociones y crear un ambiente romantico.',
    price: 60,
    currency: 'MXN',
    image: '/products/rosas-castilla.jpg',
    category: ProductCategory.LINEA_ANSIEDAD_ESTRES,
    benefits: ['Calma emociones', 'Aroma romantico', 'Nutre el espiritu'],
    aromas: ['rosa', 'floral', 'romantico', 'suave'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    rating: 4.8,
    reviews: 156,
    status: ProductStatus.ACTIVE,
    sortOrder: 14,
  },
  {
    name: 'Bugambilia',
    description:
      'Esencia floral vibrante que alivia la tos y fortalece el sistema respiratorio.',
    longDescription:
      'La Bugambilia es una flor tropical conocida en la medicina tradicional mexicana por sus propiedades expectorantes y antiinflamatorias. Ayuda a aliviar la tos y fortalecer el sistema inmunologico.',
    price: 60,
    currency: 'MXN',
    image: '/products/bugambilia.jpg',
    category: ProductCategory.LINEA_RESFRIADO,
    benefits: ['Alivia la tos', 'Expectorante', 'Fortalece inmunidad'],
    aromas: ['bugambilia', 'floral', 'expectorante', 'respiratorio'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    rating: 4.7,
    reviews: 123,
    status: ProductStatus.ACTIVE,
    sortOrder: 15,
  },
  {
    name: 'Manzanilla',
    description:
      'Suavidad calmante que relaja el cuerpo y promueve el sueno reparador.',
    longDescription:
      'La Manzanilla es una de las plantas medicinales mas apreciadas por sus propiedades calmantes y antiinflamatorias. Su aroma suave ayuda a reducir la ansiedad y promover un sueno tranquilo.',
    price: 60,
    currency: 'MXN',
    image: '/products/manzanilla.jpg',
    category: ProductCategory.LINEA_ANSIEDAD_ESTRES,
    benefits: ['Calmante natural', 'Promueve el sueno', 'Reduce ansiedad'],
    aromas: ['manzanilla', 'floral suave', 'calmante', 'dulce'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    rating: 4.8,
    reviews: 198,
    status: ProductStatus.ACTIVE,
    sortOrder: 16,
  },
];

