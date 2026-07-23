import type { Model } from 'mongoose';
import { ProductStatus } from '../products/enums/product-status.enum';
import type { ProductDocument } from '../products/schemas/product.schema';
import type {
  AprioriArtifact,
  AprioriRuleArtifact,
} from './intelligence-artifact.types';
import { RecommendationsService } from './recommendations.service';

interface ProductFixture {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  category: string;
  benefits: string[];
  aromas: string[];
  presentation: string;
  origin: string;
  inStock: boolean;
  stockAvailable?: number;
  allowBackorder: boolean;
  rating: number;
  reviews: number;
  sortOrder: number;
  status: ProductStatus;
}

interface FindQueryMock {
  select: jest.Mock;
  lean: jest.Mock;
  exec: jest.Mock;
}

interface BasketFindFilter {
  _id: { $in: string[] };
}

interface SlugFindFilter {
  slug: { $in: string[] };
  status: ProductStatus;
}

interface CatalogFindFilter {
  status: { $ne: ProductStatus };
}

type ProductFindFilter = BasketFindFilter | SlugFindFilter | CatalogFindFilter;

interface RecommendationResult {
  source: 'apriori' | 'fallback' | 'none';
  recommendations: Array<{
    product: Omit<ProductFixture, 'status'>;
    basedOn: string[];
    explanation: string;
    metrics?: {
      support: number;
      confidence: number;
      lift: number;
    };
  }>;
  model: {
    version: string;
    isSynthetic: boolean;
    generatedAt: string;
  };
}

function buildProduct(
  slug: string,
  overrides: Partial<ProductFixture> = {},
): ProductFixture {
  return {
    _id: `id-${slug}`,
    name: slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    slug,
    description: `Descripción de ${slug}`,
    price: 60,
    currency: 'MXN',
    image: `/images/${slug}.png`,
    category: 'linea-prueba',
    benefits: ['Beneficio de prueba'],
    aromas: [slug],
    presentation: '10 ml',
    origin: 'México',
    inStock: true,
    stockAvailable: 10,
    allowBackorder: false,
    rating: 4.5,
    reviews: 12,
    sortOrder: 1,
    status: ProductStatus.ACTIVE,
    ...overrides,
  };
}

function buildRule(
  antecedentSlugs: string[],
  consequentSlug: string,
  overrides: Partial<AprioriRuleArtifact> = {},
): AprioriRuleArtifact {
  return {
    antecedentSlugs,
    antecedentNames: antecedentSlugs.map((slug) =>
      slug
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    ),
    consequentSlug,
    consequentName: consequentSlug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    support: 0.24,
    confidence: 0.72,
    lift: 1.48,
    cooccurrenceCount: 42,
    score: 0.79,
    ...overrides,
  };
}

function buildArtifact(
  overrides: Partial<AprioriArtifact> = {},
): AprioriArtifact {
  return {
    schemaVersion: '1.0',
    model: {
      name: 'Apriori',
      version: 'apriori-test-v1',
      isSynthetic: true,
      generatedAt: '2026-07-23T08:00:00.000Z',
      datasetSha256: 'test-sha',
    },
    training: {
      transactions: 120,
      periodStart: '2025-01-01',
      periodEnd: '2026-06-30',
      minSupport: 0.05,
      minConfidence: 0.3,
      minLift: 1,
    },
    metrics: {
      rules: 0,
      catalogCoverage: 0.75,
      temporalTop1HitRate: 0.6,
      temporalTrainTransactions: 96,
      temporalValidationTransactions: 24,
    },
    rules: [],
    popularFallbacks: [],
    ...overrides,
  };
}

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let productModel: {
    find: jest.Mock<(filter: ProductFindFilter) => FindQueryMock>;
  };
  let products: ProductFixture[];
  let findQueries: Array<{
    filter: ProductFindFilter;
    query: FindQueryMock;
  }>;

  beforeEach(() => {
    products = [];
    findQueries = [];
    productModel = {
      find: jest.fn((filter: ProductFindFilter) => {
        let result: ProductFixture[];

        if ('_id' in filter) {
          const ids = new Set<string>(filter._id.$in);
          result = products.filter((product) => ids.has(product._id));
        } else if ('slug' in filter) {
          const slugs = new Set<string>(filter.slug.$in);
          result = products.filter(
            (product) =>
              slugs.has(product.slug) && product.status === filter.status,
          );
        } else {
          result = products.filter(
            (product) => product.status !== filter.status.$ne,
          );
        }

        const query: FindQueryMock = {
          select: jest.fn().mockReturnThis(),
          lean: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue(result),
        };
        findQueries.push({ filter, query });
        return query;
      }),
    };

    service = new RecommendationsService(
      productModel as unknown as Model<ProductDocument>,
    );
  });

  function useArtifact(artifact: AprioriArtifact) {
    Reflect.set(service, 'artifact', artifact);
  }

  async function recommend(
    productIds: string[],
    limit?: number,
  ): Promise<RecommendationResult> {
    return service.recommendForBasket(
      productIds,
      limit,
    ) as Promise<RecommendationResult>;
  }

  it('devuelve la regla Apriori aplicable con su producto y métricas', async () => {
    const rule = buildRule(['lavanda'], 'manzanilla');
    products = [
      buildProduct('lavanda'),
      buildProduct('manzanilla', {
        _id: 'product-manzanilla',
        name: 'Manzanilla',
      }),
    ];
    useArtifact(
      buildArtifact({
        rules: [rule],
        metrics: {
          rules: 1,
          catalogCoverage: 0.5,
          temporalTop1HitRate: 0.6,
          temporalTrainTransactions: 96,
          temporalValidationTransactions: 24,
        },
      }),
    );

    const response = await recommend(['id-lavanda'], 1);

    expect(response.source).toBe('apriori');
    expect(response.model).toEqual({
      version: 'apriori-test-v1',
      isSynthetic: true,
      generatedAt: '2026-07-23T08:00:00.000Z',
    });
    expect(response.recommendations).toHaveLength(1);
    const [recommendation] = response.recommendations;
    expect(recommendation.basedOn).toEqual(['Lavanda']);
    expect(recommendation.metrics).toEqual({
      support: 0.24,
      confidence: 0.72,
      lift: 1.48,
    });
    expect(recommendation.product).toMatchObject({
      _id: 'product-manzanilla',
      slug: 'manzanilla',
      name: 'Manzanilla',
    });
    expect(recommendation.product).not.toHaveProperty('status');
    expect(recommendation.explanation).toContain('Manzanilla');
    expect(recommendation.explanation).toContain('Lavanda');
    expect(productModel.find).toHaveBeenNthCalledWith(2, {
      slug: { $in: ['manzanilla'] },
      status: ProductStatus.ACTIVE,
    });
    expect(findQueries[1].query.select).toHaveBeenCalledTimes(1);
    expect(findQueries[1].query.lean).toHaveBeenCalledTimes(1);
    expect(findQueries[1].query.exec).toHaveBeenCalledTimes(1);
  });

  it('excluye una regla cuando su consecuente ya está en la bolsa', async () => {
    products = [buildProduct('lavanda'), buildProduct('manzanilla')];
    useArtifact(
      buildArtifact({
        rules: [buildRule(['lavanda'], 'manzanilla')],
        popularFallbacks: [
          {
            slug: 'manzanilla',
            name: 'Manzanilla',
            support: 0.4,
            transactionCount: 48,
          },
        ],
      }),
    );

    const response = await recommend(['id-lavanda', 'id-manzanilla'], 1);

    expect(response).toEqual(
      expect.objectContaining({
        source: 'none',
        recommendations: [],
      }),
    );
    expect(productModel.find).toHaveBeenCalledTimes(1);
  });

  it('salta productos inactivos o sin existencias y conserva un candidato disponible', async () => {
    products = [
      buildProduct('lavanda'),
      buildProduct('producto-inactivo', {
        status: ProductStatus.DRAFT,
        stockAvailable: 8,
      }),
      buildProduct('producto-agotado', {
        inStock: true,
        stockAvailable: 0,
      }),
      buildProduct('producto-disponible', {
        stockAvailable: 3,
      }),
    ];
    useArtifact(
      buildArtifact({
        rules: [
          buildRule(['lavanda'], 'producto-inactivo', { score: 0.95 }),
          buildRule(['lavanda'], 'producto-agotado', { score: 0.9 }),
          buildRule(['lavanda'], 'producto-disponible', { score: 0.8 }),
        ],
      }),
    );

    const response = await recommend(['id-lavanda'], 3);

    expect(response.source).toBe('apriori');
    expect(response.recommendations).toHaveLength(1);
    expect(response.recommendations[0].product).toMatchObject({
      slug: 'producto-disponible',
    });
    expect(productModel.find).toHaveBeenNthCalledWith(2, {
      slug: {
        $in: ['producto-inactivo', 'producto-agotado', 'producto-disponible'],
      },
      status: ProductStatus.ACTIVE,
    });
  });

  it('considera disponible un producto activo agotado cuando admite pedidos pendientes', async () => {
    products = [
      buildProduct('lavanda'),
      buildProduct('manzanilla', {
        inStock: false,
        stockAvailable: 0,
        allowBackorder: true,
      }),
      buildProduct('copal', {
        inStock: false,
        stockAvailable: undefined,
        allowBackorder: true,
      }),
    ];
    useArtifact(
      buildArtifact({
        rules: [
          buildRule(['lavanda'], 'manzanilla', { score: 0.9 }),
          buildRule(['lavanda'], 'copal', { score: 0.8 }),
        ],
      }),
    );

    const response = await recommend(['id-lavanda'], 2);

    expect(response.source).toBe('apriori');
    expect(
      response.recommendations.map(
        (recommendation) => recommendation.product.slug,
      ),
    ).toEqual(['manzanilla', 'copal']);
  });

  it('usa los productos populares como fallback y respeta su prioridad', async () => {
    products = [
      buildProduct('copal'),
      buildProduct('lavanda'),
      buildProduct('manzanilla'),
    ];
    useArtifact(
      buildArtifact({
        popularFallbacks: [
          {
            slug: 'manzanilla',
            name: 'Manzanilla',
            support: 0.4,
            transactionCount: 48,
          },
          {
            slug: 'lavanda',
            name: 'Lavanda',
            support: 0.35,
            transactionCount: 42,
          },
        ],
      }),
    );

    const response = await recommend(['id-copal'], 2);

    expect(response.source).toBe('fallback');
    expect(
      response.recommendations.map(
        (recommendation) => recommendation.product.slug,
      ),
    ).toEqual(['manzanilla', 'lavanda']);
    expect(response.recommendations[0]).toEqual(
      expect.objectContaining({
        basedOn: [],
      }),
    );
    expect(response.recommendations[0]).not.toHaveProperty('metrics');
  });

  it('devuelve source none y una lista vacía cuando no existe candidato', async () => {
    products = [
      buildProduct('copal'),
      buildProduct('manzanilla', {
        inStock: false,
        stockAvailable: 0,
      }),
      buildProduct('lavanda', {
        status: ProductStatus.DRAFT,
      }),
    ];
    useArtifact(
      buildArtifact({
        popularFallbacks: [
          {
            slug: 'manzanilla',
            name: 'Manzanilla',
            support: 0.4,
            transactionCount: 48,
          },
          {
            slug: 'lavanda',
            name: 'Lavanda',
            support: 0.35,
            transactionCount: 42,
          },
        ],
      }),
    );

    const response = await recommend(['id-copal']);

    expect(response.source).toBe('none');
    expect(response.recommendations).toEqual([]);
    expect(response.model.version).toBe('apriori-test-v1');
  });

  it('resume salud del artefacto y reporta slugs sin resolver', async () => {
    const unavailableAntecedentRule = buildRule(['lavanda'], 'manzanilla');
    const backorderRule = buildRule(['manzanilla'], 'copal');
    const draftRule = buildRule(['lavanda'], 'producto-borrador');
    const unresolvedRule = buildRule(['toronjil'], 'producto-inexistente');
    products = [
      buildProduct('lavanda', {
        inStock: false,
        stockAvailable: 0,
      }),
      buildProduct('manzanilla', {
        stockAvailable: 6,
      }),
      buildProduct('copal', {
        inStock: false,
        stockAvailable: 0,
        allowBackorder: true,
      }),
      buildProduct('producto-borrador', {
        status: ProductStatus.DRAFT,
        stockAvailable: 5,
      }),
      buildProduct('archivado', {
        status: ProductStatus.ARCHIVED,
        stockAvailable: 4,
      }),
    ];
    const artifact = buildArtifact({
      rules: [
        unavailableAntecedentRule,
        backorderRule,
        draftRule,
        unresolvedRule,
      ],
      metrics: {
        rules: 4,
        catalogCoverage: 0.75,
        temporalTop1HitRate: 0.6,
        temporalTrainTransactions: 96,
        temporalValidationTransactions: 24,
      },
    });
    useArtifact(artifact);

    const response = await service.getAdminSummary();

    expect(productModel.find).toHaveBeenCalledWith({
      status: { $ne: ProductStatus.ARCHIVED },
    });
    expect(response.model).toBe(artifact.model);
    expect(response.training).toBe(artifact.training);
    expect(response.metrics).toBe(artifact.metrics);
    expect(response.health).toEqual({
      rules: 4,
      catalogProducts: 4,
      unresolvedSlugs: ['producto-inexistente', 'toronjil'],
      immediatelyAvailableProducts: 2,
    });
    expect(response.topRules).toEqual([
      expect.objectContaining({
        consequentSlug: 'manzanilla',
        available: false,
      }),
      expect.objectContaining({
        consequentSlug: 'copal',
        available: true,
      }),
      expect.objectContaining({
        consequentSlug: 'producto-borrador',
        available: false,
      }),
      expect.objectContaining({
        consequentSlug: 'producto-inexistente',
        available: false,
      }),
    ]);
  });
});
