import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { ProductStatus } from '../products/enums/product-status.enum';
import { MONTHLY_DEMAND_ARTIFACT } from './artifacts/monthly-demand.generated';
import type { MonthlyDemandArtifact } from './intelligence-artifact.types';

interface InventoryProductRecord {
  _id: unknown;
  slug: string;
  name: string;
  category: string;
  image?: string;
  presentation?: string;
  stockAvailable?: number;
  stockMin?: number;
}

@Injectable()
export class MonthlyDemandService {
  private readonly artifact: MonthlyDemandArtifact = MONTHLY_DEMAND_ARTIFACT;

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async getForecast() {
    const artifactItemsBySlug = new Map(
      this.artifact.items.map((item) => [item.slug, item]),
    );
    const products = (await this.productModel
      .find({
        slug: { $in: [...artifactItemsBySlug.keys()] },
        status: ProductStatus.ACTIVE,
      })
      .select('slug name category image presentation stockAvailable stockMin')
      .lean()
      .exec()) as InventoryProductRecord[];

    const items = products
      .map((product) => {
        const artifactItem = artifactItemsBySlug.get(product.slug)!;
        const prediction = {
          units: this.nonNegativeInteger(artifactItem.prediction.units),
          lower: this.nonNegativeInteger(artifactItem.prediction.lower),
          upper: this.nonNegativeInteger(artifactItem.prediction.upper),
        };
        const stockMin = this.nonNegativeInteger(product.stockMin ?? 0);
        const stockIsTracked =
          typeof product.stockAvailable === 'number' &&
          Number.isFinite(product.stockAvailable);
        const stockAvailable = stockIsTracked
          ? this.nonNegativeInteger(product.stockAvailable ?? 0)
          : null;
        const targetStock = this.nonNegativeInteger(
          prediction.upper + stockMin,
        );
        const recommendedReorder =
          stockAvailable === null
            ? null
            : Math.max(0, targetStock - stockAvailable);
        const status =
          stockAvailable === null
            ? 'untracked'
            : stockAvailable < prediction.units
              ? 'critical'
              : stockAvailable < targetStock
                ? 'warning'
                : 'ready';

        return {
          product: {
            id: String(product._id),
            slug: product.slug,
            name: product.name,
            category: product.category,
            image: product.image,
            presentation: product.presentation,
          },
          history: artifactItem.history,
          features: artifactItem.features,
          prediction,
          inventory: {
            stockAvailable,
            stockMin,
            targetStock,
            recommendedReorder,
            status,
          },
        };
      })
      .sort(
        (left, right) =>
          (right.inventory.recommendedReorder ?? -1) -
            (left.inventory.recommendedReorder ?? -1) ||
          right.prediction.units - left.prediction.units,
      );

    return {
      model: this.artifact.model,
      targetMonth: this.artifact.targetMonth,
      freshness: this.buildFreshness(),
      summary: {
        predictedUnits: items.reduce(
          (total, item) => total + item.prediction.units,
          0,
        ),
        recommendedReorder: items.reduce(
          (total, item) => total + (item.inventory.recommendedReorder ?? 0),
          0,
        ),
        atRiskProducts: items.filter((item) =>
          ['critical', 'warning'].includes(item.inventory.status),
        ).length,
        untrackedProducts: items.filter(
          (item) => item.inventory.status === 'untracked',
        ).length,
        totalProducts: items.length,
        unresolvedProducts: Math.max(
          0,
          this.artifact.items.length - items.length,
        ),
      },
      items,
    };
  }

  private nonNegativeInteger(value: number) {
    return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
  }

  private buildFreshness(now = new Date()) {
    const dateParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(now);
    const currentMonth = `${dateParts.find((part) => part.type === 'year')?.value}-${dateParts.find((part) => part.type === 'month')?.value}`;
    const targetMonth = this.artifact.targetMonth;
    const isValidTargetMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(targetMonth);

    return {
      currentMonth,
      targetMonth,
      generatedAt: this.artifact.model.generatedAt,
      // El pronóstico es válido durante todo su mes objetivo. A partir del
      // siguiente mes ya no debe respaldar decisiones de inventario.
      isStale: !isValidTargetMonth || targetMonth < currentMonth,
    };
  }
}
