import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { ProductStatus } from '../products/enums/product-status.enum';
import { APRIORI_RULES_ARTIFACT } from './artifacts/apriori-rules.generated';
import type {
  AprioriArtifact,
  AprioriRuleArtifact,
} from './intelligence-artifact.types';

interface ProductRecord {
  _id: unknown;
  name: string;
  slug: string;
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
  category: string;
  benefits: string[];
  aromas?: string[];
  presentation: string;
  origin: string;
  inStock: boolean;
  stockAvailable?: number;
  stockReserved?: number;
  stockMin?: number;
  allowBackorder?: boolean;
  rating?: number;
  reviews?: number;
  sortOrder?: number;
  status: ProductStatus;
}

@Injectable()
export class RecommendationsService {
  private readonly artifact: AprioriArtifact = APRIORI_RULES_ARTIFACT;

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async recommendForBasket(productIds: string[], requestedLimit = 1) {
    const uniqueProductIds = [...new Set(productIds)].slice(0, 25);
    const limit = Math.max(1, Math.min(3, requestedLimit));
    const basketProducts = (await this.productModel
      .find({ _id: { $in: uniqueProductIds } })
      .select('name slug')
      .lean()
      .exec()) as Array<Pick<ProductRecord, '_id' | 'name' | 'slug'>>;
    const basketSlugs = new Set(basketProducts.map((product) => product.slug));

    const applicableRules = this.artifact.rules
      .filter(
        (rule) =>
          rule.antecedentSlugs.every((slug) => basketSlugs.has(slug)) &&
          !basketSlugs.has(rule.consequentSlug),
      )
      .sort((left, right) => this.compareRules(left, right));

    const ruleByConsequent = new Map<string, AprioriRuleArtifact>();
    for (const rule of applicableRules) {
      if (!ruleByConsequent.has(rule.consequentSlug)) {
        ruleByConsequent.set(rule.consequentSlug, rule);
      }
    }

    const ruleCandidates = await this.findAvailableProducts([
      ...ruleByConsequent.keys(),
    ]);
    const recommendations = ruleCandidates
      .sort((left, right) =>
        this.compareRules(
          ruleByConsequent.get(left.slug)!,
          ruleByConsequent.get(right.slug)!,
        ),
      )
      .slice(0, limit)
      .map((product) => {
        const rule = ruleByConsequent.get(product.slug)!;
        return {
          product: this.toPublicProduct(product),
          basedOn: rule.antecedentNames,
          explanation: this.buildRuleExplanation(rule),
          metrics: {
            support: rule.support,
            confidence: rule.confidence,
            lift: rule.lift,
          },
        };
      });

    if (recommendations.length > 0) {
      return this.buildResponse('apriori', recommendations);
    }

    const fallbackSlugs = this.artifact.popularFallbacks
      .map((fallback) => fallback.slug)
      .filter((slug) => !basketSlugs.has(slug));
    const fallbackProducts = await this.findAvailableProducts(fallbackSlugs);
    const fallbackOrder = new Map(
      fallbackSlugs.map((slug, index) => [slug, index]),
    );
    const fallbackRecommendations = fallbackProducts
      .sort(
        (left, right) =>
          (fallbackOrder.get(left.slug) ?? Number.MAX_SAFE_INTEGER) -
          (fallbackOrder.get(right.slug) ?? Number.MAX_SAFE_INTEGER),
      )
      .slice(0, limit)
      .map((product) => ({
        product: this.toPublicProduct(product),
        basedOn: [],
        explanation:
          'Es una de las opciones más elegidas en las canastas de prueba de INHALEX.',
      }));

    return this.buildResponse(
      fallbackRecommendations.length > 0 ? 'fallback' : 'none',
      fallbackRecommendations,
    );
  }

  async getAdminSummary() {
    const catalog = (await this.productModel
      .find({ status: { $ne: ProductStatus.ARCHIVED } })
      .select('slug name status inStock stockAvailable allowBackorder')
      .lean()
      .exec()) as Array<
      Pick<
        ProductRecord,
        | 'slug'
        | 'name'
        | 'status'
        | 'inStock'
        | 'stockAvailable'
        | 'allowBackorder'
      >
    >;
    const productsBySlug = new Map(
      catalog.map((product) => [product.slug, product]),
    );
    const unresolvedSlugs = new Set<string>();

    for (const rule of this.artifact.rules) {
      for (const slug of [...rule.antecedentSlugs, rule.consequentSlug]) {
        if (!productsBySlug.has(slug)) {
          unresolvedSlugs.add(slug);
        }
      }
    }

    return {
      model: this.artifact.model,
      training: this.artifact.training,
      metrics: this.artifact.metrics,
      health: {
        rules: this.artifact.rules.length,
        catalogProducts: catalog.length,
        unresolvedSlugs: [...unresolvedSlugs].sort(),
        immediatelyAvailableProducts: catalog.filter(
          (product) =>
            product.status === ProductStatus.ACTIVE &&
            this.isAvailable(product),
        ).length,
      },
      topRules: this.artifact.rules.slice(0, 10).map((rule) => {
        const participatingSlugs = [
          ...rule.antecedentSlugs,
          rule.consequentSlug,
        ];

        return {
          ...rule,
          available: participatingSlugs.every((slug) => {
            const product = productsBySlug.get(slug);
            return Boolean(product && this.isAvailable(product));
          }),
        };
      }),
    };
  }

  private async findAvailableProducts(slugs: string[]) {
    if (slugs.length === 0) {
      return [];
    }

    const products = (await this.productModel
      .find({
        slug: { $in: [...new Set(slugs)] },
        status: ProductStatus.ACTIVE,
      })
      .select(
        'name slug description longDescription price promoActive promoLabel promoDescription promoPrice promoEndsAt currency image category benefits aromas presentation origin inStock stockAvailable stockReserved stockMin allowBackorder rating reviews sortOrder status',
      )
      .lean()
      .exec()) as ProductRecord[];

    return products.filter((product) => this.isAvailable(product));
  }

  private isAvailable(
    product: Pick<
      ProductRecord,
      'stockAvailable' | 'inStock' | 'allowBackorder'
    > &
      Partial<Pick<ProductRecord, 'status'>>,
  ) {
    if (
      typeof product.status !== 'undefined' &&
      product.status !== ProductStatus.ACTIVE
    ) {
      return false;
    }

    return typeof product.stockAvailable === 'number'
      ? product.stockAvailable > 0 || product.allowBackorder === true
      : product.inStock || product.allowBackorder === true;
  }

  private compareRules(left: AprioriRuleArtifact, right: AprioriRuleArtifact) {
    return (
      right.antecedentSlugs.length - left.antecedentSlugs.length ||
      right.score - left.score ||
      right.lift - left.lift ||
      right.confidence - left.confidence ||
      right.support - left.support ||
      right.cooccurrenceCount - left.cooccurrenceCount
    );
  }

  private buildRuleExplanation(rule: AprioriRuleArtifact) {
    const antecedent = rule.antecedentNames.join(' y ');
    return `En las canastas de prueba, ${rule.consequentName} apareció con frecuencia cuando se eligió ${antecedent}.`;
  }

  private toPublicProduct(product: ProductRecord) {
    const publicProduct = { ...product };
    delete (publicProduct as Partial<ProductRecord>).status;

    return {
      ...publicProduct,
      _id: String(product._id),
    };
  }

  private buildResponse(
    source: 'apriori' | 'fallback' | 'none',
    recommendations: Array<Record<string, unknown>>,
  ) {
    return {
      source,
      recommendations,
      model: {
        version: this.artifact.model.version,
        isSynthetic: this.artifact.model.isSynthetic,
        generatedAt: this.artifact.model.generatedAt,
      },
    };
  }
}
