from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = REPO_ROOT / "ml" / "exports" / "dataset_recomendacion_aromas.csv"
DEFAULT_CATALOG = REPO_ROOT / "ml" / "config" / "product-catalog.json"
DEFAULT_OUTPUT = REPO_ROOT / "ml" / "exports" / "dataset_apriori_transacciones.csv"
EXPECTED_COLUMNS = ["tid", "items"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Construye el dataset transaccional TID/Items de Apriori a partir "
            "de las compras completadas de INHALEX."
        )
    )
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def load_catalog(path: Path) -> list[dict[str, Any]]:
    catalog = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(catalog, list) or not catalog:
        raise ValueError("El catálogo debe ser una lista no vacía")
    return catalog


def validate_source(frame: pd.DataFrame) -> None:
    required = {
        "order_id",
        "product_id",
        "product_name",
        "event_type",
        "occurred_at",
    }
    missing = sorted(required - set(frame.columns))
    if missing:
        raise ValueError(f"Faltan columnas en el dataset fuente: {missing}")
    if frame.empty:
        raise ValueError("El dataset fuente está vacío")


def build_transactions(
    source_path: Path,
    catalog_path: Path,
) -> tuple[list[dict[str, str]], dict[str, str]]:
    frame = pd.read_csv(
        source_path,
        encoding="utf-8-sig",
        dtype={
            "order_id": "string",
            "product_id": "string",
            "event_type": "string",
        },
    )
    validate_source(frame)

    catalog = load_catalog(catalog_path)
    slug_by_id = {str(item["product_id"]): str(item["slug"]) for item in catalog}
    name_by_slug = {str(item["slug"]): str(item["name"]) for item in catalog}
    if len(slug_by_id) != len(catalog) or len(name_by_slug) != len(catalog):
        raise ValueError("El catálogo contiene identificadores o slugs duplicados")
    if any("|" in slug for slug in name_by_slug):
        raise ValueError("Los slugs no pueden contener el separador |")

    purchases = frame.loc[
        frame["event_type"].eq("purchase") & frame["order_id"].notna()
    ].copy()
    if purchases.empty:
        raise ValueError("No existen eventos purchase para formar canastas")

    unknown_products = sorted(set(purchases["product_id"]) - set(slug_by_id))
    if unknown_products:
        raise ValueError(
            "Las compras contienen productos fuera del catálogo: "
            f"{unknown_products}"
        )

    purchases["occurred_at"] = pd.to_datetime(
        purchases["occurred_at"], errors="coerce"
    )
    if purchases["occurred_at"].isna().any():
        raise ValueError("Hay compras con fecha inválida")

    order_dates = purchases.groupby("order_id", sort=False)["occurred_at"].min()
    baskets: dict[str, set[str]] = defaultdict(set)
    for row in purchases.itertuples(index=False):
        baskets[str(row.order_id)].add(slug_by_id[str(row.product_id)])

    ordered_ids = sorted(
        baskets,
        key=lambda order_id: (order_dates.loc[order_id], order_id),
    )
    rows = [
        {
            "tid": order_id,
            "items": "|".join(sorted(baskets[order_id])),
        }
        for order_id in ordered_ids
    ]
    validate_transactions(rows, set(name_by_slug))
    temporal_index = {
        order_id: order_dates.loc[order_id].isoformat() for order_id in ordered_ids
    }
    return rows, temporal_index


def validate_transactions(
    rows: list[dict[str, str]],
    valid_slugs: set[str],
) -> None:
    tids = [row["tid"] for row in rows]
    if not rows:
        raise ValueError("El dataset transaccional no puede quedar vacío")
    if len(tids) != len(set(tids)):
        raise ValueError("TID debe ser único por canasta")

    covered_products: set[str] = set()
    for row in rows:
        items = row["items"].split("|") if row["items"] else []
        if not items:
            raise ValueError(f"La canasta {row['tid']} no contiene productos")
        if items != sorted(set(items)):
            raise ValueError(
                f"La canasta {row['tid']} debe tener slugs únicos y ordenados"
            )
        unknown = set(items) - valid_slugs
        if unknown:
            raise ValueError(
                f"La canasta {row['tid']} contiene slugs desconocidos: {unknown}"
            )
        covered_products.update(items)

    if covered_products != valid_slugs:
        missing = sorted(valid_slugs - covered_products)
        raise ValueError(f"No todos los productos aparecen en las canastas: {missing}")


def write_transactions(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=EXPECTED_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    args = parse_args()
    rows, temporal_index = build_transactions(
        args.source.resolve(),
        args.catalog.resolve(),
    )
    write_transactions(args.output.resolve(), rows)

    item_counts = [len(row["items"].split("|")) for row in rows]
    multi_product = sum(count >= 2 for count in item_counts)
    dates = [datetime.fromisoformat(value) for value in temporal_index.values()]
    summary = {
        "output": str(args.output.resolve()),
        "columns": EXPECTED_COLUMNS,
        "transactions": len(rows),
        "products": len({item for row in rows for item in row["items"].split("|")}),
        "periodStart": min(dates).isoformat(),
        "periodEnd": max(dates).isoformat(),
        "multiProductTransactions": multi_product,
        "multiProductShare": round(multi_product / len(rows), 6),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
