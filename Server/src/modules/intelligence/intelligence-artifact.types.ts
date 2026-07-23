export interface AprioriRuleArtifact {
  antecedentSlugs: string[];
  antecedentNames: string[];
  consequentSlug: string;
  consequentName: string;
  support: number;
  confidence: number;
  lift: number;
  cooccurrenceCount: number;
  score: number;
}

export interface AprioriFallbackArtifact {
  slug: string;
  name: string;
  support: number;
  transactionCount: number;
}

export interface AprioriArtifact {
  schemaVersion: string;
  model: {
    name: string;
    version: string;
    isSynthetic: boolean;
    generatedAt: string;
    datasetSha256: string;
  };
  training: {
    transactions: number;
    periodStart: string;
    periodEnd: string;
    minSupport: number;
    minConfidence: number;
    minLift: number;
  };
  metrics: {
    rules: number;
    catalogCoverage: number;
    temporalTop1HitRate: number;
    temporalTrainTransactions: number;
    temporalValidationTransactions: number;
  };
  rules: AprioriRuleArtifact[];
  popularFallbacks: AprioriFallbackArtifact[];
}

export interface MonthlyDemandArtifactItem {
  slug: string;
  productName: string;
  category: string;
  history: Array<{
    month: string;
    units: number;
  }>;
  features: {
    demandLag1m: number;
    demandLag2m: number;
    demandLag3m: number;
    averageDemand3m: number;
    ordersLag1m: number;
    averagePriceLag1m: number | null;
    averageRatingAsOf: number | null;
    reviewCountAsOf: number;
    monthNumber: number;
  };
  prediction: {
    units: number;
    lower: number;
    upper: number;
  };
}

export interface MonthlyDemandArtifact {
  schemaVersion: string;
  model: {
    name: string;
    version: string;
    isSynthetic: boolean;
    generatedAt: string;
    datasetSha256: string;
    alpha: number;
    trainingPeriod: {
      startMonth: string;
      endMonth: string;
      trainingRows: number;
      validationRows: number;
      finalTrainingRows: number;
    };
    metrics: {
      mae: number;
      rmse: number;
      r2: number;
      baselineMae: number;
      improvementPct: number;
      intervalQuantile: number;
      residualRadius: number;
    };
  };
  targetMonth: string;
  items: MonthlyDemandArtifactItem[];
}
