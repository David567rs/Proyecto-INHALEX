from __future__ import annotations

import argparse
import hashlib
import json
import math
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from itertools import combinations
from pathlib import Path
from typing import Any, Iterable

import pandas as pd


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATASET = (
    REPO_ROOT / "ml" / "exports" / "dataset_apriori_transacciones.csv"
)
DEFAULT_SOURCE = (
    REPO_ROOT / "ml" / "exports" / "dataset_recomendacion_aromas.csv"
)
DEFAULT_CATALOG = REPO_ROOT / "ml" / "config" / "product-catalog.json"
DEFAULT_JSON_OUTPUT = REPO_ROOT / "ml" / "artifacts" / "apriori-rules.v1.json"
DEFAULT_TS_OUTPUT = (
    REPO_ROOT
    / "Server"
    / "src"
    / "modules"
    / "intelligence"
    / "artifacts"
    / "apriori-rules.generated.ts"
)


@dataclass(frozen=True)
class AssociationRule:
    antecedent: str
    consequent: str
    support: float
    confidence: float
    lift: float
    cooccurrence_count: int

    @property
    def score(self) -> float:
        return self.confidence * self.lift


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Entrena reglas de asociación Apriori para INHALEX."
    )
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--json-output", type=Path, default=DEFAULT_JSON_OUTPUT)
    parser.add_argument("--ts-output", type=Path, default=DEFAULT_TS_OUTPUT)
    parser.add_argument("--min-support", type=float, default=0.008)
    parser.add_argument("--min-confidence", type=float, default=0.10)
    parser.add_argument("--min-lift", type=float, default=1.05)
    parser.add_argument("--max-len", type=int, default=2)
    parser.add_argument("--train-ratio", type=float, default=0.80)
    parser.add_argument("--version", default="1.0.0")
    parser.add_argument(
        "--generated-at",
        help="Fecha ISO opcional para compilaciones completamente reproducibles.",
    )
    return parser.parse_args()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_catalog(path: Path) -> tuple[dict[str, str], set[str]]:
    catalog = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(catalog, list) or not catalog:
        raise ValueError("El catálogo debe ser una lista no vacía")
    name_by_slug = {str(item["slug"]): str(item["name"]) for item in catalog}
    if len(name_by_slug) != len(catalog):
        raise ValueError("El catálogo contiene slugs duplicados")
    return name_by_slug, set(name_by_slug)


def load_transactions(path: Path, valid_slugs: set[str]) -> list[tuple[str, frozenset[str]]]:
    frame = pd.read_csv(path, encoding="utf-8-sig", dtype="string")
    if list(frame.columns) != ["tid", "items"]:
        raise ValueError("El contrato transaccional debe contener exactamente tid,items")
    if frame.empty or frame["tid"].isna().any() or frame["items"].isna().any():
        raise ValueError("El dataset transaccional contiene valores vacíos")
    if not frame["tid"].is_unique:
        raise ValueError("tid debe ser único")

    transactions: list[tuple[str, frozenset[str]]] = []
    covered: set[str] = set()
    for row in frame.itertuples(index=False):
        raw_items = str(row.items).split("|")
        items = frozenset(raw_items)
        if len(items) != len(raw_items):
            raise ValueError(f"La transacción {row.tid} contiene productos duplicados")
        if not items:
            raise ValueError(f"La transacción {row.tid} está vacía")
        unknown = items - valid_slugs
        if unknown:
            raise ValueError(f"Slugs desconocidos en {row.tid}: {sorted(unknown)}")
        covered.update(items)
        transactions.append((str(row.tid), items))
    if covered != valid_slugs:
        raise ValueError(
            f"El dataset no cubre el catálogo completo: {sorted(valid_slugs - covered)}"
        )
    return transactions


def load_order_dates(source_path: Path) -> dict[str, pd.Timestamp]:
    frame = pd.read_csv(
        source_path,
        encoding="utf-8-sig",
        usecols=["event_type", "order_id", "occurred_at"],
        dtype={"event_type": "string", "order_id": "string"},
    )
    purchases = frame.loc[
        frame["event_type"].eq("purchase") & frame["order_id"].notna()
    ].copy()
    purchases["occurred_at"] = pd.to_datetime(
        purchases["occurred_at"], errors="coerce"
    )
    if purchases.empty or purchases["occurred_at"].isna().any():
        raise ValueError("No se pudo construir el índice temporal de compras")
    return (
        purchases.groupby("order_id")["occurred_at"].min().to_dict()
    )


def train_rules(
    baskets: Iterable[frozenset[str]],
    min_support: float,
    min_confidence: float,
    min_lift: float,
    max_len: int,
) -> tuple[list[AssociationRule], Counter[str]]:
    if max_len != 2:
        raise ValueError(
            "Esta implementación auditable genera reglas A→B y requiere max_len=2"
        )
    if not (0 < min_support <= 1):
        raise ValueError("min_support debe estar entre 0 y 1")
    if not (0 < min_confidence <= 1):
        raise ValueError("min_confidence debe estar entre 0 y 1")
    if min_lift <= 0:
        raise ValueError("min_lift debe ser positivo")

    transactions = list(baskets)
    total = len(transactions)
    if total == 0:
        raise ValueError("No hay transacciones para entrenar Apriori")
    minimum_count = max(1, math.ceil(min_support * total))

    singleton_counts: Counter[str] = Counter()
    for basket in transactions:
        singleton_counts.update(basket)
    frequent_singletons = {
        item for item, count in singleton_counts.items() if count >= minimum_count
    }

    pair_counts: Counter[tuple[str, str]] = Counter()
    for basket in transactions:
        candidates = sorted(basket & frequent_singletons)
        pair_counts.update(combinations(candidates, 2))

    rules: list[AssociationRule] = []
    for (left, right), cooccurrence_count in pair_counts.items():
        support = cooccurrence_count / total
        if support < min_support:
            continue
        for antecedent, consequent in [(left, right), (right, left)]:
            confidence = cooccurrence_count / singleton_counts[antecedent]
            consequent_support = singleton_counts[consequent] / total
            lift = confidence / consequent_support
            if confidence < min_confidence or lift < min_lift:
                continue
            rules.append(
                AssociationRule(
                    antecedent=antecedent,
                    consequent=consequent,
                    support=support,
                    confidence=confidence,
                    lift=lift,
                    cooccurrence_count=cooccurrence_count,
                )
            )
    rules.sort(
        key=lambda rule: (
            -rule.score,
            -rule.confidence,
            -rule.support,
            rule.antecedent,
            rule.consequent,
        )
    )
    return rules, singleton_counts


def temporal_evaluation(
    ordered_transactions: list[tuple[str, frozenset[str]]],
    min_support: float,
    min_confidence: float,
    min_lift: float,
    max_len: int,
    train_ratio: float,
) -> tuple[float, int, int]:
    if not (0.5 <= train_ratio < 1):
        raise ValueError("train_ratio debe estar entre 0.5 y 1")
    split_index = int(len(ordered_transactions) * train_ratio)
    train = ordered_transactions[:split_index]
    test = ordered_transactions[split_index:]
    if not train or not test:
        raise ValueError("La división cronológica dejó train o test vacío")

    rules, _ = train_rules(
        (basket for _, basket in train),
        min_support,
        min_confidence,
        min_lift,
        max_len,
    )
    best_by_antecedent: dict[str, AssociationRule] = {}
    for rule in rules:
        current = best_by_antecedent.get(rule.antecedent)
        if current is None or (
            rule.score,
            rule.confidence,
            rule.support,
        ) > (
            current.score,
            current.confidence,
            current.support,
        ):
            best_by_antecedent[rule.antecedent] = rule

    attempts = 0
    hits = 0
    for _, basket in test:
        for antecedent in basket:
            rule = best_by_antecedent.get(antecedent)
            if rule is None:
                continue
            attempts += 1
            if rule.consequent in basket:
                hits += 1
    hit_rate = hits / attempts if attempts else 0.0
    return hit_rate, len(train), len(test)


def build_artifact(
    args: argparse.Namespace,
    transactions: list[tuple[str, frozenset[str]]],
    order_dates: dict[str, pd.Timestamp],
    name_by_slug: dict[str, str],
    dataset_hash: str,
) -> dict[str, Any]:
    missing_dates = sorted({tid for tid, _ in transactions} - set(order_dates))
    if missing_dates:
        raise ValueError(
            f"No existe fecha para {len(missing_dates)} transacciones: "
            f"{missing_dates[:3]}"
        )
    ordered = sorted(
        transactions,
        key=lambda item: (order_dates[item[0]], item[0]),
    )
    rules, singleton_counts = train_rules(
        (basket for _, basket in ordered),
        args.min_support,
        args.min_confidence,
        args.min_lift,
        args.max_len,
    )
    hit_rate, temporal_train_size, temporal_test_size = temporal_evaluation(
        ordered,
        args.min_support,
        args.min_confidence,
        args.min_lift,
        args.max_len,
        args.train_ratio,
    )
    total = len(ordered)
    covered_antecedents = {rule.antecedent for rule in rules}
    generated_at = args.generated_at or datetime.now(timezone.utc).isoformat()

    artifact_rules = [
        {
            "antecedentSlugs": [rule.antecedent],
            "antecedentNames": [name_by_slug[rule.antecedent]],
            "consequentSlug": rule.consequent,
            "consequentName": name_by_slug[rule.consequent],
            "support": round(rule.support, 6),
            "confidence": round(rule.confidence, 6),
            "lift": round(rule.lift, 6),
            "cooccurrenceCount": rule.cooccurrence_count,
            "score": round(rule.score, 6),
        }
        for rule in rules
    ]
    popular_fallbacks = [
        {
            "slug": slug,
            "name": name_by_slug[slug],
            "support": round(count / total, 6),
            "transactionCount": count,
        }
        for slug, count in sorted(
            singleton_counts.items(),
            key=lambda item: (-item[1], item[0]),
        )
    ]
    artifact: dict[str, Any] = {
        "schemaVersion": "1.0",
        "model": {
            "name": "Apriori",
            "version": args.version,
            "isSynthetic": True,
            "generatedAt": generated_at,
            "datasetSha256": dataset_hash,
        },
        "training": {
            "transactions": total,
            "periodStart": min(order_dates[tid] for tid, _ in ordered).isoformat(),
            "periodEnd": max(order_dates[tid] for tid, _ in ordered).isoformat(),
            "minSupport": args.min_support,
            "minConfidence": args.min_confidence,
            "minLift": args.min_lift,
        },
        "metrics": {
            "rules": len(artifact_rules),
            "catalogCoverage": round(
                len(covered_antecedents) / len(name_by_slug), 6
            ),
            "temporalTop1HitRate": round(hit_rate, 6),
            "temporalTrainTransactions": temporal_train_size,
            "temporalValidationTransactions": temporal_test_size,
        },
        "rules": artifact_rules,
        "popularFallbacks": popular_fallbacks,
    }
    validate_artifact(artifact, set(name_by_slug))
    return artifact


def validate_artifact(artifact: dict[str, Any], valid_slugs: set[str]) -> None:
    rules = artifact["rules"]
    if not rules:
        raise ValueError("Apriori no produjo reglas con los umbrales elegidos")
    for rule in rules:
        antecedents = rule["antecedentSlugs"]
        if len(antecedents) != 1:
            raise ValueError("Cada regla desplegable debe tener un antecedente")
        if antecedents[0] == rule["consequentSlug"]:
            raise ValueError("Una regla no puede recomendar el mismo producto")
        if set(antecedents + [rule["consequentSlug"]]) - valid_slugs:
            raise ValueError("Una regla contiene slugs fuera del catálogo")
        if rule["support"] <= 0 or rule["confidence"] <= 0 or rule["lift"] <= 0:
            raise ValueError("Las métricas de reglas deben ser positivas")
    fallback_slugs = {item["slug"] for item in artifact["popularFallbacks"]}
    if fallback_slugs != valid_slugs:
        raise ValueError("Los fallbacks deben cubrir el catálogo completo")


def write_json(path: Path, artifact: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(artifact, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def write_typescript(path: Path, artifact: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(artifact, ensure_ascii=False, indent=2)
    path.write_text(
        "/* eslint-disable prettier/prettier */\n"
        "/* Archivo generado por ml/src/train_apriori.py. No editar manualmente. */\n"
        "import type { AprioriArtifact } from "
        "'../intelligence-artifact.types';\n\n"
        f"export const APRIORI_RULES_ARTIFACT = {serialized} "
        "satisfies AprioriArtifact;\n",
        encoding="utf-8",
    )


def main() -> int:
    args = parse_args()
    dataset_path = args.dataset.resolve()
    name_by_slug, valid_slugs = load_catalog(args.catalog.resolve())
    transactions = load_transactions(dataset_path, valid_slugs)
    order_dates = load_order_dates(args.source.resolve())
    artifact = build_artifact(
        args,
        transactions,
        order_dates,
        name_by_slug,
        sha256_file(dataset_path),
    )
    write_json(args.json_output.resolve(), artifact)
    write_typescript(args.ts_output.resolve(), artifact)
    print(
        json.dumps(
            {
                "jsonOutput": str(args.json_output.resolve()),
                "typescriptOutput": str(args.ts_output.resolve()),
                "transactions": artifact["training"]["transactions"],
                **artifact["metrics"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
