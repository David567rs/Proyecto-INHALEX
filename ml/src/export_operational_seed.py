from __future__ import annotations

import argparse
import json
import random
from collections import Counter
from datetime import date, datetime
from pathlib import Path
from typing import Any

from generate_synthetic_datasets import (
    DEFAULT_CATALOG_PATH,
    DEFAULT_CONFIG_PATH,
    INCOMPATIBLE_INHALER_REVIEW_TERMS,
    REPO_ROOT,
    build_customers,
    build_orders,
    build_reviews,
    choose_favorites,
    load_json,
)


DEFAULT_OUTPUT_PATH = REPO_ROOT / "ml" / "exports" / "operational-seed.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Exporta el artefacto técnico para sembrar Mongo local. "
            "No crea un cuarto dataset analítico."
        )
    )
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG_PATH)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG_PATH)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH)
    return parser.parse_args()


def iso_value(value: date | datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def build_cart_snapshot(
    customer_index: int,
    favorite_product_ids: list[str],
    catalog: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if customer_index % 3 != 0 and customer_index % 11 != 0:
        return []

    desired_count = 1 + (customer_index % 3)
    product_ids = list(favorite_product_ids)
    for offset in range(len(catalog)):
        product_id = catalog[(customer_index + offset) % len(catalog)]["product_id"]
        if product_id not in product_ids:
            product_ids.append(product_id)
        if len(product_ids) >= desired_count:
            break

    return [
        {
            "product_id": product_id,
            "quantity": 2 if (customer_index + position) % 9 == 0 else 1,
        }
        for position, product_id in enumerate(product_ids[:desired_count])
    ]


def build_payload(
    config: dict[str, Any], catalog: list[dict[str, Any]]
) -> dict[str, Any]:
    rng = random.Random(int(config["random_seed"]))
    start = date.fromisoformat(config["start_date"])
    end = date.fromisoformat(config["end_date"])
    customers = build_customers(rng, int(config["customer_count"]), start, end)
    products_by_id = {item["product_id"]: item for item in catalog}
    customers_by_id = {item["customer_key"]: item for item in customers}
    orders = build_orders(
        rng,
        customers,
        catalog,
        int(config["order_count"]),
        end,
    )
    favorites = choose_favorites(rng, customers, catalog, orders)
    reviews = build_reviews(rng, customers_by_id, products_by_id, orders, end)

    customer_rows: list[dict[str, Any]] = []
    for index, customer in enumerate(customers, start=1):
        favorite_product_ids = sorted(favorites.get(customer["customer_key"], set()))
        customer_rows.append(
            {
                "customer_key": customer["customer_key"],
                "display_name": customer["display_name"],
                "first_name": customer["first_name"],
                "last_name": customer["last_name"],
                "email": customer["email"],
                "phone": customer["phone"],
                "city": customer["city"],
                "state": customer["state"],
                "reference_segment": customer["reference_segment"],
                "joined_at": iso_value(customer["joined_at"]),
                "activity_end": iso_value(customer["activity_end"]),
                "favorite_product_ids": favorite_product_ids,
                "cart_items": build_cart_snapshot(index, favorite_product_ids, catalog),
            }
        )

    order_rows = [
        {
            "order_id": order["order_id"],
            "customer_key": order["customer_key"],
            "created_at": iso_value(order["created_at"]),
            "completed_at": iso_value(order["completed_at"]),
            "status": order["status"],
            "channel": order["channel"],
            "total": order["total"],
            "items": order["items"],
        }
        for order in orders
    ]
    review_rows = [
        {
            **review,
            "created_at": iso_value(review["created_at"]),
        }
        for review in reviews
    ]

    payload = {
        "metadata": {
            "schema_version": 1,
            "generation_run_id": config["generation_run_id"],
            "random_seed": config["random_seed"],
            "start_date": config["start_date"],
            "end_date": config["end_date"],
            "currency": config["currency"],
            "is_synthetic": True,
            "purpose": "local_operational_demo",
        },
        "catalog": [
            {
                "product_id": product["product_id"],
                "slug": product["slug"],
                "name": product["name"],
            }
            for product in catalog
        ],
        "customers": customer_rows,
        "orders": order_rows,
        "reviews": review_rows,
    }
    validate_payload(payload, config)
    return payload


def validate_payload(payload: dict[str, Any], config: dict[str, Any]) -> None:
    customers = payload["customers"]
    orders = payload["orders"]
    reviews = payload["reviews"]
    product_ids = {item["product_id"] for item in payload["catalog"]}
    customer_keys = {item["customer_key"] for item in customers}
    order_ids = {item["order_id"] for item in orders}

    errors: list[str] = []
    if len(customers) != int(config["customer_count"]):
        errors.append("customer_count no coincide")
    if len(orders) != int(config["order_count"]):
        errors.append("order_count no coincide")
    if len(customer_keys) != len(customers):
        errors.append("customer_key duplicado")
    if len(order_ids) != len(orders):
        errors.append("order_id duplicado")
    if len({item["email"] for item in customers}) != len(customers):
        errors.append("email sintético duplicado")
    if any(item["customer_key"] not in customer_keys for item in orders):
        errors.append("pedido con cliente desconocido")
    if any(
        order_item["product_id"] not in product_ids
        for order in orders
        for order_item in order["items"]
    ):
        errors.append("pedido con producto desconocido")
    if any(
        product_id not in product_ids
        for customer in customers
        for product_id in customer["favorite_product_ids"]
    ):
        errors.append("favorito con producto desconocido")

    for order in orders:
        created_at = datetime.fromisoformat(order["created_at"])
        completed_value = order["completed_at"]
        if order["status"] == "completed":
            if not completed_value:
                errors.append(f"pedido completado sin fecha: {order['order_id']}")
                break
            if datetime.fromisoformat(completed_value) <= created_at:
                errors.append(
                    f"pedido completado antes de su creación: {order['order_id']}"
                )
                break
        elif completed_value:
            errors.append(
                f"pedido no completado con fecha de entrega: {order['order_id']}"
            )
            break

    completed_by_id = {
        order["order_id"]: order for order in orders if order["status"] == "completed"
    }
    review_pairs: set[tuple[str, str]] = set()
    for review in reviews:
        pair = (review["customer_key"], review["product_id"])
        if pair in review_pairs:
            errors.append("reseña duplicada por cliente-producto")
            break
        review_pairs.add(pair)
        order = completed_by_id.get(review["order_id"])
        if not order:
            errors.append("reseña sin pedido completado")
            break
        if review["customer_key"] != order["customer_key"]:
            errors.append("reseña enlazada a otro cliente")
            break
        if review["product_id"] not in {
            item["product_id"] for item in order["items"]
        }:
            errors.append("reseña enlazada a producto no comprado")
            break
        if datetime.fromisoformat(review["created_at"]) <= datetime.fromisoformat(
            order["completed_at"]
        ):
            errors.append("reseña no posterior a la entrega")
            break
        normalized_comment = review["comment"].casefold()
        if any(
            term.casefold() in normalized_comment
            for term in INCOMPATIBLE_INHALER_REVIEW_TERMS
        ):
            errors.append(
                f"reseña incompatible con inhalador personal: {review['review_id']}"
            )
            break

    if errors:
        raise ValueError("Artefacto operacional inválido: " + "; ".join(errors))


def summarize(payload: dict[str, Any], output_path: Path) -> dict[str, Any]:
    status_counts = Counter(order["status"] for order in payload["orders"])
    return {
        "valid": True,
        "output": str(output_path),
        "generation_run_id": payload["metadata"]["generation_run_id"],
        "counts": {
            "customers": len(payload["customers"]),
            "orders": len(payload["orders"]),
            "reviews": len(payload["reviews"]),
            "favorites": sum(
                len(customer["favorite_product_ids"])
                for customer in payload["customers"]
            ),
            "customers_with_cart": sum(
                bool(customer["cart_items"]) for customer in payload["customers"]
            ),
            "products": len(payload["catalog"]),
        },
        "order_statuses": dict(sorted(status_counts.items())),
    }


def main() -> int:
    args = parse_args()
    config = load_json(args.config.resolve())
    catalog = load_json(args.catalog.resolve())
    output_path = args.output.resolve()
    payload = build_payload(config, catalog)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(summarize(payload, output_path), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
