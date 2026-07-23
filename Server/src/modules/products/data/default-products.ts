import { ProductCategory } from '../enums/product-category.enum';
import { ProductStatus } from '../enums/product-status.enum';

export interface DefaultProductSeed {
  name: string;
  description: string;
  longDescription?: string;
  price: number;
  promoActive?: boolean;
  promoLabel?: string;
  promoDescription?: string;
  promoPrice?: number;
  promoEndsAt?: Date;
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
      'Inhalador aromático personal de notas cítricas y herbales, ideal para acompañar pausas de calma y relajación.',
    longDescription:
      'Este inhalador aromático de Toronjil, también conocido como melisa, combina notas cítricas y herbales en una experiencia fresca y suave. Está pensado para acompañar pausas personales, momentos de descanso y rutinas de relajación.',
    price: 60,
    promoActive: true,
    promoLabel: 'Calma de junio',
    promoDescription: 'Precio especial para aromas de descanso y serenidad.',
    promoPrice: 52,
    promoEndsAt: new Date('2026-07-31T23:59:59.000Z'),
    currency: 'MXN',
    image: '/products/toronjil.jpg',
    category: ProductCategory.LINEA_INSOMNIO,
    benefits: [
      'Sensación de calma',
      'Perfil cítrico y herbal',
      'Ideal para pausas de relajación',
    ],
    aromas: ['toronjil', 'melisa', 'cítrico', 'herbáceo'],
    presentation: '10ml',
    origin: '100% Natural',
    inStock: true,
    rating: 4.8,
    reviews: 124,
    status: ProductStatus.ACTIVE,
    sortOrder: 1,
  },
  {
    name: 'Mirra y Azafrán',
    description:
      'Inhalador aromático personal de perfil resinoso y especiado, pensado para momentos de enfoque y bienestar.',
    longDescription:
      'Este inhalador aromático combina el perfil profundo de la mirra con las notas calidas y especiadas del azafran. Su carácter envolvente acompaña pausas conscientes y momentos en los que se busca una experiencia aromatica sofisticada.',
    price: 60,
    promoActive: true,
    promoLabel: 'Aroma especial',
    promoDescription: 'Promocion ligera para una seleccion sofisticada.',
    promoPrice: 55,
    promoEndsAt: new Date('2026-07-31T23:59:59.000Z'),
    currency: 'MXN',
    image: '/products/mirra-azafran.jpg',
    category: ProductCategory.LINEA_ANSIEDAD_ESTRES,
    benefits: [
      'Perfil resinoso y especiado',
      'Sensación envolvente',
      'Ideal para pausas conscientes',
    ],
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
      'Inhalador aromático personal de notas resinosas y amaderadas que acompaña momentos de pausa y concentración.',
    longDescription:
      'El perfil resinoso y amaderado del Copal brinda una experiencia aromática profunda y de uso personal. Este inhalador está pensado para acompañar momentos de serenidad, introspección y concentración.',
    price: 60,
    promoActive: true,
    promoLabel: 'Ritual purificador',
    promoDescription: 'Oferta de temporada para limpiar y armonizar espacios.',
    promoPrice: 54,
    promoEndsAt: new Date('2026-07-31T23:59:59.000Z'),
    currency: 'MXN',
    image: '/products/copal.jpg',
    category: ProductCategory.LINEA_ESTIMULANTE,
    benefits: [
      'Perfil resinoso y amaderado',
      'Sensación de profundidad',
      'Acompaña momentos de introspección',
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
    name: 'Anís Estrella',
    description:
      'Inhalador aromático personal de notas dulces y especiadas, con una sensación cálida y reconfortante.',
    longDescription:
      'Este inhalador aromático conserva el perfil dulce y especiado caracteristico del Anís Estrella. Su calidez acompaña pausas personales y momentos en los que se busca una experiencia suave y reconfortante.',
    price: 60,
    currency: 'MXN',
    image: '/products/anis-estrella.jpg',
    category: ProductCategory.LINEA_ANSIEDAD_ESTRES,
    benefits: [
      'Perfil dulce y especiado',
      'Sensación cálida',
      'Acompaña la relajación',
    ],
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
      'Inhalador aromático personal de perfil mentolado que brinda una sensación fresca al respirar.',
    longDescription:
      'Este inhalador aromático presenta las notas frescas y mentoladas caracteristicas del Eucalipto. Su perfil intenso acompaña respiraciones pausadas y rutinas personales de frescura y bienestar.',
    price: 60,
    currency: 'MXN',
    image: '/products/eucalipto.jpg',
    category: ProductCategory.LINEA_VERDE,
    benefits: [
      'Sensación de frescura',
      'Perfil mentolado',
      'Acompaña respiraciones conscientes',
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
      'Inhalador aromático personal de notas florales suaves, ideal para acompañar momentos de calma y descanso.',
    longDescription:
      'Este inhalador aromático destaca el perfil floral, limpio y delicado de la Lavanda. Su aroma suave está pensado para acompañar pausas de tranquilidad, rutinas nocturnas y momentos de descanso personal.',
    price: 60,
    currency: 'MXN',
    image: '/products/lavanda.jpg',
    category: ProductCategory.LINEA_INSOMNIO,
    benefits: [
      'Sensación de calma',
      'Perfil floral suave',
      'Acompaña la rutina de descanso',
    ],
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
      'Inhalador aromático personal de frescura intensa, pensado para acompañar momentos de atención y energía.',
    longDescription:
      'Este inhalador aromático ofrece el perfil fresco y mentolado caracteristico de la Menta. Su intensidad brinda una experiencia vivaz que acompaña momentos de enfoque, actividad y claridad sensorial.',
    price: 60,
    currency: 'MXN',
    image: '/products/menta.jpg',
    category: ProductCategory.LINEA_VERDE,
    benefits: [
      'Sensación refrescante',
      'Perfil mentolado intenso',
      'Acompaña momentos de enfoque',
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
      'Inhalador aromático personal de notas herbales y verdes, ideal para acompañar momentos de claridad y enfoque.',
    longDescription:
      'Este inhalador aromático resalta las notas herbales y verdes del Romero. Su carácter vigorizante acompaña pausas activas, jornadas de estudio y momentos en los que se busca una experiencia clara y fresca.',
    price: 60,
    currency: 'MXN',
    image: '/products/romero.jpg',
    category: ProductCategory.LINEA_RESFRIADO,
    benefits: [
      'Perfil herbal y verde',
      'Sensación vigorizante',
      'Acompaña la concentración',
    ],
    aromas: ['romero', 'herbáceo', 'verde', 'mediterraneo'],
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
      'Inhalador aromático personal de notas calidas y especiadas que brinda una experiencia reconfortante.',
    longDescription:
      'Este inhalador aromático concentra el perfil dulce, cálido y especiado de la Canela. Su aroma envolvente está pensado para acompañar pausas personales y momentos en los que se busca una sensación de confort.',
    price: 60,
    currency: 'MXN',
    image: '/products/canela.jpg',
    category: ProductCategory.LINEA_RESFRIADO,
    benefits: [
      'Sensación cálida',
      'Perfil dulce y especiado',
      'Acompaña momentos de confort',
    ],
    aromas: ['canela', 'especiado', 'cálido', 'dulce'],
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
      'Inhalador aromático personal de perfil cálido y especiado, pensado para una experiencia vigorizante.',
    longDescription:
      'Este inhalador aromático presenta las notas picantes, calidas y especiadas del Jengibre. Su carácter dinámico acompaña momentos de actividad y brinda una experiencia sensorial revitalizante.',
    price: 60,
    currency: 'MXN',
    image: '/products/jengibre.jpg',
    category: ProductCategory.LINEA_RESFRIADO,
    benefits: [
      'Sensación revitalizante',
      'Perfil cálido y especiado',
      'Acompaña momentos de actividad',
    ],
    aromas: ['jengibre', 'picante', 'cálido', 'especiado'],
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
      'Inhalador aromático personal de notas tostadas e intensas, ideal para acompañar momentos de energía y atención.',
    longDescription:
      'Este inhalador aromático recrea el perfil tostado, profundo e inconfundible del Café. Su intensidad acompaña pausas activas y momentos en los que se busca una experiencia energica y enfocada.',
    price: 60,
    currency: 'MXN',
    image: '/products/cafe.jpg',
    category: ProductCategory.LINEA_ESTIMULANTE,
    benefits: [
      'Perfil tostado e intenso',
      'Sensación energica',
      'Acompaña momentos de enfoque',
    ],
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
      'Inhalador aromático personal de perfil verde y mentolado, con una sensación suave y refrescante.',
    longDescription:
      'Este inhalador aromático combina las notas verdes, dulces y mentoladas de la Hierbabuena. Su frescura ligera acompaña respiraciones pausadas y rutinas personales de bienestar.',
    price: 60,
    currency: 'MXN',
    image: '/products/hierbabuena.jpg',
    category: ProductCategory.LINEA_VERDE,
    benefits: [
      'Frescura suave',
      'Perfil herbal y mentolado',
      'Acompaña respiraciones pausadas',
    ],
    aromas: ['hierbabuena', 'menta suave', 'fresco', 'herbal'],
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
      'Inhalador aromático personal de perfil mentolado intenso, pensado para brindar una sensación fresca al respirar.',
    longDescription:
      'Este inhalador aromático reune notas mentoladas intensas y un carácter fresco de fácil reconocimiento. Está pensado para acompañar respiraciones conscientes y rutinas personales de bienestar respiratorio.',
    price: 60,
    currency: 'MXN',
    image: '/products/vaporub.jpg',
    category: ProductCategory.LINEA_VERDE,
    benefits: [
      'Frescura mentolada intensa',
      'Sensación fresca al inhalar',
      'Acompaña respiraciones conscientes',
    ],
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
      'Inhalador aromático personal de notas florales suaves, ideal para acompañar respiraciones tranquilas y momentos de calma.',
    longDescription:
      'Este inhalador aromático personal presenta las delicadas notas florales de las Rosas de Castilla. Su perfil suave y reconfortante está pensado para acompañar pausas de tranquilidad y bienestar durante el día.',
    price: 60,
    currency: 'MXN',
    image: '/products/rosas-castilla.jpg',
    category: ProductCategory.LINEA_ANSIEDAD_ESTRES,
    benefits: [
      'Perfil floral suave',
      'Sensación reconfortante',
      'Acompaña momentos de calma',
    ],
    aromas: ['rosa', 'floral', 'delicado', 'suave'],
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
      'Inhalador aromático personal de perfil floral y verde, pensado para una sensación suave y fresca al respirar.',
    longDescription:
      'Este inhalador aromático destaca el perfil floral y ligeramente herbal de la Bugambilia. Su carácter ligero acompaña respiraciones pausadas y brinda una experiencia personal suave y reconfortante.',
    price: 60,
    currency: 'MXN',
    image: '/products/bugambilia.jpg',
    category: ProductCategory.LINEA_RESFRIADO,
    benefits: [
      'Perfil floral y verde',
      'Sensación fresca y ligera',
      'Acompaña respiraciones pausadas',
    ],
    aromas: ['bugambilia', 'floral', 'verde', 'suave'],
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
      'Inhalador aromático personal de notas florales suaves, ideal para acompañar momentos de relajación y descanso.',
    longDescription:
      'Este inhalador aromático presenta el perfil floral, dulce y delicado de la Manzanilla. Su suavidad está pensada para acompañar pausas tranquilas, rutinas nocturnas y momentos de descanso personal.',
    price: 60,
    currency: 'MXN',
    image: '/products/manzanilla.jpg',
    category: ProductCategory.LINEA_ANSIEDAD_ESTRES,
    benefits: [
      'Sensación de calma',
      'Perfil floral suave',
      'Acompaña la rutina de descanso',
    ],
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

