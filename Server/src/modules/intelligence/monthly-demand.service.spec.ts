import { ProductStatus } from '../products/enums/product-status.enum';
import type {
  MonthlyDemandArtifact,
  MonthlyDemandArtifactItem,
} from './intelligence-artifact.types';

jest.mock(
  './artifacts/monthly-demand.generated',
  () => ({
    MONTHLY_DEMAND_ARTIFACT: {
      schemaVersion: '1.0',
      model: {},
      targetMonth: 'test',
      items: [],
    },
  }),
  { virtual: true },
);

import { MonthlyDemandService } from './monthly-demand.service';

function buildArtifactItem(
  slug: string,
  prediction: MonthlyDemandArtifactItem['prediction'] = {
    units: 10,
    lower: 7,
    upper: 14,
  },
): MonthlyDemandArtifactItem {
  return {
    slug,
    productName: slug,
    category: 'linea-prueba',
    history: [
      { month: '2026-04', units: 7 },
      { month: '2026-05', units: 8 },
      { month: '2026-06', units: 9 },
    ],
    features: {
      demandLag1m: 9,
      demandLag2m: 8,
      demandLag3m: 7,
      averageDemand3m: 8,
      ordersLag1m: 5,
      averagePriceLag1m: 60,
      averageRatingAsOf: 4.5,
      reviewCountAsOf: 12,
      monthNumber: 7,
    },
    prediction,
  };
}

function buildArtifact(
  items: MonthlyDemandArtifactItem[],
): MonthlyDemandArtifact {
  return {
    schemaVersion: '1.0',
    model: {
      name: 'Ridge Regression',
      version: 'test',
      isSynthetic: true,
      generatedAt: '2026-07-23T12:00:00.000Z',
      datasetSha256: 'test-sha',
      alpha: 50,
      trainingPeriod: {
        startMonth: '2025-04',
        endMonth: '2026-06',
        trainingRows: 224,
        validationRows: 16,
        finalTrainingRows: 240,
      },
      metrics: {
        mae: 6.7,
        rmse: 8.7,
        r2: 0.47,
        baselineMae: 8.1,
        improvementPct: 17.3,
        intervalQuantile: 0.9,
        residualRadius: 12.4,
      },
    },
    targetMonth: '2026-07',
    items,
  };
}

function buildProduct(
  slug: string,
  options: {
    id?: string;
    stockAvailable?: number;
    stockMin?: number;
  } = {},
) {
  return {
    _id: options.id ?? `mongo-${slug}`,
    slug,
    name: `Producto ${slug}`,
    category: 'linea-prueba',
    image: `/products/${slug}.jpg`,
    presentation: '10ml',
    ...(options.stockAvailable !== undefined
      ? { stockAvailable: options.stockAvailable }
      : {}),
    stockMin: options.stockMin ?? 2,
  };
}

function createProductModel(products: ReturnType<typeof buildProduct>[]) {
  const exec = jest.fn().mockResolvedValue(products);
  const lean = jest.fn().mockReturnValue({ exec });
  const select = jest.fn().mockReturnValue({ lean });
  const find = jest.fn().mockReturnValue({ select });

  return {
    model: { find },
    chain: { find, select, lean, exec },
  };
}

describe('MonthlyDemandService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  function createService(
    artifact: MonthlyDemandArtifact,
    products: ReturnType<typeof buildProduct>[],
  ) {
    const productModel = createProductModel(products);
    const service = new MonthlyDemandService(productModel.model as never);
    (service as unknown as { artifact: MonthlyDemandArtifact }).artifact =
      artifact;

    return { service, ...productModel };
  }

  it('consulta productos activos y une cada registro con el artefacto por slug', async () => {
    const lavanda = buildArtifactItem('lavanda');
    lavanda.features.demandLag1m = 55;
    const menta = buildArtifactItem('menta');
    menta.features.demandLag1m = 53;
    const artifact = buildArtifact([lavanda, menta]);
    const { service, chain } = createService(artifact, [
      buildProduct('menta', { id: 'mongo-menta', stockAvailable: 30 }),
      buildProduct('lavanda', {
        id: 'mongo-lavanda',
        stockAvailable: 30,
      }),
    ]);

    const result = await service.getForecast();
    const resultBySlug = new Map(
      result.items.map((item) => [item.product.slug, item]),
    );

    expect(chain.find).toHaveBeenCalledWith({
      slug: { $in: ['lavanda', 'menta'] },
      status: ProductStatus.ACTIVE,
    });
    expect(chain.select).toHaveBeenCalledWith(
      'slug name category image presentation stockAvailable stockMin',
    );
    expect(chain.lean).toHaveBeenCalledTimes(1);
    expect(chain.exec).toHaveBeenCalledTimes(1);
    expect(resultBySlug.get('lavanda')).toMatchObject({
      product: {
        id: 'mongo-lavanda',
        slug: 'lavanda',
        name: 'Producto lavanda',
      },
      features: {
        demandLag1m: 55,
      },
    });
    expect(resultBySlug.get('menta')).toMatchObject({
      product: {
        id: 'mongo-menta',
        slug: 'menta',
      },
      features: {
        demandLag1m: 53,
      },
    });
  });

  it('redondea y limita a cero los valores numéricos de predicción e inventario', async () => {
    const artifact = buildArtifact([
      buildArtifactItem('lavanda', {
        units: -2.6,
        lower: -4.4,
        upper: 10.6,
      }),
    ]);
    const { service } = createService(artifact, [
      buildProduct('lavanda', {
        stockAvailable: -3.7,
        stockMin: 2.6,
      }),
    ]);

    const result = await service.getForecast();

    expect(result.items[0]).toMatchObject({
      prediction: {
        units: 0,
        lower: 0,
        upper: 11,
      },
      inventory: {
        stockAvailable: 0,
        stockMin: 3,
        targetStock: 14,
        recommendedReorder: 14,
        status: 'warning',
      },
    });
  });

  it.each([
    {
      status: 'critical',
      stockAvailable: 5,
      targetStock: 16,
      recommendedReorder: 11,
    },
    {
      status: 'warning',
      stockAvailable: 12,
      targetStock: 16,
      recommendedReorder: 4,
    },
    {
      status: 'ready',
      stockAvailable: 16,
      targetStock: 16,
      recommendedReorder: 0,
    },
  ])(
    'calcula targetStock, reabasto y estado $status',
    async ({ status, stockAvailable, targetStock, recommendedReorder }) => {
      const artifact = buildArtifact([buildArtifactItem('lavanda')]);
      const { service } = createService(artifact, [
        buildProduct('lavanda', { stockAvailable, stockMin: 2 }),
      ]);

      const result = await service.getForecast();

      expect(result.items[0].inventory).toEqual({
        stockAvailable,
        stockMin: 2,
        targetStock,
        recommendedReorder,
        status,
      });
    },
  );

  it('marca inventario no rastreado sin inventar existencias ni reabasto', async () => {
    const artifact = buildArtifact([buildArtifactItem('lavanda')]);
    const { service } = createService(artifact, [buildProduct('lavanda')]);

    const result = await service.getForecast();

    expect(result.items[0].inventory).toEqual({
      stockAvailable: null,
      stockMin: 2,
      targetStock: 16,
      recommendedReorder: null,
      status: 'untracked',
    });
  });

  it('consolida el resumen, ordena por reabasto y reporta productos no resueltos', async () => {
    const artifact = buildArtifact([
      buildArtifactItem('critical', { units: 10, lower: 7, upper: 14 }),
      buildArtifactItem('warning', { units: 8, lower: 5, upper: 11 }),
      buildArtifactItem('ready', { units: 6, lower: 4, upper: 8 }),
      buildArtifactItem('untracked', { units: 4, lower: 2, upper: 6 }),
      buildArtifactItem('missing', { units: 99, lower: 90, upper: 110 }),
    ]);
    const { service } = createService(artifact, [
      buildProduct('ready', { stockAvailable: 10, stockMin: 2 }),
      buildProduct('untracked'),
      buildProduct('warning', { stockAvailable: 9, stockMin: 2 }),
      buildProduct('critical', { stockAvailable: 5, stockMin: 2 }),
    ]);

    const result = await service.getForecast();

    expect(result.summary).toEqual({
      predictedUnits: 28,
      recommendedReorder: 15,
      atRiskProducts: 2,
      untrackedProducts: 1,
      totalProducts: 4,
      unresolvedProducts: 1,
    });
    expect(result.items.map((item) => item.product.slug)).toEqual([
      'critical',
      'warning',
      'ready',
      'untracked',
    ]);
    expect(result.model).toBe(artifact.model);
    expect(result.targetMonth).toBe('2026-07');
    expect(result.freshness).toMatchObject({
      targetMonth: '2026-07',
      generatedAt: artifact.model.generatedAt,
    });
  });

  it.each([
    {
      description: 'vigente durante el último día del mes objetivo',
      now: '2026-08-01T05:59:59.000Z',
      targetMonth: '2026-07',
      currentMonth: '2026-07',
      isStale: false,
    },
    {
      description: 'vencido al comenzar el mes siguiente',
      now: '2026-08-01T06:00:00.000Z',
      targetMonth: '2026-07',
      currentMonth: '2026-08',
      isStale: true,
    },
    {
      description: 'vigente cuando el mes objetivo todavía es futuro',
      now: '2026-08-15T18:00:00.000Z',
      targetMonth: '2026-09',
      currentMonth: '2026-08',
      isStale: false,
    },
  ])(
    'marca el artefacto como $description según el calendario de México',
    async ({ now, targetMonth, currentMonth, isStale }) => {
      jest.useFakeTimers().setSystemTime(new Date(now));
      const artifact = buildArtifact([buildArtifactItem('lavanda')]);
      artifact.targetMonth = targetMonth;
      const { service } = createService(artifact, [
        buildProduct('lavanda', { stockAvailable: 20 }),
      ]);

      const result = await service.getForecast();

      expect(result.freshness).toEqual({
        currentMonth,
        targetMonth,
        generatedAt: artifact.model.generatedAt,
        isStale,
      });
    },
  );

  it('considera vencido un mes objetivo con formato inválido', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-23T18:00:00.000Z'));
    const artifact = buildArtifact([buildArtifactItem('lavanda')]);
    artifact.targetMonth = 'julio';
    const { service } = createService(artifact, [
      buildProduct('lavanda', { stockAvailable: 20 }),
    ]);

    const result = await service.getForecast();

    expect(result.freshness).toMatchObject({
      currentMonth: '2026-07',
      targetMonth: 'julio',
      isStale: true,
    });
  });
});
