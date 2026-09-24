/* eslint-disable prettier/prettier */
/* Archivo generado por ml/src/train_apriori.py. No editar manualmente. */
import type { AprioriArtifact } from '../intelligence-artifact.types';

export const APRIORI_RULES_ARTIFACT = {
  "schemaVersion": "1.1",
  "model": {
    "name": "Apriori",
    "version": "2.0.0",
    "isSynthetic": true,
    "generatedAt": "2026-08-02T23:41:37.621798+00:00",
    "datasetSha256": "be2594809c38bd1f0e0e70b987b232a0cf70b226f62db2c2ac6144a953159e3e"
  },
  "training": {
    "transactions": 1661,
    "periodStart": "2025-01-08T18:27:37-06:00",
    "periodEnd": "2026-06-30T18:07:50-06:00",
    "minSupport": 0.008,
    "minConfidence": 0.1,
    "minLift": 1.05,
    "maxItemsetSize": 5,
    "maxAntecedentSize": 4
  },
  "metrics": {
    "rules": 231,
    "multiAntecedentRules": 165,
    "maxAntecedentSizeFound": 4,
    "catalogCoverage": 1.0,
    "temporalTop1HitRate": 0.477396,
    "temporalEvaluatedContexts": 553,
    "temporalTrainTransactions": 1328,
    "temporalValidationTransactions": 333
  },
  "rules": [
    {
      "antecedentSlugs": [
        "eucalipto",
        "menta",
        "romero",
        "vaporub"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Menta",
        "Romero",
        "Vaporub"
      ],
      "consequentSlug": "hierbabuena",
      "consequentName": "Hierbabuena",
      "support": 0.047562,
      "confidence": 0.9875,
      "lift": 8.818481,
      "cooccurrenceCount": 79,
      "score": 8.70825
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "cafe",
        "canela",
        "jengibre"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Café",
        "Canela",
        "Jengibre"
      ],
      "consequentSlug": "copal",
      "consequentName": "Copal",
      "support": 0.051776,
      "confidence": 1.0,
      "lift": 8.517949,
      "cooccurrenceCount": 86,
      "score": 8.517949
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "cafe",
        "canela",
        "copal"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Café",
        "Canela",
        "Copal"
      ],
      "consequentSlug": "jengibre",
      "consequentName": "Jengibre",
      "support": 0.051776,
      "confidence": 1.0,
      "lift": 7.481982,
      "cooccurrenceCount": 86,
      "score": 7.481982
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "canela",
        "copal",
        "jengibre"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Canela",
        "Copal",
        "Jengibre"
      ],
      "consequentSlug": "cafe",
      "consequentName": "Café",
      "support": 0.051776,
      "confidence": 1.0,
      "lift": 7.317181,
      "cooccurrenceCount": 86,
      "score": 7.317181
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "hierbabuena",
        "menta",
        "vaporub"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Hierbabuena",
        "Menta",
        "Vaporub"
      ],
      "consequentSlug": "romero",
      "consequentName": "Romero",
      "support": 0.047562,
      "confidence": 1.0,
      "lift": 7.128755,
      "cooccurrenceCount": 79,
      "score": 7.128755
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "hierbabuena",
        "romero",
        "vaporub"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Hierbabuena",
        "Romero",
        "Vaporub"
      ],
      "consequentSlug": "menta",
      "consequentName": "Menta",
      "support": 0.047562,
      "confidence": 1.0,
      "lift": 6.835391,
      "cooccurrenceCount": 79,
      "score": 6.835391
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "hierbabuena",
        "menta",
        "romero"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Hierbabuena",
        "Menta",
        "Romero"
      ],
      "consequentSlug": "vaporub",
      "consequentName": "Vaporub",
      "support": 0.047562,
      "confidence": 1.0,
      "lift": 6.670683,
      "cooccurrenceCount": 79,
      "score": 6.670683
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "lavanda",
        "manzanilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Lavanda",
        "Manzanilla",
        "Toronjil"
      ],
      "consequentSlug": "rosas-de-castilla",
      "consequentName": "Rosas de Castilla",
      "support": 0.045756,
      "confidence": 0.987013,
      "lift": 6.691545,
      "cooccurrenceCount": 76,
      "score": 6.604642
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "lavanda",
        "manzanilla",
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Lavanda",
        "Manzanilla",
        "Rosas de Castilla"
      ],
      "consequentSlug": "toronjil",
      "consequentName": "Toronjil",
      "support": 0.045756,
      "confidence": 1.0,
      "lift": 6.463035,
      "cooccurrenceCount": 76,
      "score": 6.463035
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "cafe",
        "copal",
        "jengibre"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Café",
        "Copal",
        "Jengibre"
      ],
      "consequentSlug": "canela",
      "consequentName": "Canela",
      "support": 0.051776,
      "confidence": 1.0,
      "lift": 6.388462,
      "cooccurrenceCount": 86,
      "score": 6.388462
    },
    {
      "antecedentSlugs": [
        "hierbabuena",
        "menta",
        "romero",
        "vaporub"
      ],
      "antecedentNames": [
        "Hierbabuena",
        "Menta",
        "Romero",
        "Vaporub"
      ],
      "consequentSlug": "eucalipto",
      "consequentName": "Eucalipto",
      "support": 0.047562,
      "confidence": 1.0,
      "lift": 6.339695,
      "cooccurrenceCount": 79,
      "score": 6.339695
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "manzanilla",
        "rosas-de-castilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Manzanilla",
        "Rosas de Castilla",
        "Toronjil"
      ],
      "consequentSlug": "lavanda",
      "consequentName": "Lavanda",
      "support": 0.045756,
      "confidence": 1.0,
      "lift": 6.04,
      "cooccurrenceCount": 76,
      "score": 6.04
    },
    {
      "antecedentSlugs": [
        "cafe",
        "canela",
        "copal",
        "jengibre"
      ],
      "antecedentNames": [
        "Café",
        "Canela",
        "Copal",
        "Jengibre"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.051776,
      "confidence": 1.0,
      "lift": 5.807692,
      "cooccurrenceCount": 86,
      "score": 5.807692
    },
    {
      "antecedentSlugs": [
        "lavanda",
        "manzanilla",
        "rosas-de-castilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Lavanda",
        "Manzanilla",
        "Rosas de Castilla",
        "Toronjil"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.045756,
      "confidence": 0.987013,
      "lift": 5.732268,
      "cooccurrenceCount": 76,
      "score": 5.657823
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "lavanda",
        "rosas-de-castilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Lavanda",
        "Rosas de Castilla",
        "Toronjil"
      ],
      "consequentSlug": "manzanilla",
      "consequentName": "Manzanilla",
      "support": 0.045756,
      "confidence": 1.0,
      "lift": 5.375405,
      "cooccurrenceCount": 76,
      "score": 5.375405
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "menta",
        "romero"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Menta",
        "Romero"
      ],
      "consequentSlug": "hierbabuena",
      "consequentName": "Hierbabuena",
      "support": 0.047562,
      "confidence": 0.9875,
      "lift": 8.818481,
      "cooccurrenceCount": 79,
      "score": 8.70825
    },
    {
      "antecedentSlugs": [
        "menta",
        "romero",
        "vaporub"
      ],
      "antecedentNames": [
        "Menta",
        "Romero",
        "Vaporub"
      ],
      "consequentSlug": "hierbabuena",
      "consequentName": "Hierbabuena",
      "support": 0.047562,
      "confidence": 0.9875,
      "lift": 8.818481,
      "cooccurrenceCount": 79,
      "score": 8.70825
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "cafe",
        "jengibre"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Café",
        "Jengibre"
      ],
      "consequentSlug": "copal",
      "consequentName": "Copal",
      "support": 0.051776,
      "confidence": 1.0,
      "lift": 8.517949,
      "cooccurrenceCount": 86,
      "score": 8.517949
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "cafe",
        "canela"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Café",
        "Canela"
      ],
      "consequentSlug": "copal",
      "consequentName": "Copal",
      "support": 0.051776,
      "confidence": 0.988506,
      "lift": 8.420041,
      "cooccurrenceCount": 86,
      "score": 8.323259
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "romero",
        "vaporub"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Romero",
        "Vaporub"
      ],
      "consequentSlug": "hierbabuena",
      "consequentName": "Hierbabuena",
      "support": 0.047562,
      "confidence": 0.963415,
      "lift": 8.603396,
      "cooccurrenceCount": 79,
      "score": 8.288638
    },
    {
      "antecedentSlugs": [
        "cafe",
        "canela",
        "jengibre"
      ],
      "antecedentNames": [
        "Café",
        "Canela",
        "Jengibre"
      ],
      "consequentSlug": "copal",
      "consequentName": "Copal",
      "support": 0.051776,
      "confidence": 0.977273,
      "lift": 8.324359,
      "cooccurrenceCount": 86,
      "score": 8.135169
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "canela",
        "jengibre"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Canela",
        "Jengibre"
      ],
      "consequentSlug": "copal",
      "consequentName": "Copal",
      "support": 0.051776,
      "confidence": 0.966292,
      "lift": 8.230827,
      "cooccurrenceCount": 86,
      "score": 7.953383
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "cafe",
        "copal"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Café",
        "Copal"
      ],
      "consequentSlug": "jengibre",
      "consequentName": "Jengibre",
      "support": 0.051776,
      "confidence": 1.0,
      "lift": 7.481982,
      "cooccurrenceCount": 86,
      "score": 7.481982
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "canela",
        "copal"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Canela",
        "Copal"
      ],
      "consequentSlug": "jengibre",
      "consequentName": "Jengibre",
      "support": 0.051776,
      "confidence": 1.0,
      "lift": 7.481982,
      "cooccurrenceCount": 86,
      "score": 7.481982
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "canela",
        "copal"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Canela",
        "Copal"
      ],
      "consequentSlug": "cafe",
      "consequentName": "Café",
      "support": 0.051776,
      "confidence": 1.0,
      "lift": 7.317181,
      "cooccurrenceCount": 86,
      "score": 7.317181
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "copal",
        "jengibre"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Copal",
        "Jengibre"
      ],
      "consequentSlug": "cafe",
      "consequentName": "Café",
      "support": 0.051776,
      "confidence": 1.0,
      "lift": 7.317181,
      "cooccurrenceCount": 86,
      "score": 7.317181
    },
    {
      "antecedentSlugs": [
        "canela",
        "copal",
        "jengibre"
      ],
      "antecedentNames": [
        "Canela",
        "Copal",
        "Jengibre"
      ],
      "consequentSlug": "cafe",
      "consequentName": "Café",
      "support": 0.051776,
      "confidence": 1.0,
      "lift": 7.317181,
      "cooccurrenceCount": 86,
      "score": 7.317181
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "cafe",
        "canela"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Café",
        "Canela"
      ],
      "consequentSlug": "jengibre",
      "consequentName": "Jengibre",
      "support": 0.051776,
      "confidence": 0.988506,
      "lift": 7.395982,
      "cooccurrenceCount": 86,
      "score": 7.310971
    },
    {
      "antecedentSlugs": [
        "cafe",
        "canela",
        "copal"
      ],
      "antecedentNames": [
        "Café",
        "Canela",
        "Copal"
      ],
      "consequentSlug": "jengibre",
      "consequentName": "Jengibre",
      "support": 0.051776,
      "confidence": 0.988506,
      "lift": 7.395982,
      "cooccurrenceCount": 86,
      "score": 7.310971
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "hierbabuena",
        "menta"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Hierbabuena",
        "Menta"
      ],
      "consequentSlug": "romero",
      "consequentName": "Romero",
      "support": 0.047562,
      "confidence": 0.9875,
      "lift": 7.039646,
      "cooccurrenceCount": 79,
      "score": 6.95165
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "menta",
        "vaporub"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Menta",
        "Vaporub"
      ],
      "consequentSlug": "hierbabuena",
      "consequentName": "Hierbabuena",
      "support": 0.047562,
      "confidence": 0.877778,
      "lift": 7.83865,
      "cooccurrenceCount": 79,
      "score": 6.880593
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "canela",
        "jengibre"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Canela",
        "Jengibre"
      ],
      "consequentSlug": "cafe",
      "consequentName": "Café",
      "support": 0.051776,
      "confidence": 0.966292,
      "lift": 7.070534,
      "cooccurrenceCount": 86,
      "score": 6.832201
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "hierbabuena",
        "vaporub"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Hierbabuena",
        "Vaporub"
      ],
      "consequentSlug": "romero",
      "consequentName": "Romero",
      "support": 0.047562,
      "confidence": 0.975309,
      "lift": 6.952737,
      "cooccurrenceCount": 79,
      "score": 6.781064
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "menta",
        "romero"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Menta",
        "Romero"
      ],
      "consequentSlug": "vaporub",
      "consequentName": "Vaporub",
      "support": 0.048164,
      "confidence": 1.0,
      "lift": 6.670683,
      "cooccurrenceCount": 80,
      "score": 6.670683
    },
    {
      "antecedentSlugs": [
        "hierbabuena",
        "menta",
        "romero"
      ],
      "antecedentNames": [
        "Hierbabuena",
        "Menta",
        "Romero"
      ],
      "consequentSlug": "vaporub",
      "consequentName": "Vaporub",
      "support": 0.047562,
      "confidence": 1.0,
      "lift": 6.670683,
      "cooccurrenceCount": 79,
      "score": 6.670683
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "hierbabuena",
        "romero"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Hierbabuena",
        "Romero"
      ],
      "consequentSlug": "menta",
      "consequentName": "Menta",
      "support": 0.047562,
      "confidence": 0.9875,
      "lift": 6.749949,
      "cooccurrenceCount": 79,
      "score": 6.665574
    },
    {
      "antecedentSlugs": [
        "hierbabuena",
        "romero",
        "vaporub"
      ],
      "antecedentNames": [
        "Hierbabuena",
        "Romero",
        "Vaporub"
      ],
      "consequentSlug": "menta",
      "consequentName": "Menta",
      "support": 0.047562,
      "confidence": 0.9875,
      "lift": 6.749949,
      "cooccurrenceCount": 79,
      "score": 6.665574
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "lavanda",
        "toronjil"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Lavanda",
        "Toronjil"
      ],
      "consequentSlug": "rosas-de-castilla",
      "consequentName": "Rosas de Castilla",
      "support": 0.045756,
      "confidence": 0.987013,
      "lift": 6.691545,
      "cooccurrenceCount": 76,
      "score": 6.604642
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "romero",
        "vaporub"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Romero",
        "Vaporub"
      ],
      "consequentSlug": "menta",
      "consequentName": "Menta",
      "support": 0.048164,
      "confidence": 0.97561,
      "lift": 6.668674,
      "cooccurrenceCount": 80,
      "score": 6.506024
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "hierbabuena",
        "menta"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Hierbabuena",
        "Menta"
      ],
      "consequentSlug": "vaporub",
      "consequentName": "Vaporub",
      "support": 0.047562,
      "confidence": 0.9875,
      "lift": 6.587299,
      "cooccurrenceCount": 79,
      "score": 6.504958
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "hierbabuena",
        "romero"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Hierbabuena",
        "Romero"
      ],
      "consequentSlug": "vaporub",
      "consequentName": "Vaporub",
      "support": 0.047562,
      "confidence": 0.9875,
      "lift": 6.587299,
      "cooccurrenceCount": 79,
      "score": 6.504958
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "hierbabuena",
        "vaporub"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Hierbabuena",
        "Vaporub"
      ],
      "consequentSlug": "menta",
      "consequentName": "Menta",
      "support": 0.047562,
      "confidence": 0.975309,
      "lift": 6.666616,
      "cooccurrenceCount": 79,
      "score": 6.502008
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "cafe",
        "copal"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Café",
        "Copal"
      ],
      "consequentSlug": "canela",
      "consequentName": "Canela",
      "support": 0.051776,
      "confidence": 1.0,
      "lift": 6.388462,
      "cooccurrenceCount": 86,
      "score": 6.388462
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "cafe",
        "jengibre"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Café",
        "Jengibre"
      ],
      "consequentSlug": "canela",
      "consequentName": "Canela",
      "support": 0.051776,
      "confidence": 1.0,
      "lift": 6.388462,
      "cooccurrenceCount": 86,
      "score": 6.388462
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "copal",
        "jengibre"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Copal",
        "Jengibre"
      ],
      "consequentSlug": "canela",
      "consequentName": "Canela",
      "support": 0.051776,
      "confidence": 1.0,
      "lift": 6.388462,
      "cooccurrenceCount": 86,
      "score": 6.388462
    },
    {
      "antecedentSlugs": [
        "menta",
        "romero",
        "vaporub"
      ],
      "antecedentNames": [
        "Menta",
        "Romero",
        "Vaporub"
      ],
      "consequentSlug": "eucalipto",
      "consequentName": "Eucalipto",
      "support": 0.048164,
      "confidence": 1.0,
      "lift": 6.339695,
      "cooccurrenceCount": 80,
      "score": 6.339695
    },
    {
      "antecedentSlugs": [
        "hierbabuena",
        "menta",
        "romero"
      ],
      "antecedentNames": [
        "Hierbabuena",
        "Menta",
        "Romero"
      ],
      "consequentSlug": "eucalipto",
      "consequentName": "Eucalipto",
      "support": 0.047562,
      "confidence": 1.0,
      "lift": 6.339695,
      "cooccurrenceCount": 79,
      "score": 6.339695
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "lavanda",
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Lavanda",
        "Rosas de Castilla"
      ],
      "consequentSlug": "toronjil",
      "consequentName": "Toronjil",
      "support": 0.045756,
      "confidence": 0.987013,
      "lift": 6.379099,
      "cooccurrenceCount": 76,
      "score": 6.296254
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "manzanilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Manzanilla",
        "Toronjil"
      ],
      "consequentSlug": "rosas-de-castilla",
      "consequentName": "Rosas de Castilla",
      "support": 0.045756,
      "confidence": 0.962025,
      "lift": 6.522139,
      "cooccurrenceCount": 76,
      "score": 6.274463
    },
    {
      "antecedentSlugs": [
        "cafe",
        "copal",
        "jengibre"
      ],
      "antecedentNames": [
        "Café",
        "Copal",
        "Jengibre"
      ],
      "consequentSlug": "canela",
      "consequentName": "Canela",
      "support": 0.051776,
      "confidence": 0.988506,
      "lift": 6.315031,
      "cooccurrenceCount": 86,
      "score": 6.242444
    },
    {
      "antecedentSlugs": [
        "hierbabuena",
        "romero",
        "vaporub"
      ],
      "antecedentNames": [
        "Hierbabuena",
        "Romero",
        "Vaporub"
      ],
      "consequentSlug": "eucalipto",
      "consequentName": "Eucalipto",
      "support": 0.047562,
      "confidence": 0.9875,
      "lift": 6.260448,
      "cooccurrenceCount": 79,
      "score": 6.182193
    },
    {
      "antecedentSlugs": [
        "hierbabuena",
        "menta",
        "vaporub"
      ],
      "antecedentNames": [
        "Hierbabuena",
        "Menta",
        "Vaporub"
      ],
      "consequentSlug": "romero",
      "consequentName": "Romero",
      "support": 0.047562,
      "confidence": 0.929412,
      "lift": 6.625549,
      "cooccurrenceCount": 79,
      "score": 6.157863
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "lavanda",
        "manzanilla"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Lavanda",
        "Manzanilla"
      ],
      "consequentSlug": "rosas-de-castilla",
      "consequentName": "Rosas de Castilla",
      "support": 0.045756,
      "confidence": 0.938272,
      "lift": 6.361099,
      "cooccurrenceCount": 76,
      "score": 5.968438
    },
    {
      "antecedentSlugs": [
        "manzanilla",
        "rosas-de-castilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Manzanilla",
        "Rosas de Castilla",
        "Toronjil"
      ],
      "consequentSlug": "lavanda",
      "consequentName": "Lavanda",
      "support": 0.046358,
      "confidence": 0.987179,
      "lift": 5.962564,
      "cooccurrenceCount": 77,
      "score": 5.886121
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "rosas-de-castilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Rosas de Castilla",
        "Toronjil"
      ],
      "consequentSlug": "lavanda",
      "consequentName": "Lavanda",
      "support": 0.045756,
      "confidence": 0.987013,
      "lift": 5.961558,
      "cooccurrenceCount": 76,
      "score": 5.884136
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "lavanda",
        "manzanilla"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Lavanda",
        "Manzanilla"
      ],
      "consequentSlug": "toronjil",
      "consequentName": "Toronjil",
      "support": 0.046358,
      "confidence": 0.950617,
      "lift": 6.143873,
      "cooccurrenceCount": 77,
      "score": 5.840472
    },
    {
      "antecedentSlugs": [
        "lavanda",
        "manzanilla",
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Lavanda",
        "Manzanilla",
        "Rosas de Castilla"
      ],
      "consequentSlug": "toronjil",
      "consequentName": "Toronjil",
      "support": 0.046358,
      "confidence": 0.950617,
      "lift": 6.143873,
      "cooccurrenceCount": 77,
      "score": 5.840472
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "manzanilla",
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Manzanilla",
        "Rosas de Castilla"
      ],
      "consequentSlug": "toronjil",
      "consequentName": "Toronjil",
      "support": 0.045756,
      "confidence": 0.95,
      "lift": 6.139883,
      "cooccurrenceCount": 76,
      "score": 5.832889
    },
    {
      "antecedentSlugs": [
        "canela",
        "copal",
        "jengibre"
      ],
      "antecedentNames": [
        "Canela",
        "Copal",
        "Jengibre"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.051776,
      "confidence": 1.0,
      "lift": 5.807692,
      "cooccurrenceCount": 86,
      "score": 5.807692
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "manzanilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Manzanilla",
        "Toronjil"
      ],
      "consequentSlug": "lavanda",
      "consequentName": "Lavanda",
      "support": 0.046358,
      "confidence": 0.974684,
      "lift": 5.887089,
      "cooccurrenceCount": 77,
      "score": 5.738048
    },
    {
      "antecedentSlugs": [
        "cafe",
        "canela",
        "copal"
      ],
      "antecedentNames": [
        "Café",
        "Canela",
        "Copal"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.051776,
      "confidence": 0.988506,
      "lift": 5.740937,
      "cooccurrenceCount": 86,
      "score": 5.674949
    },
    {
      "antecedentSlugs": [
        "cafe",
        "copal",
        "jengibre"
      ],
      "antecedentNames": [
        "Café",
        "Copal",
        "Jengibre"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.051776,
      "confidence": 0.988506,
      "lift": 5.740937,
      "cooccurrenceCount": 86,
      "score": 5.674949
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "menta",
        "vaporub"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Menta",
        "Vaporub"
      ],
      "consequentSlug": "romero",
      "consequentName": "Romero",
      "support": 0.048164,
      "confidence": 0.888889,
      "lift": 6.336671,
      "cooccurrenceCount": 80,
      "score": 5.632597
    },
    {
      "antecedentSlugs": [
        "cafe",
        "canela",
        "jengibre"
      ],
      "antecedentNames": [
        "Café",
        "Canela",
        "Jengibre"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.051776,
      "confidence": 0.977273,
      "lift": 5.675699,
      "cooccurrenceCount": 86,
      "score": 5.546706
    },
    {
      "antecedentSlugs": [
        "manzanilla",
        "rosas-de-castilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Manzanilla",
        "Rosas de Castilla",
        "Toronjil"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.045756,
      "confidence": 0.974359,
      "lift": 5.658777,
      "cooccurrenceCount": 76,
      "score": 5.51368
    },
    {
      "antecedentSlugs": [
        "hierbabuena",
        "menta",
        "vaporub"
      ],
      "antecedentNames": [
        "Hierbabuena",
        "Menta",
        "Vaporub"
      ],
      "consequentSlug": "eucalipto",
      "consequentName": "Eucalipto",
      "support": 0.047562,
      "confidence": 0.929412,
      "lift": 5.892187,
      "cooccurrenceCount": 79,
      "score": 5.476268
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "manzanilla",
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Manzanilla",
        "Rosas de Castilla"
      ],
      "consequentSlug": "lavanda",
      "consequentName": "Lavanda",
      "support": 0.045756,
      "confidence": 0.95,
      "lift": 5.738,
      "cooccurrenceCount": 76,
      "score": 5.4511
    },
    {
      "antecedentSlugs": [
        "lavanda",
        "manzanilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Lavanda",
        "Manzanilla",
        "Toronjil"
      ],
      "consequentSlug": "rosas-de-castilla",
      "consequentName": "Rosas de Castilla",
      "support": 0.046358,
      "confidence": 0.895349,
      "lift": 6.0701,
      "cooccurrenceCount": 77,
      "score": 5.434857
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "lavanda",
        "toronjil"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Lavanda",
        "Toronjil"
      ],
      "consequentSlug": "manzanilla",
      "consequentName": "Manzanilla",
      "support": 0.046358,
      "confidence": 1.0,
      "lift": 5.375405,
      "cooccurrenceCount": 77,
      "score": 5.375405
    },
    {
      "antecedentSlugs": [
        "lavanda",
        "rosas-de-castilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Lavanda",
        "Rosas de Castilla",
        "Toronjil"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.045756,
      "confidence": 0.95,
      "lift": 5.517308,
      "cooccurrenceCount": 76,
      "score": 5.241442
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "lavanda",
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Lavanda",
        "Rosas de Castilla"
      ],
      "consequentSlug": "manzanilla",
      "consequentName": "Manzanilla",
      "support": 0.045756,
      "confidence": 0.987013,
      "lift": 5.305594,
      "cooccurrenceCount": 76,
      "score": 5.23669
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "rosas-de-castilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Rosas de Castilla",
        "Toronjil"
      ],
      "consequentSlug": "manzanilla",
      "consequentName": "Manzanilla",
      "support": 0.045756,
      "confidence": 0.987013,
      "lift": 5.305594,
      "cooccurrenceCount": 76,
      "score": 5.23669
    },
    {
      "antecedentSlugs": [
        "lavanda",
        "manzanilla",
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Lavanda",
        "Manzanilla",
        "Rosas de Castilla"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.045756,
      "confidence": 0.938272,
      "lift": 5.449193,
      "cooccurrenceCount": 76,
      "score": 5.112823
    },
    {
      "antecedentSlugs": [
        "lavanda",
        "rosas-de-castilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Lavanda",
        "Rosas de Castilla",
        "Toronjil"
      ],
      "consequentSlug": "manzanilla",
      "consequentName": "Manzanilla",
      "support": 0.046358,
      "confidence": 0.9625,
      "lift": 5.173827,
      "cooccurrenceCount": 77,
      "score": 4.979808
    },
    {
      "antecedentSlugs": [
        "lavanda",
        "manzanilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Lavanda",
        "Manzanilla",
        "Toronjil"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.046358,
      "confidence": 0.895349,
      "lift": 5.199911,
      "cooccurrenceCount": 77,
      "score": 4.655734
    },
    {
      "antecedentSlugs": [
        "cafe",
        "jengibre"
      ],
      "antecedentNames": [
        "Café",
        "Jengibre"
      ],
      "consequentSlug": "copal",
      "consequentName": "Copal",
      "support": 0.052378,
      "confidence": 0.956044,
      "lift": 8.143533,
      "cooccurrenceCount": 87,
      "score": 7.785576
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "jengibre"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Jengibre"
      ],
      "consequentSlug": "copal",
      "consequentName": "Copal",
      "support": 0.051776,
      "confidence": 0.955556,
      "lift": 8.139373,
      "cooccurrenceCount": 86,
      "score": 7.777623
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "cafe"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Café"
      ],
      "consequentSlug": "copal",
      "consequentName": "Copal",
      "support": 0.051776,
      "confidence": 0.924731,
      "lift": 7.876813,
      "cooccurrenceCount": 86,
      "score": 7.283934
    },
    {
      "antecedentSlugs": [
        "menta",
        "romero"
      ],
      "antecedentNames": [
        "Menta",
        "Romero"
      ],
      "consequentSlug": "hierbabuena",
      "consequentName": "Hierbabuena",
      "support": 0.047562,
      "confidence": 0.897727,
      "lift": 8.016801,
      "cooccurrenceCount": 79,
      "score": 7.196901
    },
    {
      "antecedentSlugs": [
        "romero",
        "vaporub"
      ],
      "antecedentNames": [
        "Romero",
        "Vaporub"
      ],
      "consequentSlug": "hierbabuena",
      "consequentName": "Hierbabuena",
      "support": 0.048164,
      "confidence": 0.888889,
      "lift": 7.937873,
      "cooccurrenceCount": 80,
      "score": 7.055887
    },
    {
      "antecedentSlugs": [
        "cafe",
        "canela"
      ],
      "antecedentNames": [
        "Café",
        "Canela"
      ],
      "consequentSlug": "copal",
      "consequentName": "Copal",
      "support": 0.052378,
      "confidence": 0.896907,
      "lift": 7.63981,
      "cooccurrenceCount": 87,
      "score": 6.8522
    },
    {
      "antecedentSlugs": [
        "canela",
        "copal"
      ],
      "antecedentNames": [
        "Canela",
        "Copal"
      ],
      "consequentSlug": "cafe",
      "consequentName": "Café",
      "support": 0.052378,
      "confidence": 0.966667,
      "lift": 7.073275,
      "cooccurrenceCount": 87,
      "score": 6.837499
    },
    {
      "antecedentSlugs": [
        "canela",
        "copal"
      ],
      "antecedentNames": [
        "Canela",
        "Copal"
      ],
      "consequentSlug": "jengibre",
      "consequentName": "Jengibre",
      "support": 0.051776,
      "confidence": 0.955556,
      "lift": 7.149449,
      "cooccurrenceCount": 86,
      "score": 6.831696
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "jengibre"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Jengibre"
      ],
      "consequentSlug": "cafe",
      "consequentName": "Café",
      "support": 0.051776,
      "confidence": 0.955556,
      "lift": 6.991973,
      "cooccurrenceCount": 86,
      "score": 6.681218
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "copal"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Copal"
      ],
      "consequentSlug": "jengibre",
      "consequentName": "Jengibre",
      "support": 0.051776,
      "confidence": 0.934783,
      "lift": 6.994027,
      "cooccurrenceCount": 86,
      "score": 6.537894
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "romero"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Romero"
      ],
      "consequentSlug": "hierbabuena",
      "consequentName": "Hierbabuena",
      "support": 0.048164,
      "confidence": 0.851064,
      "lift": 7.600092,
      "cooccurrenceCount": 80,
      "score": 6.468163
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "cafe"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Café"
      ],
      "consequentSlug": "jengibre",
      "consequentName": "Jengibre",
      "support": 0.051776,
      "confidence": 0.924731,
      "lift": 6.918822,
      "cooccurrenceCount": 86,
      "score": 6.39805
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "copal"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Copal"
      ],
      "consequentSlug": "cafe",
      "consequentName": "Café",
      "support": 0.051776,
      "confidence": 0.934783,
      "lift": 6.839973,
      "cooccurrenceCount": 86,
      "score": 6.393888
    },
    {
      "antecedentSlugs": [
        "copal",
        "jengibre"
      ],
      "antecedentNames": [
        "Copal",
        "Jengibre"
      ],
      "consequentSlug": "cafe",
      "consequentName": "Café",
      "support": 0.052378,
      "confidence": 0.925532,
      "lift": 6.772284,
      "cooccurrenceCount": 87,
      "score": 6.267965
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "jengibre"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Jengibre"
      ],
      "consequentSlug": "canela",
      "consequentName": "Canela",
      "support": 0.053582,
      "confidence": 0.988889,
      "lift": 6.317479,
      "cooccurrenceCount": 89,
      "score": 6.247284
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "canela"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Canela"
      ],
      "consequentSlug": "copal",
      "consequentName": "Copal",
      "support": 0.051776,
      "confidence": 0.851485,
      "lift": 7.252907,
      "cooccurrenceCount": 86,
      "score": 6.175742
    },
    {
      "antecedentSlugs": [
        "cafe",
        "canela"
      ],
      "antecedentNames": [
        "Café",
        "Canela"
      ],
      "consequentSlug": "jengibre",
      "consequentName": "Jengibre",
      "support": 0.05298,
      "confidence": 0.907216,
      "lift": 6.787777,
      "cooccurrenceCount": 88,
      "score": 6.157984
    },
    {
      "antecedentSlugs": [
        "cafe",
        "jengibre"
      ],
      "antecedentNames": [
        "Café",
        "Jengibre"
      ],
      "consequentSlug": "canela",
      "consequentName": "Canela",
      "support": 0.05298,
      "confidence": 0.967033,
      "lift": 6.177853,
      "cooccurrenceCount": 88,
      "score": 5.974187
    },
    {
      "antecedentSlugs": [
        "hierbabuena",
        "romero"
      ],
      "antecedentNames": [
        "Hierbabuena",
        "Romero"
      ],
      "consequentSlug": "vaporub",
      "consequentName": "Vaporub",
      "support": 0.048164,
      "confidence": 0.941176,
      "lift": 6.27829,
      "cooccurrenceCount": 80,
      "score": 5.908978
    },
    {
      "antecedentSlugs": [
        "hierbabuena",
        "romero"
      ],
      "antecedentNames": [
        "Hierbabuena",
        "Romero"
      ],
      "consequentSlug": "menta",
      "consequentName": "Menta",
      "support": 0.047562,
      "confidence": 0.929412,
      "lift": 6.352893,
      "cooccurrenceCount": 79,
      "score": 5.904453
    },
    {
      "antecedentSlugs": [
        "hierbabuena",
        "vaporub"
      ],
      "antecedentNames": [
        "Hierbabuena",
        "Vaporub"
      ],
      "consequentSlug": "menta",
      "consequentName": "Menta",
      "support": 0.051174,
      "confidence": 0.923913,
      "lift": 6.315307,
      "cooccurrenceCount": 85,
      "score": 5.834794
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "canela"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Canela"
      ],
      "consequentSlug": "jengibre",
      "consequentName": "Jengibre",
      "support": 0.053582,
      "confidence": 0.881188,
      "lift": 6.593034,
      "cooccurrenceCount": 89,
      "score": 5.809703
    },
    {
      "antecedentSlugs": [
        "cafe",
        "copal"
      ],
      "antecedentNames": [
        "Café",
        "Copal"
      ],
      "consequentSlug": "jengibre",
      "consequentName": "Jengibre",
      "support": 0.052378,
      "confidence": 0.878788,
      "lift": 6.575075,
      "cooccurrenceCount": 87,
      "score": 5.778096
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "hierbabuena"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Hierbabuena"
      ],
      "consequentSlug": "romero",
      "consequentName": "Romero",
      "support": 0.048164,
      "confidence": 0.898876,
      "lift": 6.40787,
      "cooccurrenceCount": 80,
      "score": 5.759883
    },
    {
      "antecedentSlugs": [
        "hierbabuena",
        "romero"
      ],
      "antecedentNames": [
        "Hierbabuena",
        "Romero"
      ],
      "consequentSlug": "eucalipto",
      "consequentName": "Eucalipto",
      "support": 0.048164,
      "confidence": 0.941176,
      "lift": 5.966771,
      "cooccurrenceCount": 80,
      "score": 5.615785
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "cafe"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Café"
      ],
      "consequentSlug": "canela",
      "consequentName": "Canela",
      "support": 0.052378,
      "confidence": 0.935484,
      "lift": 5.976303,
      "cooccurrenceCount": 87,
      "score": 5.590735
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "copal"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Copal"
      ],
      "consequentSlug": "canela",
      "consequentName": "Canela",
      "support": 0.051776,
      "confidence": 0.934783,
      "lift": 5.971823,
      "cooccurrenceCount": 86,
      "score": 5.582356
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "hierbabuena"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Hierbabuena"
      ],
      "consequentSlug": "vaporub",
      "consequentName": "Vaporub",
      "support": 0.048766,
      "confidence": 0.910112,
      "lift": 6.071071,
      "cooccurrenceCount": 81,
      "score": 5.525357
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "hierbabuena"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Hierbabuena"
      ],
      "consequentSlug": "menta",
      "consequentName": "Menta",
      "support": 0.048164,
      "confidence": 0.898876,
      "lift": 6.144172,
      "cooccurrenceCount": 80,
      "score": 5.522851
    },
    {
      "antecedentSlugs": [
        "menta",
        "romero"
      ],
      "antecedentNames": [
        "Menta",
        "Romero"
      ],
      "consequentSlug": "vaporub",
      "consequentName": "Vaporub",
      "support": 0.048164,
      "confidence": 0.909091,
      "lift": 6.064257,
      "cooccurrenceCount": 80,
      "score": 5.512961
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "canela"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Canela"
      ],
      "consequentSlug": "cafe",
      "consequentName": "Café",
      "support": 0.052378,
      "confidence": 0.861386,
      "lift": 6.302918,
      "cooccurrenceCount": 87,
      "score": 5.429246
    },
    {
      "antecedentSlugs": [
        "romero",
        "vaporub"
      ],
      "antecedentNames": [
        "Romero",
        "Vaporub"
      ],
      "consequentSlug": "menta",
      "consequentName": "Menta",
      "support": 0.048164,
      "confidence": 0.888889,
      "lift": 6.075903,
      "cooccurrenceCount": 80,
      "score": 5.400803
    },
    {
      "antecedentSlugs": [
        "hierbabuena",
        "vaporub"
      ],
      "antecedentNames": [
        "Hierbabuena",
        "Vaporub"
      ],
      "consequentSlug": "romero",
      "consequentName": "Romero",
      "support": 0.048164,
      "confidence": 0.869565,
      "lift": 6.198918,
      "cooccurrenceCount": 80,
      "score": 5.390363
    },
    {
      "antecedentSlugs": [
        "copal",
        "jengibre"
      ],
      "antecedentNames": [
        "Copal",
        "Jengibre"
      ],
      "consequentSlug": "canela",
      "consequentName": "Canela",
      "support": 0.051776,
      "confidence": 0.914894,
      "lift": 5.844763,
      "cooccurrenceCount": 86,
      "score": 5.347336
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "toronjil"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Toronjil"
      ],
      "consequentSlug": "rosas-de-castilla",
      "consequentName": "Rosas de Castilla",
      "support": 0.046358,
      "confidence": 0.885057,
      "lift": 6.000328,
      "cooccurrenceCount": 77,
      "score": 5.310635
    },
    {
      "antecedentSlugs": [
        "canela",
        "copal"
      ],
      "antecedentNames": [
        "Canela",
        "Copal"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.051776,
      "confidence": 0.955556,
      "lift": 5.549573,
      "cooccurrenceCount": 86,
      "score": 5.302925
    },
    {
      "antecedentSlugs": [
        "romero",
        "vaporub"
      ],
      "antecedentNames": [
        "Romero",
        "Vaporub"
      ],
      "consequentSlug": "eucalipto",
      "consequentName": "Eucalipto",
      "support": 0.049368,
      "confidence": 0.911111,
      "lift": 5.776166,
      "cooccurrenceCount": 82,
      "score": 5.262729
    },
    {
      "antecedentSlugs": [
        "menta",
        "romero"
      ],
      "antecedentNames": [
        "Menta",
        "Romero"
      ],
      "consequentSlug": "eucalipto",
      "consequentName": "Eucalipto",
      "support": 0.048164,
      "confidence": 0.909091,
      "lift": 5.763359,
      "cooccurrenceCount": 80,
      "score": 5.239417
    },
    {
      "antecedentSlugs": [
        "cafe",
        "jengibre"
      ],
      "antecedentNames": [
        "Café",
        "Jengibre"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.051776,
      "confidence": 0.945055,
      "lift": 5.488588,
      "cooccurrenceCount": 86,
      "score": 5.187018
    },
    {
      "antecedentSlugs": [
        "menta",
        "vaporub"
      ],
      "antecedentNames": [
        "Menta",
        "Vaporub"
      ],
      "consequentSlug": "hierbabuena",
      "consequentName": "Hierbabuena",
      "support": 0.051174,
      "confidence": 0.758929,
      "lift": 6.777314,
      "cooccurrenceCount": 85,
      "score": 5.143497
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "romero"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Romero"
      ],
      "consequentSlug": "vaporub",
      "consequentName": "Vaporub",
      "support": 0.049368,
      "confidence": 0.87234,
      "lift": 5.819106,
      "cooccurrenceCount": 82,
      "score": 5.076242
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "lavanda"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Lavanda"
      ],
      "consequentSlug": "rosas-de-castilla",
      "consequentName": "Rosas de Castilla",
      "support": 0.046358,
      "confidence": 0.865169,
      "lift": 5.86549,
      "cooccurrenceCount": 77,
      "score": 5.074637
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "romero"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Romero"
      ],
      "consequentSlug": "menta",
      "consequentName": "Menta",
      "support": 0.048164,
      "confidence": 0.851064,
      "lift": 5.817354,
      "cooccurrenceCount": 80,
      "score": 4.95094
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Rosas de Castilla"
      ],
      "consequentSlug": "toronjil",
      "consequentName": "Toronjil",
      "support": 0.046358,
      "confidence": 0.875,
      "lift": 5.655156,
      "cooccurrenceCount": 77,
      "score": 4.948261
    },
    {
      "antecedentSlugs": [
        "cafe",
        "copal"
      ],
      "antecedentNames": [
        "Café",
        "Copal"
      ],
      "consequentSlug": "canela",
      "consequentName": "Canela",
      "support": 0.052378,
      "confidence": 0.878788,
      "lift": 5.614103,
      "cooccurrenceCount": 87,
      "score": 4.933605
    },
    {
      "antecedentSlugs": [
        "hierbabuena",
        "vaporub"
      ],
      "antecedentNames": [
        "Hierbabuena",
        "Vaporub"
      ],
      "consequentSlug": "eucalipto",
      "consequentName": "Eucalipto",
      "support": 0.048766,
      "confidence": 0.880435,
      "lift": 5.581688,
      "cooccurrenceCount": 81,
      "score": 4.914312
    },
    {
      "antecedentSlugs": [
        "rosas-de-castilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Rosas de Castilla",
        "Toronjil"
      ],
      "consequentSlug": "lavanda",
      "consequentName": "Lavanda",
      "support": 0.048164,
      "confidence": 0.898876,
      "lift": 5.429213,
      "cooccurrenceCount": 80,
      "score": 4.880192
    },
    {
      "antecedentSlugs": [
        "copal",
        "jengibre"
      ],
      "antecedentNames": [
        "Copal",
        "Jengibre"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.051776,
      "confidence": 0.914894,
      "lift": 5.313421,
      "cooccurrenceCount": 86,
      "score": 4.861215
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "lavanda"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Lavanda"
      ],
      "consequentSlug": "toronjil",
      "consequentName": "Toronjil",
      "support": 0.046358,
      "confidence": 0.865169,
      "lift": 5.591615,
      "cooccurrenceCount": 77,
      "score": 4.837689
    },
    {
      "antecedentSlugs": [
        "hierbabuena",
        "menta"
      ],
      "antecedentNames": [
        "Hierbabuena",
        "Menta"
      ],
      "consequentSlug": "vaporub",
      "consequentName": "Vaporub",
      "support": 0.051174,
      "confidence": 0.85,
      "lift": 5.67008,
      "cooccurrenceCount": 85,
      "score": 4.819568
    },
    {
      "antecedentSlugs": [
        "canela",
        "jengibre"
      ],
      "antecedentNames": [
        "Canela",
        "Jengibre"
      ],
      "consequentSlug": "copal",
      "consequentName": "Copal",
      "support": 0.051776,
      "confidence": 0.747826,
      "lift": 6.369944,
      "cooccurrenceCount": 86,
      "score": 4.76361
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "toronjil"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Toronjil"
      ],
      "consequentSlug": "lavanda",
      "consequentName": "Lavanda",
      "support": 0.046358,
      "confidence": 0.885057,
      "lift": 5.345747,
      "cooccurrenceCount": 77,
      "score": 4.731293
    },
    {
      "antecedentSlugs": [
        "cafe",
        "canela"
      ],
      "antecedentNames": [
        "Café",
        "Canela"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.052378,
      "confidence": 0.896907,
      "lift": 5.208961,
      "cooccurrenceCount": 87,
      "score": 4.671955
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Rosas de Castilla"
      ],
      "consequentSlug": "lavanda",
      "consequentName": "Lavanda",
      "support": 0.046358,
      "confidence": 0.875,
      "lift": 5.285,
      "cooccurrenceCount": 77,
      "score": 4.624375
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "menta"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Menta"
      ],
      "consequentSlug": "hierbabuena",
      "consequentName": "Hierbabuena",
      "support": 0.048164,
      "confidence": 0.707965,
      "lift": 6.3222,
      "cooccurrenceCount": 80,
      "score": 4.475894
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "lavanda"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Lavanda"
      ],
      "consequentSlug": "manzanilla",
      "consequentName": "Manzanilla",
      "support": 0.048766,
      "confidence": 0.910112,
      "lift": 4.892222,
      "cooccurrenceCount": 81,
      "score": 4.452472
    },
    {
      "antecedentSlugs": [
        "hierbabuena",
        "menta"
      ],
      "antecedentNames": [
        "Hierbabuena",
        "Menta"
      ],
      "consequentSlug": "romero",
      "consequentName": "Romero",
      "support": 0.047562,
      "confidence": 0.79,
      "lift": 5.631717,
      "cooccurrenceCount": 79,
      "score": 4.449056
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Rosas de Castilla"
      ],
      "consequentSlug": "manzanilla",
      "consequentName": "Manzanilla",
      "support": 0.048164,
      "confidence": 0.909091,
      "lift": 4.886731,
      "cooccurrenceCount": 80,
      "score": 4.442483
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "toronjil"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Toronjil"
      ],
      "consequentSlug": "manzanilla",
      "consequentName": "Manzanilla",
      "support": 0.047562,
      "confidence": 0.908046,
      "lift": 4.881114,
      "cooccurrenceCount": 79,
      "score": 4.432276
    },
    {
      "antecedentSlugs": [
        "cafe",
        "copal"
      ],
      "antecedentNames": [
        "Café",
        "Copal"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.051776,
      "confidence": 0.868687,
      "lift": 5.045066,
      "cooccurrenceCount": 86,
      "score": 4.382583
    },
    {
      "antecedentSlugs": [
        "rosas-de-castilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Rosas de Castilla",
        "Toronjil"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.046358,
      "confidence": 0.865169,
      "lift": 5.024633,
      "cooccurrenceCount": 77,
      "score": 4.347154
    },
    {
      "antecedentSlugs": [
        "canela",
        "jengibre"
      ],
      "antecedentNames": [
        "Canela",
        "Jengibre"
      ],
      "consequentSlug": "cafe",
      "consequentName": "Café",
      "support": 0.05298,
      "confidence": 0.765217,
      "lift": 5.599234,
      "cooccurrenceCount": 88,
      "score": 4.284631
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "menta"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Menta"
      ],
      "consequentSlug": "vaporub",
      "consequentName": "Vaporub",
      "support": 0.054184,
      "confidence": 0.79646,
      "lift": 5.312933,
      "cooccurrenceCount": 90,
      "score": 4.23154
    },
    {
      "antecedentSlugs": [
        "lavanda",
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Lavanda",
        "Rosas de Castilla"
      ],
      "consequentSlug": "toronjil",
      "consequentName": "Toronjil",
      "support": 0.048164,
      "confidence": 0.808081,
      "lift": 5.222655,
      "cooccurrenceCount": 80,
      "score": 4.220327
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "manzanilla"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Manzanilla"
      ],
      "consequentSlug": "rosas-de-castilla",
      "consequentName": "Rosas de Castilla",
      "support": 0.048164,
      "confidence": 0.784314,
      "lift": 5.317327,
      "cooccurrenceCount": 80,
      "score": 4.170452
    },
    {
      "antecedentSlugs": [
        "rosas-de-castilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Rosas de Castilla",
        "Toronjil"
      ],
      "consequentSlug": "manzanilla",
      "consequentName": "Manzanilla",
      "support": 0.04696,
      "confidence": 0.876404,
      "lift": 4.711029,
      "cooccurrenceCount": 78,
      "score": 4.128767
    },
    {
      "antecedentSlugs": [
        "menta",
        "vaporub"
      ],
      "antecedentNames": [
        "Menta",
        "Vaporub"
      ],
      "consequentSlug": "eucalipto",
      "consequentName": "Eucalipto",
      "support": 0.054184,
      "confidence": 0.803571,
      "lift": 5.094397,
      "cooccurrenceCount": 90,
      "score": 4.093712
    },
    {
      "antecedentSlugs": [
        "hierbabuena",
        "menta"
      ],
      "antecedentNames": [
        "Hierbabuena",
        "Menta"
      ],
      "consequentSlug": "eucalipto",
      "consequentName": "Eucalipto",
      "support": 0.048164,
      "confidence": 0.8,
      "lift": 5.071756,
      "cooccurrenceCount": 80,
      "score": 4.057405
    },
    {
      "antecedentSlugs": [
        "manzanilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Manzanilla",
        "Toronjil"
      ],
      "consequentSlug": "lavanda",
      "consequentName": "Lavanda",
      "support": 0.051776,
      "confidence": 0.811321,
      "lift": 4.900377,
      "cooccurrenceCount": 86,
      "score": 3.975778
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "vaporub"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Vaporub"
      ],
      "consequentSlug": "hierbabuena",
      "consequentName": "Hierbabuena",
      "support": 0.048766,
      "confidence": 0.663934,
      "lift": 5.929006,
      "cooccurrenceCount": 81,
      "score": 3.936471
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "manzanilla"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Manzanilla"
      ],
      "consequentSlug": "toronjil",
      "consequentName": "Toronjil",
      "support": 0.047562,
      "confidence": 0.77451,
      "lift": 5.005684,
      "cooccurrenceCount": 79,
      "score": 3.876951
    },
    {
      "antecedentSlugs": [
        "anis-estrella",
        "manzanilla"
      ],
      "antecedentNames": [
        "Anís Estrella",
        "Manzanilla"
      ],
      "consequentSlug": "lavanda",
      "consequentName": "Lavanda",
      "support": 0.048766,
      "confidence": 0.794118,
      "lift": 4.796471,
      "cooccurrenceCount": 81,
      "score": 3.808962
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "vaporub"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Vaporub"
      ],
      "consequentSlug": "menta",
      "consequentName": "Menta",
      "support": 0.054184,
      "confidence": 0.737705,
      "lift": 5.042502,
      "cooccurrenceCount": 90,
      "score": 3.719878
    },
    {
      "antecedentSlugs": [
        "manzanilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Manzanilla",
        "Toronjil"
      ],
      "consequentSlug": "rosas-de-castilla",
      "consequentName": "Rosas de Castilla",
      "support": 0.04696,
      "confidence": 0.735849,
      "lift": 4.988756,
      "cooccurrenceCount": 78,
      "score": 3.670972
    },
    {
      "antecedentSlugs": [
        "menta",
        "vaporub"
      ],
      "antecedentNames": [
        "Menta",
        "Vaporub"
      ],
      "consequentSlug": "romero",
      "consequentName": "Romero",
      "support": 0.048164,
      "confidence": 0.714286,
      "lift": 5.091968,
      "cooccurrenceCount": 80,
      "score": 3.63712
    },
    {
      "antecedentSlugs": [
        "lavanda",
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Lavanda",
        "Rosas de Castilla"
      ],
      "consequentSlug": "manzanilla",
      "consequentName": "Manzanilla",
      "support": 0.048766,
      "confidence": 0.818182,
      "lift": 4.398058,
      "cooccurrenceCount": 81,
      "score": 3.598411
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "menta"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Menta"
      ],
      "consequentSlug": "romero",
      "consequentName": "Romero",
      "support": 0.048164,
      "confidence": 0.707965,
      "lift": 5.046906,
      "cooccurrenceCount": 80,
      "score": 3.573031
    },
    {
      "antecedentSlugs": [
        "manzanilla",
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Manzanilla",
        "Rosas de Castilla"
      ],
      "consequentSlug": "lavanda",
      "consequentName": "Lavanda",
      "support": 0.048766,
      "confidence": 0.764151,
      "lift": 4.615472,
      "cooccurrenceCount": 81,
      "score": 3.526917
    },
    {
      "antecedentSlugs": [
        "lavanda",
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Lavanda",
        "Rosas de Castilla"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.046358,
      "confidence": 0.777778,
      "lift": 4.517094,
      "cooccurrenceCount": 77,
      "score": 3.513295
    },
    {
      "antecedentSlugs": [
        "manzanilla",
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Manzanilla",
        "Rosas de Castilla"
      ],
      "consequentSlug": "toronjil",
      "consequentName": "Toronjil",
      "support": 0.04696,
      "confidence": 0.735849,
      "lift": 4.755818,
      "cooccurrenceCount": 78,
      "score": 3.499564
    },
    {
      "antecedentSlugs": [
        "canela",
        "jengibre"
      ],
      "antecedentNames": [
        "Canela",
        "Jengibre"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.053582,
      "confidence": 0.773913,
      "lift": 4.494649,
      "cooccurrenceCount": 89,
      "score": 3.478467
    },
    {
      "antecedentSlugs": [
        "lavanda",
        "toronjil"
      ],
      "antecedentNames": [
        "Lavanda",
        "Toronjil"
      ],
      "consequentSlug": "rosas-de-castilla",
      "consequentName": "Rosas de Castilla",
      "support": 0.048164,
      "confidence": 0.701754,
      "lift": 4.757608,
      "cooccurrenceCount": 80,
      "score": 3.338672
    },
    {
      "antecedentSlugs": [
        "lavanda",
        "manzanilla"
      ],
      "antecedentNames": [
        "Lavanda",
        "Manzanilla"
      ],
      "consequentSlug": "toronjil",
      "consequentName": "Toronjil",
      "support": 0.051776,
      "confidence": 0.716667,
      "lift": 4.631842,
      "cooccurrenceCount": 86,
      "score": 3.319487
    },
    {
      "antecedentSlugs": [
        "manzanilla",
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Manzanilla",
        "Rosas de Castilla"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.048164,
      "confidence": 0.754717,
      "lift": 4.383164,
      "cooccurrenceCount": 80,
      "score": 3.308048
    },
    {
      "antecedentSlugs": [
        "manzanilla",
        "toronjil"
      ],
      "antecedentNames": [
        "Manzanilla",
        "Toronjil"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.047562,
      "confidence": 0.745283,
      "lift": 4.328374,
      "cooccurrenceCount": 79,
      "score": 3.225864
    },
    {
      "antecedentSlugs": [
        "eucalipto",
        "vaporub"
      ],
      "antecedentNames": [
        "Eucalipto",
        "Vaporub"
      ],
      "consequentSlug": "romero",
      "consequentName": "Romero",
      "support": 0.049368,
      "confidence": 0.672131,
      "lift": 4.791459,
      "cooccurrenceCount": 82,
      "score": 3.220489
    },
    {
      "antecedentSlugs": [
        "lavanda",
        "manzanilla"
      ],
      "antecedentNames": [
        "Lavanda",
        "Manzanilla"
      ],
      "consequentSlug": "rosas-de-castilla",
      "consequentName": "Rosas de Castilla",
      "support": 0.048766,
      "confidence": 0.675,
      "lift": 4.576224,
      "cooccurrenceCount": 81,
      "score": 3.088952
    },
    {
      "antecedentSlugs": [
        "lavanda",
        "toronjil"
      ],
      "antecedentNames": [
        "Lavanda",
        "Toronjil"
      ],
      "consequentSlug": "manzanilla",
      "consequentName": "Manzanilla",
      "support": 0.051776,
      "confidence": 0.754386,
      "lift": 4.05513,
      "cooccurrenceCount": 86,
      "score": 3.059133
    },
    {
      "antecedentSlugs": [
        "lavanda",
        "toronjil"
      ],
      "antecedentNames": [
        "Lavanda",
        "Toronjil"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.046358,
      "confidence": 0.675439,
      "lift": 3.92274,
      "cooccurrenceCount": 77,
      "score": 2.64957
    },
    {
      "antecedentSlugs": [
        "lavanda",
        "manzanilla"
      ],
      "antecedentNames": [
        "Lavanda",
        "Manzanilla"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.048766,
      "confidence": 0.675,
      "lift": 3.920192,
      "cooccurrenceCount": 81,
      "score": 2.64613
    },
    {
      "antecedentSlugs": [
        "hierbabuena"
      ],
      "antecedentNames": [
        "Hierbabuena"
      ],
      "consequentSlug": "menta",
      "consequentName": "Menta",
      "support": 0.060205,
      "confidence": 0.537634,
      "lift": 3.674941,
      "cooccurrenceCount": 100,
      "score": 1.975775
    },
    {
      "antecedentSlugs": [
        "copal"
      ],
      "antecedentNames": [
        "Copal"
      ],
      "consequentSlug": "cafe",
      "consequentName": "Café",
      "support": 0.059603,
      "confidence": 0.507692,
      "lift": 3.714876,
      "cooccurrenceCount": 99,
      "score": 1.886014
    },
    {
      "antecedentSlugs": [
        "copal"
      ],
      "antecedentNames": [
        "Copal"
      ],
      "consequentSlug": "jengibre",
      "consequentName": "Jengibre",
      "support": 0.056592,
      "confidence": 0.482051,
      "lift": 3.606699,
      "cooccurrenceCount": 94,
      "score": 1.738614
    },
    {
      "antecedentSlugs": [
        "jengibre"
      ],
      "antecedentNames": [
        "Jengibre"
      ],
      "consequentSlug": "canela",
      "consequentName": "Canela",
      "support": 0.069235,
      "confidence": 0.518018,
      "lift": 3.309338,
      "cooccurrenceCount": 115,
      "score": 1.714297
    },
    {
      "antecedentSlugs": [
        "hierbabuena"
      ],
      "antecedentNames": [
        "Hierbabuena"
      ],
      "consequentSlug": "vaporub",
      "consequentName": "Vaporub",
      "support": 0.055388,
      "confidence": 0.494624,
      "lift": 3.299477,
      "cooccurrenceCount": 92,
      "score": 1.632
    },
    {
      "antecedentSlugs": [
        "cafe"
      ],
      "antecedentNames": [
        "Café"
      ],
      "consequentSlug": "copal",
      "consequentName": "Copal",
      "support": 0.059603,
      "confidence": 0.436123,
      "lift": 3.714876,
      "cooccurrenceCount": 99,
      "score": 1.620144
    },
    {
      "antecedentSlugs": [
        "jengibre"
      ],
      "antecedentNames": [
        "Jengibre"
      ],
      "consequentSlug": "copal",
      "consequentName": "Copal",
      "support": 0.056592,
      "confidence": 0.423423,
      "lift": 3.606699,
      "cooccurrenceCount": 94,
      "score": 1.527161
    },
    {
      "antecedentSlugs": [
        "vaporub"
      ],
      "antecedentNames": [
        "Vaporub"
      ],
      "consequentSlug": "eucalipto",
      "consequentName": "Eucalipto",
      "support": 0.07345,
      "confidence": 0.48996,
      "lift": 3.106196,
      "cooccurrenceCount": 122,
      "score": 1.521911
    },
    {
      "antecedentSlugs": [
        "menta"
      ],
      "antecedentNames": [
        "Menta"
      ],
      "consequentSlug": "hierbabuena",
      "consequentName": "Hierbabuena",
      "support": 0.060205,
      "confidence": 0.411523,
      "lift": 3.674941,
      "cooccurrenceCount": 100,
      "score": 1.512322
    },
    {
      "antecedentSlugs": [
        "hierbabuena"
      ],
      "antecedentNames": [
        "Hierbabuena"
      ],
      "consequentSlug": "romero",
      "consequentName": "Romero",
      "support": 0.051174,
      "confidence": 0.456989,
      "lift": 3.257765,
      "cooccurrenceCount": 85,
      "score": 1.488763
    },
    {
      "antecedentSlugs": [
        "canela"
      ],
      "antecedentNames": [
        "Canela"
      ],
      "consequentSlug": "jengibre",
      "consequentName": "Jengibre",
      "support": 0.069235,
      "confidence": 0.442308,
      "lift": 3.309338,
      "cooccurrenceCount": 115,
      "score": 1.463746
    },
    {
      "antecedentSlugs": [
        "hierbabuena"
      ],
      "antecedentNames": [
        "Hierbabuena"
      ],
      "consequentSlug": "eucalipto",
      "consequentName": "Eucalipto",
      "support": 0.053582,
      "confidence": 0.478495,
      "lift": 3.03351,
      "cooccurrenceCount": 89,
      "score": 1.451518
    },
    {
      "antecedentSlugs": [
        "eucalipto"
      ],
      "antecedentNames": [
        "Eucalipto"
      ],
      "consequentSlug": "vaporub",
      "consequentName": "Vaporub",
      "support": 0.07345,
      "confidence": 0.465649,
      "lift": 3.106196,
      "cooccurrenceCount": 122,
      "score": 1.446397
    },
    {
      "antecedentSlugs": [
        "menta"
      ],
      "antecedentNames": [
        "Menta"
      ],
      "consequentSlug": "vaporub",
      "consequentName": "Vaporub",
      "support": 0.067429,
      "confidence": 0.460905,
      "lift": 3.074553,
      "cooccurrenceCount": 112,
      "score": 1.417078
    },
    {
      "antecedentSlugs": [
        "vaporub"
      ],
      "antecedentNames": [
        "Vaporub"
      ],
      "consequentSlug": "menta",
      "consequentName": "Menta",
      "support": 0.067429,
      "confidence": 0.449799,
      "lift": 3.074553,
      "cooccurrenceCount": 112,
      "score": 1.382932
    },
    {
      "antecedentSlugs": [
        "menta"
      ],
      "antecedentNames": [
        "Menta"
      ],
      "consequentSlug": "eucalipto",
      "consequentName": "Eucalipto",
      "support": 0.068031,
      "confidence": 0.465021,
      "lift": 2.948088,
      "cooccurrenceCount": 113,
      "score": 1.370922
    },
    {
      "antecedentSlugs": [
        "copal"
      ],
      "antecedentNames": [
        "Copal"
      ],
      "consequentSlug": "canela",
      "consequentName": "Canela",
      "support": 0.054184,
      "confidence": 0.461538,
      "lift": 2.948521,
      "cooccurrenceCount": 90,
      "score": 1.360856
    },
    {
      "antecedentSlugs": [
        "copal"
      ],
      "antecedentNames": [
        "Copal"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.055388,
      "confidence": 0.471795,
      "lift": 2.740039,
      "cooccurrenceCount": 92,
      "score": 1.292737
    },
    {
      "antecedentSlugs": [
        "eucalipto"
      ],
      "antecedentNames": [
        "Eucalipto"
      ],
      "consequentSlug": "menta",
      "consequentName": "Menta",
      "support": 0.068031,
      "confidence": 0.431298,
      "lift": 2.948088,
      "cooccurrenceCount": 113,
      "score": 1.271504
    },
    {
      "antecedentSlugs": [
        "jengibre"
      ],
      "antecedentNames": [
        "Jengibre"
      ],
      "consequentSlug": "cafe",
      "consequentName": "Café",
      "support": 0.054786,
      "confidence": 0.40991,
      "lift": 2.999385,
      "cooccurrenceCount": 91,
      "score": 1.229478
    },
    {
      "antecedentSlugs": [
        "vaporub"
      ],
      "antecedentNames": [
        "Vaporub"
      ],
      "consequentSlug": "hierbabuena",
      "consequentName": "Hierbabuena",
      "support": 0.055388,
      "confidence": 0.369478,
      "lift": 3.299477,
      "cooccurrenceCount": 92,
      "score": 1.219084
    },
    {
      "antecedentSlugs": [
        "cafe"
      ],
      "antecedentNames": [
        "Café"
      ],
      "consequentSlug": "jengibre",
      "consequentName": "Jengibre",
      "support": 0.054786,
      "confidence": 0.400881,
      "lift": 2.999385,
      "cooccurrenceCount": 91,
      "score": 1.202397
    },
    {
      "antecedentSlugs": [
        "romero"
      ],
      "antecedentNames": [
        "Romero"
      ],
      "consequentSlug": "hierbabuena",
      "consequentName": "Hierbabuena",
      "support": 0.051174,
      "confidence": 0.364807,
      "lift": 3.257765,
      "cooccurrenceCount": 85,
      "score": 1.188455
    },
    {
      "antecedentSlugs": [
        "toronjil"
      ],
      "antecedentNames": [
        "Toronjil"
      ],
      "consequentSlug": "lavanda",
      "consequentName": "Lavanda",
      "support": 0.068633,
      "confidence": 0.44358,
      "lift": 2.679222,
      "cooccurrenceCount": 114,
      "score": 1.188449
    },
    {
      "antecedentSlugs": [
        "cafe"
      ],
      "antecedentNames": [
        "Café"
      ],
      "consequentSlug": "canela",
      "consequentName": "Canela",
      "support": 0.058399,
      "confidence": 0.427313,
      "lift": 2.729871,
      "cooccurrenceCount": 97,
      "score": 1.166509
    },
    {
      "antecedentSlugs": [
        "lavanda"
      ],
      "antecedentNames": [
        "Lavanda"
      ],
      "consequentSlug": "toronjil",
      "consequentName": "Toronjil",
      "support": 0.068633,
      "confidence": 0.414545,
      "lift": 2.679222,
      "cooccurrenceCount": 114,
      "score": 1.110659
    },
    {
      "antecedentSlugs": [
        "romero"
      ],
      "antecedentNames": [
        "Romero"
      ],
      "consequentSlug": "eucalipto",
      "consequentName": "Eucalipto",
      "support": 0.056592,
      "confidence": 0.403433,
      "lift": 2.557645,
      "cooccurrenceCount": 94,
      "score": 1.03184
    },
    {
      "antecedentSlugs": [
        "eucalipto"
      ],
      "antecedentNames": [
        "Eucalipto"
      ],
      "consequentSlug": "hierbabuena",
      "consequentName": "Hierbabuena",
      "support": 0.053582,
      "confidence": 0.339695,
      "lift": 3.03351,
      "cooccurrenceCount": 89,
      "score": 1.030467
    },
    {
      "antecedentSlugs": [
        "lavanda"
      ],
      "antecedentNames": [
        "Lavanda"
      ],
      "consequentSlug": "manzanilla",
      "consequentName": "Manzanilla",
      "support": 0.072246,
      "confidence": 0.436364,
      "lift": 2.345631,
      "cooccurrenceCount": 120,
      "score": 1.023548
    },
    {
      "antecedentSlugs": [
        "canela"
      ],
      "antecedentNames": [
        "Canela"
      ],
      "consequentSlug": "copal",
      "consequentName": "Copal",
      "support": 0.054184,
      "confidence": 0.346154,
      "lift": 2.948521,
      "cooccurrenceCount": 90,
      "score": 1.020642
    },
    {
      "antecedentSlugs": [
        "canela"
      ],
      "antecedentNames": [
        "Canela"
      ],
      "consequentSlug": "cafe",
      "consequentName": "Café",
      "support": 0.058399,
      "confidence": 0.373077,
      "lift": 2.729871,
      "cooccurrenceCount": 97,
      "score": 1.018452
    },
    {
      "antecedentSlugs": [
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Rosas de Castilla"
      ],
      "consequentSlug": "manzanilla",
      "consequentName": "Manzanilla",
      "support": 0.063817,
      "confidence": 0.432653,
      "lift": 2.325685,
      "cooccurrenceCount": 106,
      "score": 1.006215
    },
    {
      "antecedentSlugs": [
        "romero"
      ],
      "antecedentNames": [
        "Romero"
      ],
      "consequentSlug": "vaporub",
      "consequentName": "Vaporub",
      "support": 0.054184,
      "confidence": 0.386266,
      "lift": 2.576659,
      "cooccurrenceCount": 90,
      "score": 0.995276
    },
    {
      "antecedentSlugs": [
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Rosas de Castilla"
      ],
      "consequentSlug": "lavanda",
      "consequentName": "Lavanda",
      "support": 0.059603,
      "confidence": 0.404082,
      "lift": 2.440653,
      "cooccurrenceCount": 99,
      "score": 0.986223
    },
    {
      "antecedentSlugs": [
        "romero"
      ],
      "antecedentNames": [
        "Romero"
      ],
      "consequentSlug": "menta",
      "consequentName": "Menta",
      "support": 0.05298,
      "confidence": 0.377682,
      "lift": 2.581607,
      "cooccurrenceCount": 88,
      "score": 0.975027
    },
    {
      "antecedentSlugs": [
        "cafe"
      ],
      "antecedentNames": [
        "Café"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.05599,
      "confidence": 0.409692,
      "lift": 2.379363,
      "cooccurrenceCount": 93,
      "score": 0.974805
    },
    {
      "antecedentSlugs": [
        "jengibre"
      ],
      "antecedentNames": [
        "Jengibre"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.054184,
      "confidence": 0.405405,
      "lift": 2.35447,
      "cooccurrenceCount": 90,
      "score": 0.954515
    },
    {
      "antecedentSlugs": [
        "menta"
      ],
      "antecedentNames": [
        "Menta"
      ],
      "consequentSlug": "romero",
      "consequentName": "Romero",
      "support": 0.05298,
      "confidence": 0.36214,
      "lift": 2.581607,
      "cooccurrenceCount": 88,
      "score": 0.934903
    },
    {
      "antecedentSlugs": [
        "vaporub"
      ],
      "antecedentNames": [
        "Vaporub"
      ],
      "consequentSlug": "romero",
      "consequentName": "Romero",
      "support": 0.054184,
      "confidence": 0.361446,
      "lift": 2.576659,
      "cooccurrenceCount": 90,
      "score": 0.931322
    },
    {
      "antecedentSlugs": [
        "eucalipto"
      ],
      "antecedentNames": [
        "Eucalipto"
      ],
      "consequentSlug": "romero",
      "consequentName": "Romero",
      "support": 0.056592,
      "confidence": 0.358779,
      "lift": 2.557645,
      "cooccurrenceCount": 94,
      "score": 0.917628
    },
    {
      "antecedentSlugs": [
        "toronjil"
      ],
      "antecedentNames": [
        "Toronjil"
      ],
      "consequentSlug": "manzanilla",
      "consequentName": "Manzanilla",
      "support": 0.063817,
      "confidence": 0.412451,
      "lift": 2.217093,
      "cooccurrenceCount": 106,
      "score": 0.914443
    },
    {
      "antecedentSlugs": [
        "manzanilla"
      ],
      "antecedentNames": [
        "Manzanilla"
      ],
      "consequentSlug": "lavanda",
      "consequentName": "Lavanda",
      "support": 0.072246,
      "confidence": 0.38835,
      "lift": 2.345631,
      "cooccurrenceCount": 120,
      "score": 0.910925
    },
    {
      "antecedentSlugs": [
        "anis-estrella"
      ],
      "antecedentNames": [
        "Anís Estrella"
      ],
      "consequentSlug": "copal",
      "consequentName": "Copal",
      "support": 0.055388,
      "confidence": 0.321678,
      "lift": 2.740039,
      "cooccurrenceCount": 92,
      "score": 0.881411
    },
    {
      "antecedentSlugs": [
        "lavanda"
      ],
      "antecedentNames": [
        "Lavanda"
      ],
      "consequentSlug": "rosas-de-castilla",
      "consequentName": "Rosas de Castilla",
      "support": 0.059603,
      "confidence": 0.36,
      "lift": 2.440653,
      "cooccurrenceCount": 99,
      "score": 0.878635
    },
    {
      "antecedentSlugs": [
        "canela"
      ],
      "antecedentNames": [
        "Canela"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.060807,
      "confidence": 0.388462,
      "lift": 2.256065,
      "cooccurrenceCount": 101,
      "score": 0.876395
    },
    {
      "antecedentSlugs": [
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Rosas de Castilla"
      ],
      "consequentSlug": "toronjil",
      "consequentName": "Toronjil",
      "support": 0.053582,
      "confidence": 0.363265,
      "lift": 2.347796,
      "cooccurrenceCount": 89,
      "score": 0.852873
    },
    {
      "antecedentSlugs": [
        "toronjil"
      ],
      "antecedentNames": [
        "Toronjil"
      ],
      "consequentSlug": "rosas-de-castilla",
      "consequentName": "Rosas de Castilla",
      "support": 0.053582,
      "confidence": 0.346304,
      "lift": 2.347796,
      "cooccurrenceCount": 89,
      "score": 0.81305
    },
    {
      "antecedentSlugs": [
        "manzanilla"
      ],
      "antecedentNames": [
        "Manzanilla"
      ],
      "consequentSlug": "rosas-de-castilla",
      "consequentName": "Rosas de Castilla",
      "support": 0.063817,
      "confidence": 0.343042,
      "lift": 2.325685,
      "cooccurrenceCount": 106,
      "score": 0.797808
    },
    {
      "antecedentSlugs": [
        "anis-estrella"
      ],
      "antecedentNames": [
        "Anís Estrella"
      ],
      "consequentSlug": "canela",
      "consequentName": "Canela",
      "support": 0.060807,
      "confidence": 0.353147,
      "lift": 2.256065,
      "cooccurrenceCount": 101,
      "score": 0.796722
    },
    {
      "antecedentSlugs": [
        "anis-estrella"
      ],
      "antecedentNames": [
        "Anís Estrella"
      ],
      "consequentSlug": "cafe",
      "consequentName": "Café",
      "support": 0.05599,
      "confidence": 0.325175,
      "lift": 2.379363,
      "cooccurrenceCount": 93,
      "score": 0.773709
    },
    {
      "antecedentSlugs": [
        "manzanilla"
      ],
      "antecedentNames": [
        "Manzanilla"
      ],
      "consequentSlug": "toronjil",
      "consequentName": "Toronjil",
      "support": 0.063817,
      "confidence": 0.343042,
      "lift": 2.217093,
      "cooccurrenceCount": 106,
      "score": 0.760556
    },
    {
      "antecedentSlugs": [
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Rosas de Castilla"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.05298,
      "confidence": 0.359184,
      "lift": 2.086028,
      "cooccurrenceCount": 88,
      "score": 0.749267
    },
    {
      "antecedentSlugs": [
        "anis-estrella"
      ],
      "antecedentNames": [
        "Anís Estrella"
      ],
      "consequentSlug": "jengibre",
      "consequentName": "Jengibre",
      "support": 0.054184,
      "confidence": 0.314685,
      "lift": 2.35447,
      "cooccurrenceCount": 90,
      "score": 0.740917
    },
    {
      "antecedentSlugs": [
        "anis-estrella"
      ],
      "antecedentNames": [
        "Anís Estrella"
      ],
      "consequentSlug": "manzanilla",
      "consequentName": "Manzanilla",
      "support": 0.061409,
      "confidence": 0.356643,
      "lift": 1.917102,
      "cooccurrenceCount": 102,
      "score": 0.683722
    },
    {
      "antecedentSlugs": [
        "mirra-y-azafran"
      ],
      "antecedentNames": [
        "Mirra y Azafrán"
      ],
      "consequentSlug": "rosas-de-castilla",
      "consequentName": "Rosas de Castilla",
      "support": 0.019868,
      "confidence": 0.314286,
      "lift": 2.130729,
      "cooccurrenceCount": 33,
      "score": 0.669658
    },
    {
      "antecedentSlugs": [
        "toronjil"
      ],
      "antecedentNames": [
        "Toronjil"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.052378,
      "confidence": 0.338521,
      "lift": 1.966028,
      "cooccurrenceCount": 87,
      "score": 0.665543
    },
    {
      "antecedentSlugs": [
        "anis-estrella"
      ],
      "antecedentNames": [
        "Anís Estrella"
      ],
      "consequentSlug": "rosas-de-castilla",
      "consequentName": "Rosas de Castilla",
      "support": 0.05298,
      "confidence": 0.307692,
      "lift": 2.086028,
      "cooccurrenceCount": 88,
      "score": 0.641855
    },
    {
      "antecedentSlugs": [
        "manzanilla"
      ],
      "antecedentNames": [
        "Manzanilla"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.061409,
      "confidence": 0.330097,
      "lift": 1.917102,
      "cooccurrenceCount": 102,
      "score": 0.63283
    },
    {
      "antecedentSlugs": [
        "lavanda"
      ],
      "antecedentNames": [
        "Lavanda"
      ],
      "consequentSlug": "anis-estrella",
      "consequentName": "Anís Estrella",
      "support": 0.053582,
      "confidence": 0.323636,
      "lift": 1.87958,
      "cooccurrenceCount": 89,
      "score": 0.608301
    },
    {
      "antecedentSlugs": [
        "anis-estrella"
      ],
      "antecedentNames": [
        "Anís Estrella"
      ],
      "consequentSlug": "toronjil",
      "consequentName": "Toronjil",
      "support": 0.052378,
      "confidence": 0.304196,
      "lift": 1.966028,
      "cooccurrenceCount": 87,
      "score": 0.598058
    },
    {
      "antecedentSlugs": [
        "anis-estrella"
      ],
      "antecedentNames": [
        "Anís Estrella"
      ],
      "consequentSlug": "lavanda",
      "consequentName": "Lavanda",
      "support": 0.053582,
      "confidence": 0.311189,
      "lift": 1.87958,
      "cooccurrenceCount": 89,
      "score": 0.584904
    },
    {
      "antecedentSlugs": [
        "rosas-de-castilla"
      ],
      "antecedentNames": [
        "Rosas de Castilla"
      ],
      "consequentSlug": "mirra-y-azafran",
      "consequentName": "Mirra y Azafrán",
      "support": 0.019868,
      "confidence": 0.134694,
      "lift": 2.130729,
      "cooccurrenceCount": 33,
      "score": 0.286996
    },
    {
      "antecedentSlugs": [
        "mirra-y-azafran"
      ],
      "antecedentNames": [
        "Mirra y Azafrán"
      ],
      "consequentSlug": "copal",
      "consequentName": "Copal",
      "support": 0.011439,
      "confidence": 0.180952,
      "lift": 1.541343,
      "cooccurrenceCount": 19,
      "score": 0.27891
    },
    {
      "antecedentSlugs": [
        "bugambilia"
      ],
      "antecedentNames": [
        "Bugambilia"
      ],
      "consequentSlug": "romero",
      "consequentName": "Romero",
      "support": 0.019266,
      "confidence": 0.177778,
      "lift": 1.267334,
      "cooccurrenceCount": 32,
      "score": 0.225304
    },
    {
      "antecedentSlugs": [
        "mirra-y-azafran"
      ],
      "antecedentNames": [
        "Mirra y Azafrán"
      ],
      "consequentSlug": "bugambilia",
      "consequentName": "Bugambilia",
      "support": 0.009633,
      "confidence": 0.152381,
      "lift": 1.406138,
      "cooccurrenceCount": 16,
      "score": 0.214269
    },
    {
      "antecedentSlugs": [
        "romero"
      ],
      "antecedentNames": [
        "Romero"
      ],
      "consequentSlug": "bugambilia",
      "consequentName": "Bugambilia",
      "support": 0.019266,
      "confidence": 0.137339,
      "lift": 1.267334,
      "cooccurrenceCount": 32,
      "score": 0.174054
    }
  ],
  "popularFallbacks": [
    {
      "slug": "manzanilla",
      "name": "Manzanilla",
      "support": 0.186033,
      "transactionCount": 309
    },
    {
      "slug": "anis-estrella",
      "name": "Anís Estrella",
      "support": 0.172185,
      "transactionCount": 286
    },
    {
      "slug": "lavanda",
      "name": "Lavanda",
      "support": 0.165563,
      "transactionCount": 275
    },
    {
      "slug": "eucalipto",
      "name": "Eucalipto",
      "support": 0.157736,
      "transactionCount": 262
    },
    {
      "slug": "canela",
      "name": "Canela",
      "support": 0.156532,
      "transactionCount": 260
    },
    {
      "slug": "toronjil",
      "name": "Toronjil",
      "support": 0.154726,
      "transactionCount": 257
    },
    {
      "slug": "vaporub",
      "name": "Vaporub",
      "support": 0.14991,
      "transactionCount": 249
    },
    {
      "slug": "rosas-de-castilla",
      "name": "Rosas de Castilla",
      "support": 0.147502,
      "transactionCount": 245
    },
    {
      "slug": "menta",
      "name": "Menta",
      "support": 0.146297,
      "transactionCount": 243
    },
    {
      "slug": "romero",
      "name": "Romero",
      "support": 0.140277,
      "transactionCount": 233
    },
    {
      "slug": "cafe",
      "name": "Café",
      "support": 0.136665,
      "transactionCount": 227
    },
    {
      "slug": "jengibre",
      "name": "Jengibre",
      "support": 0.133654,
      "transactionCount": 222
    },
    {
      "slug": "copal",
      "name": "Copal",
      "support": 0.117399,
      "transactionCount": 195
    },
    {
      "slug": "hierbabuena",
      "name": "Hierbabuena",
      "support": 0.111981,
      "transactionCount": 186
    },
    {
      "slug": "bugambilia",
      "name": "Bugambilia",
      "support": 0.108368,
      "transactionCount": 180
    },
    {
      "slug": "mirra-y-azafran",
      "name": "Mirra y Azafrán",
      "support": 0.063215,
      "transactionCount": 105
    }
  ]
} satisfies AprioriArtifact;
