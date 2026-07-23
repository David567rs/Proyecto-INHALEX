from __future__ import annotations

import argparse
import csv
import json
import math
import random
import statistics
import unicodedata
from collections import Counter, defaultdict
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable, Sequence


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG_PATH = REPO_ROOT / "ml" / "config" / "synthetic-config.json"
DEFAULT_CATALOG_PATH = REPO_ROOT / "ml" / "config" / "product-catalog.json"
MEXICO_CITY_TZ = timezone(timedelta(hours=-6))


GIVEN_NAMES = [
    "Sofía",
    "Valentina",
    "Regina",
    "Camila",
    "Mariana",
    "Fernanda",
    "Daniela",
    "Renata",
    "Alejandra",
    "Ximena",
    "Natalia",
    "Andrea",
    "Paola",
    "Gabriela",
    "Lucía",
    "Carolina",
    "Ana Sofía",
    "María Fernanda",
    "María José",
    "Diana Laura",
    "Santiago",
    "Mateo",
    "Sebastián",
    "Leonardo",
    "Emiliano",
    "Diego",
    "Alejandro",
    "Daniel",
    "Miguel Ángel",
    "José Manuel",
    "Luis Fernando",
    "Carlos Eduardo",
    "Andrés",
    "Javier",
    "Ricardo",
    "Eduardo",
    "Arturo",
    "Raúl",
    "Óscar",
    "Héctor",
    "Adriana",
    "Verónica",
    "Mónica",
    "Patricia",
    "Claudia",
    "Elena",
    "Beatriz",
    "Guillermo",
    "Francisco Javier",
    "Jorge Alberto",
]

SURNAMES = [
    "Hernández",
    "García",
    "Martínez",
    "López",
    "González",
    "Pérez",
    "Rodríguez",
    "Sánchez",
    "Ramírez",
    "Cruz",
    "Flores",
    "Gómez",
    "Morales",
    "Vázquez",
    "Reyes",
    "Jiménez",
    "Torres",
    "Díaz",
    "Gutiérrez",
    "Ruiz",
    "Mendoza",
    "Aguilar",
    "Ortiz",
    "Castillo",
    "Romero",
    "Álvarez",
    "Méndez",
    "Chávez",
    "Rivera",
    "Juárez",
    "Rojas",
    "Herrera",
    "Medina",
    "Castro",
    "Vega",
    "Campos",
    "Navarro",
    "Salazar",
    "Cortés",
    "Cabrera",
    "Valdez",
    "Espinoza",
    "Mejía",
    "Luna",
    "Soto",
    "Nava",
    "Trejo",
    "Escobar",
    "Miranda",
    "Zamora",
]

LOCATIONS = [
    ("Ciudad de México", "Ciudad de México", 0.27),
    ("Ecatepec", "Estado de México", 0.11),
    ("Naucalpan", "Estado de México", 0.08),
    ("Toluca", "Estado de México", 0.08),
    ("Puebla", "Puebla", 0.12),
    ("Santiago de Querétaro", "Querétaro", 0.09),
    ("Pachuca", "Hidalgo", 0.07),
    ("Cuernavaca", "Morelos", 0.06),
    ("Tlaxcala", "Tlaxcala", 0.04),
    ("León", "Guanajuato", 0.05),
    ("Guadalajara", "Jalisco", 0.03),
]

SEGMENT_WEIGHTS = {
    "nuevo": 0.24,
    "ocasional": 0.31,
    "recurrente": 0.26,
    "leal": 0.12,
    "inactivo": 0.07,
}

ORDER_PROPENSITY = {
    "nuevo": 0.35,
    "ocasional": 0.8,
    "recurrente": 1.7,
    "leal": 3.2,
    "inactivo": 0.35,
}

CATEGORIES = [
    "linea-insomnio",
    "linea-ansiedad-estres",
    "linea-verde",
    "linea-resfriado",
    "linea-estimulante",
]

CATEGORY_BASE_WEIGHTS = [0.2, 0.26, 0.2, 0.21, 0.13]

PAIR_AFFINITIES = {
    "lavanda": {"manzanilla", "toronjil", "rosas-de-castilla"},
    "manzanilla": {"lavanda", "toronjil"},
    "eucalipto": {"vaporub", "menta", "bugambilia"},
    "vaporub": {"eucalipto", "menta"},
    "canela": {"jengibre", "anis-estrella", "cafe"},
    "cafe": {"canela", "romero"},
    "copal": {"mirra-y-azafran", "romero"},
    "hierbabuena": {"menta", "manzanilla"},
}

INTERACTION_STRENGTH = {
    "view": 1.0,
    "search_click": 1.5,
    "recommendation_impression": 0.25,
    "recommendation_click": 2.0,
    "favorite_add": 3.0,
    "cart_add": 4.0,
    "purchase": 5.0,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Genera tres datasets sintéticos y coherentes para INHALEX."
    )
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG_PATH)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG_PATH)
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Sobrescribe output_directory de la configuración.",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Valida archivos existentes sin regenerarlos.",
    )
    return parser.parse_args()


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def remove_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def email_token(value: str) -> str:
    normalized = remove_accents(value).lower()
    return "".join(char if char.isalnum() else "." for char in normalized).strip(".")


def weighted_choice(rng: random.Random, values: Sequence[Any], weights: Sequence[float]) -> Any:
    return rng.choices(values, weights=weights, k=1)[0]


def random_date_between(
    rng: random.Random,
    start: date,
    end: date,
    weighted: bool = False,
) -> date:
    if end <= start:
        return start
    dates: list[date] = []
    weights: list[float] = []
    current = start
    while current <= end:
        dates.append(current)
        weights.append(order_date_weight(current) if weighted else 1.0)
        current += timedelta(days=1)
    return weighted_choice(rng, dates, weights)


def random_timestamp(rng: random.Random, value: date) -> datetime:
    hour_weights = [0.25, 0.35, 0.55, 0.7, 0.85, 1.0, 1.0, 0.95, 0.8, 0.6, 0.4, 0.25]
    hour = weighted_choice(rng, list(range(9, 21)), hour_weights)
    return datetime.combine(
        value,
        time(hour=hour, minute=rng.randrange(0, 60), second=rng.randrange(0, 60)),
        tzinfo=MEXICO_CITY_TZ,
    )


def iso_datetime(value: datetime | None) -> str:
    return value.isoformat() if value else ""


def date_range(start: date, end: date) -> list[date]:
    return [start + timedelta(days=offset) for offset in range((end - start).days + 1)]


def month_range(start: date, end: date) -> list[date]:
    """Return the first day of every calendar month in the inclusive period."""

    current = date(start.year, start.month, 1)
    last = date(end.year, end.month, 1)
    months: list[date] = []
    while current <= last:
        months.append(current)
        current = (
            date(current.year + 1, 1, 1)
            if current.month == 12
            else date(current.year, current.month + 1, 1)
        )
    return months


def commercial_event(value: date) -> str:
    if value.month == 2 and 10 <= value.day <= 14:
        return "san_valentin"
    if value.month == 5 and 1 <= value.day <= 10:
        return "dia_de_las_madres"
    if value.month == 11 and 14 <= value.day <= 20:
        return "buen_fin"
    if value.month == 12 and 1 <= value.day <= 24:
        return "temporada_diciembre"
    if value.month == 7 and 1 <= value.day <= 21:
        return "verano_fresco"
    return "none"


def is_mexican_holiday(value: date) -> bool:
    fixed = {(1, 1), (5, 1), (9, 16), (12, 25)}
    if (value.month, value.day) in fixed:
        return True
    if value.month == 2 and value.weekday() == 0 and value.day <= 7:
        return True
    if value.month == 3 and value.weekday() == 0 and 15 <= value.day <= 21:
        return True
    if value.month == 11 and value.weekday() == 0 and 15 <= value.day <= 21:
        return True
    return False


def order_date_weight(value: date) -> float:
    weight = 1.0
    if value.weekday() in {4, 5, 6}:
        weight *= 1.12
    if value.day in {14, 15, 16, 28, 29, 30, 31}:
        weight *= 1.18
    if value.month in {11, 12}:
        weight *= 1.2
    if value.month in {1, 2}:
        weight *= 1.08
    if commercial_event(value) != "none":
        weight *= 1.55
    if is_mexican_holiday(value):
        weight *= 0.78
    return weight


def promotion_for(product: dict[str, Any], value: date) -> tuple[str, float]:
    event = commercial_event(value)
    if event == "buen_fin":
        return event, 0.20
    if event == "temporada_diciembre":
        return event, 0.10
    if event == "dia_de_las_madres" and product["seasonality_group"] == "relaxation":
        return event, 0.15
    if event == "san_valentin" and product["slug"] in {
        "rosas-de-castilla",
        "lavanda",
        "canela",
    }:
        return event, 0.15
    if event == "verano_fresco" and product["seasonality_group"] == "freshness":
        return event, 0.12
    if product["seasonality_group"] == "respiratory" and (
        value.month in {1, 2, 10, 11, 12}
    ) and 8 <= value.day <= 18:
        return "temporada_respiratoria", 0.08
    return "none", 0.0


def product_seasonality(product: dict[str, Any], value: date) -> float:
    group = product["seasonality_group"]
    if group == "respiratory" and value.month in {1, 2, 10, 11, 12}:
        return 1.75
    if group == "relaxation" and value.month in {1, 5, 11, 12}:
        return 1.2
    if group == "freshness" and value.month in {4, 5, 6, 7, 8}:
        return 1.35
    if group == "energy" and value.weekday() in {0, 1, 2, 3, 4}:
        return 1.12
    return 1.0


def build_customers(
    rng: random.Random,
    count: int,
    start: date,
    end: date,
) -> list[dict[str, Any]]:
    customers: list[dict[str, Any]] = []
    used_names: set[str] = set()
    segment_names = list(SEGMENT_WEIGHTS)
    segment_weights = list(SEGMENT_WEIGHTS.values())
    location_values = [(city, state) for city, state, _weight in LOCATIONS]
    location_weights = [weight for _city, _state, weight in LOCATIONS]

    for index in range(1, count + 1):
        while True:
            given_name = rng.choice(GIVEN_NAMES)
            paternal = rng.choice(SURNAMES)
            maternal = rng.choice([surname for surname in SURNAMES if surname != paternal])
            full_name = f"{given_name} {paternal} {maternal}"
            if full_name not in used_names:
                used_names.add(full_name)
                break

        segment = weighted_choice(rng, segment_names, segment_weights)
        if segment == "nuevo":
            joined_at = random_date_between(rng, max(start, end - timedelta(days=120)), end)
            activity_end = end
        elif segment == "inactivo":
            joined_at = random_date_between(rng, start, end - timedelta(days=300))
            activity_end = random_date_between(
                rng,
                joined_at + timedelta(days=30),
                end - timedelta(days=120),
            )
        else:
            joined_at = random_date_between(rng, start, end - timedelta(days=60))
            activity_end = end

        primary_category = weighted_choice(rng, CATEGORIES, CATEGORY_BASE_WEIGHTS)
        secondary_category = rng.choice(
            [category for category in CATEGORIES if category != primary_category]
        )
        city, state = weighted_choice(rng, location_values, location_weights)
        email_local = email_token(f"{given_name}.{paternal}")
        customers.append(
            {
                "customer_key": f"SYN-CUST-{index:04d}",
                "display_name": full_name,
                "first_name": given_name,
                "last_name": f"{paternal} {maternal}",
                "email": f"{email_local}.{index:04d}@demo.inhalex.invalid",
                "phone": f"5500{index:06d}",
                "city": city,
                "state": state,
                "reference_segment": segment,
                "joined_at": joined_at,
                "activity_end": activity_end,
                "primary_category": primary_category,
                "secondary_category": secondary_category,
                "review_propensity": min(
                    0.42,
                    max(
                        0.07,
                        rng.uniform(0.11, 0.24)
                        + (0.08 if segment == "leal" else 0)
                        - (0.03 if segment == "nuevo" else 0),
                    ),
                ),
                "favorite_propensity": rng.uniform(0.45, 0.82),
                "alexa_propensity": rng.uniform(0.04, 0.28),
            }
        )
    return customers


def basket_size(rng: random.Random, segment: str) -> int:
    values = [1, 2, 3, 4, 5]
    weights = [0.53, 0.30, 0.12, 0.04, 0.01]
    if segment == "leal":
        weights = [0.38, 0.34, 0.18, 0.08, 0.02]
    elif segment == "nuevo":
        weights = [0.68, 0.24, 0.065, 0.014, 0.001]
    return weighted_choice(rng, values, weights)


def product_weight(
    customer: dict[str, Any],
    product: dict[str, Any],
    value: date,
    selected_slugs: set[str],
) -> float:
    category_multiplier = 0.58
    if product["category"] == customer["primary_category"]:
        category_multiplier = 3.1
    elif product["category"] == customer["secondary_category"]:
        category_multiplier = 1.65
    affinity_multiplier = 1.0
    for selected_slug in selected_slugs:
        if product["slug"] in PAIR_AFFINITIES.get(selected_slug, set()):
            affinity_multiplier *= 2.35
    _promotion, discount = promotion_for(product, value)
    return (
        float(product["base_popularity"])
        * category_multiplier
        * product_seasonality(product, value)
        * affinity_multiplier
        * (1 + discount * 2.2)
    )


def choose_products(
    rng: random.Random,
    customer: dict[str, Any],
    catalog: list[dict[str, Any]],
    value: date,
    size: int,
) -> list[dict[str, Any]]:
    available = catalog.copy()
    selected: list[dict[str, Any]] = []
    selected_slugs: set[str] = set()
    for _ in range(min(size, len(available))):
        weights = [product_weight(customer, item, value, selected_slugs) for item in available]
        product = weighted_choice(rng, available, weights)
        selected.append(product)
        selected_slugs.add(product["slug"])
        available.remove(product)
    return selected


def order_status(rng: random.Random, ordered_at: date, end: date) -> str:
    age = (end - ordered_at).days
    if age <= 7:
        return weighted_choice(
            rng,
            ["completed", "confirmed", "pending_review", "cancelled"],
            [0.61, 0.2, 0.14, 0.05],
        )
    if age <= 21:
        return weighted_choice(
            rng,
            ["completed", "confirmed", "pending_review", "cancelled"],
            [0.86, 0.05, 0.02, 0.07],
        )
    return weighted_choice(rng, ["completed", "cancelled"], [0.93, 0.07])


def item_quantity(rng: random.Random, segment: str) -> int:
    if segment == "leal":
        return weighted_choice(rng, [1, 2, 3, 4], [0.75, 0.19, 0.05, 0.01])
    return weighted_choice(rng, [1, 2, 3], [0.86, 0.12, 0.02])


def build_order(
    rng: random.Random,
    customer: dict[str, Any],
    catalog: list[dict[str, Any]],
    ordered_on: date,
    end: date,
    force_completed: bool = False,
) -> dict[str, Any]:
    status = "completed" if force_completed else order_status(rng, ordered_on, end)
    # Alexa actualmente consulta catálogo, favoritos y bolsa, pero no confirma
    # pedidos. Los pedidos sintéticos respetan el flujo real del backend.
    channel = "web_public"
    products = choose_products(
        rng,
        customer,
        catalog,
        ordered_on,
        basket_size(rng, customer["reference_segment"]),
    )
    items: list[dict[str, Any]] = []
    for product in products:
        quantity = item_quantity(rng, customer["reference_segment"])
        promotion_id, discount_pct = promotion_for(product, ordered_on)
        base_price = 60.0
        effective_price = round(base_price * (1 - discount_pct), 2)
        items.append(
            {
                "product_id": product["product_id"],
                "quantity": quantity,
                "base_unit_price": base_price,
                "effective_unit_price": effective_price,
                "discount_pct": discount_pct,
                "promotion_id": promotion_id,
            }
        )

    created_at = random_timestamp(rng, ordered_on)
    completed_at: datetime | None = None
    if status == "completed":
        delivered_on = min(end, ordered_on + timedelta(days=rng.randint(2, 8)))
        completed_at = random_timestamp(rng, delivered_on)
        # Los pedidos creados al cierre del periodo pueden quedar recortados al
        # mismo día. Conservamos el escenario de entrega local, pero garantizamos
        # que la entrega ocurra después de la creación.
        if completed_at <= created_at:
            completed_at = min(
                created_at + timedelta(hours=2),
                datetime.combine(end, time(23, 59, 59), tzinfo=MEXICO_CITY_TZ),
            )
    total = round(sum(item["quantity"] * item["effective_unit_price"] for item in items), 2)
    return {
        "customer_key": customer["customer_key"],
        "created_at": created_at,
        "completed_at": completed_at,
        "status": status,
        "channel": channel,
        "items": items,
        "total": total,
    }


def build_orders(
    rng: random.Random,
    customers: list[dict[str, Any]],
    catalog: list[dict[str, Any]],
    count: int,
    end: date,
) -> list[dict[str, Any]]:
    if count < len(customers):
        raise ValueError("order_count debe ser mayor o igual que customer_count")

    orders: list[dict[str, Any]] = []
    for customer in customers:
        ordered_on = random_date_between(
            rng,
            customer["joined_at"],
            customer["activity_end"],
            weighted=True,
        )
        orders.append(
            build_order(rng, customer, catalog, ordered_on, end, force_completed=True)
        )

    remaining = count - len(orders)
    customer_weights = [ORDER_PROPENSITY[item["reference_segment"]] for item in customers]
    for _ in range(remaining):
        customer = weighted_choice(rng, customers, customer_weights)
        ordered_on = random_date_between(
            rng,
            customer["joined_at"],
            customer["activity_end"],
            weighted=True,
        )
        orders.append(build_order(rng, customer, catalog, ordered_on, end))

    orders.sort(key=lambda item: item["created_at"])
    for index, order in enumerate(orders, start=1):
        order["order_id"] = f"SYN-ORD-{index:06d}"
    return orders


def choose_favorites(
    rng: random.Random,
    customers: list[dict[str, Any]],
    catalog: list[dict[str, Any]],
    orders: list[dict[str, Any]],
) -> dict[str, set[str]]:
    purchases: dict[str, Counter[str]] = defaultdict(Counter)
    for order in orders:
        if order["status"] != "completed":
            continue
        for item in order["items"]:
            purchases[order["customer_key"]][item["product_id"]] += item["quantity"]

    favorites: dict[str, set[str]] = defaultdict(set)
    for customer in customers:
        if rng.random() > customer["favorite_propensity"]:
            continue
        desired_count = weighted_choice(rng, [1, 2, 3, 4, 5, 6], [0.2, 0.27, 0.23, 0.16, 0.09, 0.05])
        candidates = catalog.copy()
        for _ in range(desired_count):
            if not candidates:
                break
            weights: list[float] = []
            for product in candidates:
                purchased_boost = 2.6 if purchases[customer["customer_key"]][product["product_id"]] else 1.0
                weights.append(
                    product_weight(customer, product, customer["activity_end"], set())
                    * purchased_boost
                )
            selected = weighted_choice(rng, candidates, weights)
            favorites[customer["customer_key"]].add(selected["product_id"])
            candidates.remove(selected)
    return favorites


POSITIVE_OPENERS = [
    "Me gustó mucho {product}.",
    "{product} me dejó una muy buena impresión.",
    "Sí volvería a comprar {product}.",
    "{product} me sorprendió para bien.",
    "Desde el primer uso, {product} me agradó.",
    "Tuve una experiencia muy buena con {product}.",
    "La verdad, {product} me gustó desde el primer uso.",
    "Quedé conforme con {product}.",
]

POSITIVE_DETAILS = [
    "Con una aplicación breve en las manos pude percibir bien el aroma.",
    "El aroma permanece un tiempo razonable al inhalarlo y no resulta invasivo.",
    "Llegó bien cerrado y con el atomizador protegido.",
    "La tapa y el atomizador llegaron en buen estado.",
    "La intensidad se mantiene equilibrada durante varias inhalaciones.",
    "La presentación es práctica y pude aplicarlo sin problema.",
    "El envase venía protegido y no hubo derrames.",
    "El formato de 10 mililitros es práctico y espero que me dure.",
    "Al acercar las manos para inhalarlo, el aroma se sintió ligero.",
    "El atomizador permite aplicar una cantidad uniforme.",
    "La relación entre intensidad y duración me pareció adecuada.",
    "El aroma se percibe con claridad sin sentirse demasiado pesado.",
]

POSITIVE_CLOSERS = [
    "Sí lo volvería a pedir.",
    "Me pareció una compra acertada.",
    "Quedó entre las opciones que volvería a comprar.",
    "Lo recomendaría a quien busque un aroma de este tipo.",
    "En general, quedé conforme con la compra.",
    "Lo tendré presente para un próximo pedido.",
]

USE_CONTEXTS = {
    "relaxation": [
        "Lo apliqué en mis manos y lo inhalé durante una pausa antes de dormir.",
        "Lo usé mientras leía y su perfil aromático acompañó bien el momento.",
        "En casa lo he usado sobre todo al terminar el día.",
        "Lo incorporé a mi rutina nocturna durante varios días.",
        "Hice una pausa para inhalarlo mientras descansaba.",
        "Lo probé antes de dormir y la intensidad me resultó adecuada.",
        "Lo usé un rato después de cenar como parte de una pausa tranquila.",
        "Lo llevé a mi rincón de lectura y el formato resultó muy práctico.",
    ],
    "respiratory": [
        "Lo inhalé durante una mañana fresca y percibí claramente sus notas.",
        "Lo llevé conmigo algunos días de clima frío.",
        "El atomizador distribuye el producto de forma uniforme en las manos.",
        "Lo probé durante varios días antes de escribir esta opinión.",
        "Al frotarlo en las manos, el aroma se percibió con claridad.",
        "Lo usé durante una tarde lluviosa y el perfil mentolado fue agradable.",
        "Lo probé al llegar a casa y la intensidad no me resultó pesada.",
        "Lo utilicé en inhalaciones breves para valorar bien la intensidad.",
    ],
    "freshness": [
        "Lo llevé a mi espacio de trabajo y el aroma no se sintió pesado.",
        "Lo usé a media tarde durante una pausa breve.",
        "Al inhalarlo percibí una sensación aromática fresca y ligera.",
        "Lo probé durante varios días antes de escribir esta opinión.",
        "Lo usé después de una jornada larga y el resultado fue agradable.",
        "Bastó una aplicación breve para distinguir bien el aroma.",
        "El envase compacto me permitió llevarlo fácilmente en la bolsa.",
        "Lo usé durante el día y la intensidad se mantuvo moderada.",
    ],
    "energy": [
        "Lo usé por la mañana durante una pausa en el trabajo.",
        "Lo probé mientras estudiaba y el aroma se mantuvo agradable.",
        "En casa lo he usado principalmente durante el día.",
        "Lo comparé con otros inhaladores aromáticos que ya había probado.",
        "Lo tuve a la mano durante una jornada de trabajo.",
        "Lo probé al iniciar el día y el perfil aromático me gustó.",
        "Lo usé mientras hacía pendientes en casa.",
        "Lo llevé a mi área de estudio para conocer bien su intensidad.",
    ],
}

MINOR_CAVEATS = [
    "Solo me gustaría que el aroma durara un poco más.",
    "El envase es más pequeño de lo que imaginaba, aunque resulta fácil de llevar.",
    "Al principio se siente intenso, pero después se vuelve agradable.",
    "La entrega tardó un día más de lo previsto, pero llegó en buen estado.",
    "Preferiría que el atomizador tuviera una salida un poco más suave.",
    "El aroma cambia ligeramente después de unos minutos, aunque sigue siendo agradable.",
]

MIXED_COMMENTS = [
    "Cumple con lo esperado, aunque el aroma me pareció más suave de lo que muestran las descripciones.",
    "Tiene un aroma agradable, pero necesité una segunda aplicación para percibirlo bien.",
    "La calidad se siente correcta; simplemente no fue mi aroma favorito.",
    "El producto llegó bien, aunque el perfil aromático fue distinto a lo que imaginaba.",
    "Me gustó la presentación, pero la duración del aroma fue irregular en mi caso.",
    "Es una opción aceptable, aunque por el momento probaría otro aroma antes de repetirlo.",
]

NEGATIVE_COMMENTS = [
    "Para mi gusto el aroma resultó demasiado intenso y tuve que hacer una inhalación muy breve.",
    "El atomizador dejó escapar producto y parte del contenido llegó en la tapa.",
    "Esperaba un perfil aromático más definido; en mi caso se percibió muy tenue.",
    "La entrega se retrasó y el empaque exterior llegó maltratado.",
    "No conecté con el aroma y después de varios usos seguía pareciéndome pesado.",
    "El producto se podía usar, pero la presentación no llegó en las mejores condiciones.",
]

SEVERE_COMMENTS = [
    "El envase llegó con fuga y se perdió una parte importante del contenido.",
    "El aroma no se parecía a lo que esperaba y la intensidad desapareció muy rápido.",
    "El empaque llegó abierto y preferí no utilizar el producto.",
    "Tuve un retraso considerable y además el atomizador no funcionó correctamente.",
    "El aroma me resultó demasiado fuerte incluso con una aplicación breve.",
]

SEVERE_CONTEXTS = [
    "Esta calificación refleja lo ocurrido con ese pedido.",
    "Esperé a revisar bien el producto antes de escribir la opinión.",
    "El inconveniente fue suficiente para afectar toda la experiencia de compra.",
    "Preferí dejar constancia del problema en esta reseña.",
    "No fue la experiencia que esperaba cuando hice el pedido.",
    "Tomé en cuenta el estado del producto y de su presentación.",
]

# Frases propias de aceites para difusor que no corresponden al inhalador
# personal de INHALEX. Los validadores importan esta lista para impedir que
# vuelvan a aparecer en los datasets o en el artefacto de demostración local.
INCOMPATIBLE_INHALER_REVIEW_TERMS = (
    "gotero",
    "una gota",
    "unas gotas",
    "difusor",
    "ambientar",
    "habitación",
    "recámara",
    "en la sala",
    "saturar el espacio",
    "saturó el ambiente",
)


def review_rating(rng: random.Random) -> int:
    return weighted_choice(rng, [1, 2, 3, 4, 5], [0.02, 0.05, 0.11, 0.30, 0.52])


def review_comment(
    rng: random.Random,
    product: dict[str, Any],
    rating: int,
    used_comments: set[str],
) -> str:
    aroma = product["aromas"][0]
    use_contexts = USE_CONTEXTS[product["seasonality_group"]]
    contexts = [
        "Lo probé durante varios días antes de escribir esta opinión.",
        "En casa lo hemos usado principalmente por la tarde.",
        "La experiencia puede variar, pero esto fue lo que noté en mi caso.",
        "Lo comparé con otros inhaladores aromáticos que ya había probado.",
        "Me fijé especialmente en la intensidad y en la presentación.",
        "Lo pedí para integrarlo a una rutina tranquila en casa.",
        "Esperé varios usos antes de decidir la calificación.",
        "También revisé que el envase y el atomizador funcionaran correctamente.",
        "La opinión está basada en varias inhalaciones breves realizadas durante la semana.",
        "Lo usé en aplicaciones breves para comparar mejor la intensidad.",
        "El resultado fue similar en las distintas ocasiones en que lo probé.",
        "Tomé en cuenta tanto el aroma como el estado en que llegó el paquete.",
    ]

    for _ in range(40):
        if rating == 5:
            opener = rng.choice(POSITIVE_OPENERS).format(product=product["name"])
            detail = rng.choice(POSITIVE_DETAILS)
            use_context = rng.choice(use_contexts)
            text = rng.choice(
                [
                    f"{opener} El aroma de {aroma} se distingue bien y no me pareció artificial. {detail} {use_context}",
                    f"{use_context} {opener} El perfil de {aroma} se percibe claro y equilibrado. {detail}",
                    f"La primera impresión de {product['name']} fue muy buena. Se reconoce el aroma de {aroma} sin sentirse artificial. {detail} {use_context}",
                    f"{detail} El aroma de {aroma} se percibe limpio y agradable. {use_context} {rng.choice(POSITIVE_CLOSERS)}",
                ]
            )
        elif rating == 4:
            caveat = rng.choice(MINOR_CAVEATS)
            use_context = rng.choice(use_contexts)
            text = rng.choice(
                [
                    f"{product['name']} me gustó y el aroma de {aroma} se reconoce con claridad. {caveat} {use_context}",
                    f"{use_context} En general, {product['name']} me dejó una buena impresión. El aroma de {aroma} es agradable. {caveat}",
                    f"El aroma de {aroma} se distingue bien en {product['name']}. {rng.choice(POSITIVE_DETAILS)} {caveat}",
                    f"{product['name']} cumplió con lo que buscaba en un inhalador aromático personal. {caveat} {rng.choice(contexts)}",
                ]
            )
        elif rating == 3:
            mixed = rng.choice(MIXED_COMMENTS)
            context = rng.choice(contexts)
            text = rng.choice(
                [
                    f"{mixed} El aroma característico de {product['name']} sí se distingue. {context}",
                    f"{context} En general, {product['name']} me pareció aceptable. {mixed}",
                    f"Con {product['name']} tuve una experiencia intermedia. {mixed} Aun así, su aroma característico se alcanza a percibir.",
                    f"{product['name']} llegó bien presentado. {mixed} {context}",
                ]
            )
        elif rating == 2:
            negative = rng.choice(NEGATIVE_COMMENTS)
            context = rng.choice(contexts)
            text = rng.choice(
                [
                    f"{negative} En {product['name']} esperaba que el aroma característico se percibiera con más claridad. {context}",
                    f"{context} {product['name']} no terminó de convencerme. {negative}",
                    f"Mi experiencia con {product['name']} quedó por debajo de lo esperado. {negative} Por ahora no lo volvería a pedir.",
                ]
            )
        else:
            severe = rng.choice(SEVERE_COMMENTS)
            context = rng.choice(SEVERE_CONTEXTS)
            text = rng.choice(
                [
                    f"{severe} Mi experiencia con {product['name']} no fue satisfactoria. {context}",
                    f"{product['name']} no cumplió mis expectativas. {severe} {context}",
                    f"{severe} Por ese motivo no puedo recomendar {product['name']} en esta ocasión. {context}",
                ]
            )
        if text not in used_comments:
            used_comments.add(text)
            return text
    raise RuntimeError("No fue posible construir un comentario único")


def build_reviews(
    rng: random.Random,
    customers_by_id: dict[str, dict[str, Any]],
    products_by_id: dict[str, dict[str, Any]],
    orders: list[dict[str, Any]],
    end: date,
) -> list[dict[str, Any]]:
    reviews: list[dict[str, Any]] = []
    reviewed_pairs: set[tuple[str, str]] = set()
    used_comments: set[str] = set()
    for order in orders:
        if order["status"] != "completed" or not order["completed_at"]:
            continue
        if order["completed_at"].date() >= end:
            # No se inventa una reseña posterior fuera de la fecha de corte.
            continue
        customer = customers_by_id[order["customer_key"]]
        for item in order["items"]:
            pair = (order["customer_key"], item["product_id"])
            if pair in reviewed_pairs or rng.random() > customer["review_propensity"]:
                continue
            reviewed_pairs.add(pair)
            rating = review_rating(rng)
            review_on = min(
                end,
                order["completed_at"].date() + timedelta(days=rng.randint(1, 35)),
            )
            reviews.append(
                {
                    "review_id": f"SYN-REV-{len(reviews) + 1:05d}",
                    "customer_key": order["customer_key"],
                    "order_id": order["order_id"],
                    "product_id": item["product_id"],
                    "rating": rating,
                    "sentiment": "positive" if rating >= 4 else "mixed" if rating == 3 else "negative",
                    "comment": review_comment(
                        rng,
                        products_by_id[item["product_id"]],
                        rating,
                        used_comments,
                    ),
                    "created_at": random_timestamp(rng, review_on),
                }
            )
    return reviews


def event_row(
    events: list[dict[str, Any]],
    run_id: str,
    customer_key: str,
    product: dict[str, Any],
    event_type: str,
    occurred_at: datetime,
    channel: str,
    session_id: str,
    order_id: str = "",
    recommendation_id: str = "",
    quantity: int | None = None,
    rating: int | None = None,
    review_sentiment: str = "",
    review_text: str = "",
) -> None:
    strength = INTERACTION_STRENGTH.get(event_type, 0.0)
    if event_type == "purchase":
        strength += math.log1p(quantity or 1)
    if event_type == "review":
        strength = {1: -3.0, 2: -2.0, 3: 0.5, 4: 3.5, 5: 4.5}[rating or 3]
    content_text = " ".join(
        [
            product["name"],
            product["category"],
            product["description"],
            *product["aromas"],
            *product["benefits"],
        ]
    )
    events.append(
        {
            "interaction_id": f"SYN-INT-{len(events) + 1:07d}",
            "customer_key": customer_key,
            "session_id": session_id,
            "product_id": product["product_id"],
            "product_name": product["name"],
            "event_type": event_type,
            "interaction_strength": round(strength, 4),
            "occurred_at": iso_datetime(occurred_at),
            "channel": channel,
            "order_id": order_id,
            "recommendation_id": recommendation_id,
            "quantity": quantity,
            "review_rating": rating,
            "review_sentiment": review_sentiment,
            "review_text": review_text,
            "category": product["category"],
            "aromas": "|".join(product["aromas"]),
            "benefits": "|".join(product["benefits"]),
            "content_text": content_text,
            "generation_run_id": run_id,
            "is_synthetic": True,
        }
    )


def build_recommendation_events(
    rng: random.Random,
    run_id: str,
    customers: list[dict[str, Any]],
    catalog: list[dict[str, Any]],
    orders: list[dict[str, Any]],
    favorites: dict[str, set[str]],
    reviews: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    customers_by_id = {item["customer_key"]: item for item in customers}
    products_by_id = {item["product_id"]: item for item in catalog}
    reviews_by_order_product = {
        (item["order_id"], item["product_id"]): item for item in reviews
    }

    for customer in customers:
        for product_id in sorted(favorites.get(customer["customer_key"], set())):
            favorite_on = random_date_between(
                rng, customer["joined_at"], customer["activity_end"]
            )
            event_row(
                events,
                run_id,
                customer["customer_key"],
                products_by_id[product_id],
                "favorite_add",
                random_timestamp(rng, favorite_on),
                "alexa" if rng.random() < customer["alexa_propensity"] else "web_public",
                f"SYN-SES-FAV-{customer['customer_key']}-{len(events) + 1}",
            )

    for order in orders:
        customer = customers_by_id[order["customer_key"]]
        checkout_session_id = f"SYN-SES-CHECKOUT-{order['order_id']}"
        for item in order["items"]:
            product = products_by_id[item["product_id"]]
            view_count = weighted_choice(rng, [1, 2, 3, 4], [0.19, 0.36, 0.29, 0.16])
            for _ in range(view_count):
                lookback = rng.randint(0, 24)
                viewed_on = max(customer["joined_at"], order["created_at"].date() - timedelta(days=lookback))
                discovery_session_id = (
                    f"SYN-SES-DISC-{order['customer_key']}-{viewed_on:%Y%m%d}-"
                    f"{rng.randrange(100000, 999999)}"
                )
                event_row(
                    events,
                    run_id,
                    order["customer_key"],
                    product,
                    "view",
                    random_timestamp(rng, viewed_on),
                    order["channel"],
                    discovery_session_id,
                )
            if rng.random() < 0.68:
                searched_on = max(customer["joined_at"], order["created_at"].date() - timedelta(days=rng.randint(0, 8)))
                search_session_id = (
                    f"SYN-SES-SEARCH-{order['customer_key']}-{searched_on:%Y%m%d}-"
                    f"{rng.randrange(100000, 999999)}"
                )
                event_row(
                    events,
                    run_id,
                    order["customer_key"],
                    product,
                    "search_click",
                    random_timestamp(rng, searched_on),
                    order["channel"],
                    search_session_id,
                )
            if rng.random() < 0.3:
                recommendation_id = f"SYN-REC-{len(events) + 1:07d}"
                recommended_on = max(customer["joined_at"], order["created_at"].date() - timedelta(days=rng.randint(0, 5)))
                recommended_at = random_timestamp(rng, recommended_on)
                recommendation_session_id = (
                    f"SYN-SES-REC-{order['customer_key']}-{recommended_on:%Y%m%d}-"
                    f"{rng.randrange(100000, 999999)}"
                )
                event_row(
                    events,
                    run_id,
                    order["customer_key"],
                    product,
                    "recommendation_impression",
                    recommended_at,
                    order["channel"],
                    recommendation_session_id,
                    recommendation_id=recommendation_id,
                )
                if rng.random() < 0.58:
                    event_row(
                        events,
                        run_id,
                        order["customer_key"],
                        product,
                        "recommendation_click",
                        recommended_at + timedelta(minutes=rng.randint(1, 90)),
                        order["channel"],
                        recommendation_session_id,
                        recommendation_id=recommendation_id,
                    )
            event_row(
                events,
                run_id,
                order["customer_key"],
                product,
                "cart_add",
                order["created_at"] - timedelta(minutes=rng.randint(2, 180)),
                order["channel"],
                checkout_session_id,
                quantity=item["quantity"],
            )
            if order["status"] == "completed":
                event_row(
                    events,
                    run_id,
                    order["customer_key"],
                    product,
                    "purchase",
                    order["created_at"],
                    order["channel"],
                    checkout_session_id,
                    order_id=order["order_id"],
                    quantity=item["quantity"],
                )
            review = reviews_by_order_product.get((order["order_id"], item["product_id"]))
            if review:
                event_row(
                    events,
                    run_id,
                    order["customer_key"],
                    product,
                    "review",
                    review["created_at"],
                    order["channel"],
                    f"SYN-SES-REVIEW-{review['review_id']}",
                    order_id=order["order_id"],
                    rating=review["rating"],
                    review_sentiment=review["sentiment"],
                    review_text=review["comment"],
                )

    for customer in customers:
        ambient_count = rng.randint(5, 18)
        for ambient_index in range(ambient_count):
            product = weighted_choice(
                rng,
                catalog,
                [
                    product_weight(customer, item, customer["activity_end"], set())
                    for item in catalog
                ],
            )
            event_on = random_date_between(
                rng, customer["joined_at"], customer["activity_end"]
            )
            event_row(
                events,
                run_id,
                customer["customer_key"],
                product,
                "view",
                random_timestamp(rng, event_on),
                "alexa" if rng.random() < customer["alexa_propensity"] else "web_public",
                f"SYN-SES-AMBIENT-{customer['customer_key']}-{ambient_index:03d}",
            )

    events.sort(key=lambda item: (item["occurred_at"], item["interaction_id"]))
    for index, event in enumerate(events, start=1):
        event["interaction_id"] = f"SYN-INT-{index:07d}"
    return events


def build_demand_rows(
    run_id: str,
    catalog: list[dict[str, Any]],
    orders: list[dict[str, Any]],
    reviews: list[dict[str, Any]],
    start: date,
    end: date,
    horizon_months: int,
) -> list[dict[str, Any]]:
    """Build one supervised-learning row per product and target month.

    The target is requested demand in the target month. Every feature is known
    before that month begins, so the row can also be constructed in production
    when its target is still unknown. Internal ``quantity`` is the synthetic
    source field later mapped to MongoDB ``items[].requestedQuantity``.
    """

    if horizon_months != 1:
        raise ValueError("La propuesta de demanda requiere horizonte de un mes")

    valid_statuses = {"pending_review", "confirmed", "completed"}
    monthly_metrics: dict[tuple[date, str], dict[str, Any]] = defaultdict(
        lambda: {
            "requested_units": 0,
            "order_ids": set(),
            "weighted_price_total": 0.0,
        }
    )
    for order in orders:
        if order["status"] not in valid_statuses:
            continue
        ordered_on = order["created_at"].date()
        if ordered_on < start or ordered_on > end:
            continue
        month_start = date(ordered_on.year, ordered_on.month, 1)
        for item in order["items"]:
            metric = monthly_metrics[(month_start, item["product_id"])]
            quantity = int(item["quantity"])
            metric["requested_units"] += quantity
            metric["order_ids"].add(order["order_id"])
            metric["weighted_price_total"] += (
                quantity * float(item["effective_unit_price"])
            )

    reviews_by_product: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for review in reviews:
        reviews_by_product[review["product_id"]].append(review)
    for product_reviews in reviews_by_product.values():
        product_reviews.sort(key=lambda item: item["created_at"])

    rows: list[dict[str, Any]] = []
    months = month_range(start, end)
    for product in catalog:
        product_id = product["product_id"]
        product_reviews = reviews_by_product.get(product_id, [])
        for month_start in months:
            metric = monthly_metrics[(month_start, product_id)]
            requested_units = int(metric["requested_units"])
            price_average = (
                round(metric["weighted_price_total"] / requested_units, 2)
                if requested_units
                else None
            )
            reviews_asof = [
                review
                for review in product_reviews
                if review["created_at"].date() < month_start
            ]
            review_count = len(reviews_asof)
            rating_average = (
                round(
                    sum(int(review["rating"]) for review in reviews_asof)
                    / review_count,
                    4,
                )
                if review_count
                else None
            )
            rows.append(
                {
                    "fecha_corte": (month_start - timedelta(days=1)).isoformat(),
                    "mes_objetivo": month_start.strftime("%Y-%m"),
                    "product_id": product_id,
                    "producto": product["name"],
                    "categoria": product["category"],
                    "rating_promedio_al_corte": rating_average,
                    "cantidad_resenas_al_corte": review_count,
                    "numero_mes": month_start.month,
                    "Y_unidades_solicitadas_mes": requested_units,
                    "generation_run_id": run_id,
                    "is_synthetic": True,
                    # Bases temporales: se eliminan antes de exportar.
                    "_pedidos_mes": len(metric["order_ids"]),
                    "_precio_promedio_mes": price_average,
                }
            )

    rows_by_product: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        rows_by_product[row["product_id"]].append(row)
    for product_rows in rows_by_product.values():
        product_rows.sort(key=lambda item: item["mes_objetivo"])
        demand_values = [
            int(row["Y_unidades_solicitadas_mes"]) for row in product_rows
        ]
        order_values = [int(row["_pedidos_mes"]) for row in product_rows]
        price_values = [row["_precio_promedio_mes"] for row in product_rows]
        for index, row in enumerate(product_rows):
            row["demanda_lag_1m"] = (
                demand_values[index - 1] if index >= 1 else None
            )
            row["demanda_lag_2m"] = (
                demand_values[index - 2] if index >= 2 else None
            )
            row["demanda_lag_3m"] = (
                demand_values[index - 3] if index >= 3 else None
            )
            row["promedio_demanda_3m"] = (
                round(statistics.mean(demand_values[index - 3 : index]), 4)
                if index >= 3
                else None
            )
            row["pedidos_lag_1m"] = order_values[index - 1] if index >= 1 else None
            row["precio_promedio_lag_1m"] = (
                price_values[index - 1] if index >= 1 else None
            )
            del row["_pedidos_mes"]
            del row["_precio_promedio_mes"]

    rows.sort(key=lambda item: (item["mes_objetivo"], item["product_id"]))
    return rows


def build_segmentation_rows(
    run_id: str,
    customers: list[dict[str, Any]],
    catalog: list[dict[str, Any]],
    orders: list[dict[str, Any]],
    favorites: dict[str, set[str]],
    reviews: list[dict[str, Any]],
    events: list[dict[str, Any]],
    snapshot_date: date,
) -> list[dict[str, Any]]:
    products_by_id = {item["product_id"]: item for item in catalog}
    orders_by_customer: dict[str, list[dict[str, Any]]] = defaultdict(list)
    reviews_by_customer: dict[str, list[dict[str, Any]]] = defaultdict(list)
    event_counts: Counter[tuple[str, str]] = Counter()
    for order in orders:
        orders_by_customer[order["customer_key"]].append(order)
    for review in reviews:
        reviews_by_customer[review["customer_key"]].append(review)
    for event in events:
        event_counts[(event["customer_key"], event["event_type"])] += 1

    rows: list[dict[str, Any]] = []
    for customer in customers:
        customer_key = customer["customer_key"]
        all_orders = orders_by_customer[customer_key]
        completed_orders = [item for item in all_orders if item["status"] == "completed"]
        completed_dates = sorted(item["created_at"].date() for item in completed_orders)
        recency_days = (snapshot_date - completed_dates[-1]).days
        monetary_value = round(sum(item["total"] for item in completed_orders), 2)
        total_units = sum(
            item["quantity"]
            for order in completed_orders
            for item in order["items"]
        )
        category_units: Counter[str] = Counter()
        product_ids: set[str] = set()
        discounted_orders = 0
        active_months: set[str] = set()
        for order in completed_orders:
            active_months.add(order["created_at"].strftime("%Y-%m"))
            if any(item["discount_pct"] > 0 for item in order["items"]):
                discounted_orders += 1
            for item in order["items"]:
                product_ids.add(item["product_id"])
                category = products_by_id[item["product_id"]]["category"]
                category_units[category] += item["quantity"]
        gaps = [
            (right - left).days
            for left, right in zip(completed_dates, completed_dates[1:])
        ]
        customer_reviews = reviews_by_customer[customer_key]
        affinity_units = category_units.copy()
        # Un set no garantiza el mismo orden entre procesos; ordenarlo evita
        # que los empates de Counter cambien la categoría preferida.
        for favorite_product_id in sorted(favorites.get(customer_key, set())):
            affinity_units[products_by_id[favorite_product_id]["category"]] += 1
        preferred_category = (
            affinity_units.most_common(1)[0][0]
            if affinity_units
            else customer["primary_category"]
        )
        denominator = max(1, total_units + len(favorites.get(customer_key, set())))
        row: dict[str, Any] = {
            "customer_key": customer_key,
            "snapshot_date": snapshot_date.isoformat(),
            "recency_days": recency_days,
            "frequency_orders": len(completed_orders),
            "monetary_value": monetary_value,
            "average_order_value": round(monetary_value / len(completed_orders), 2),
            "total_units": total_units,
            "tenure_days": (snapshot_date - customer["joined_at"]).days,
            "active_months": len(active_months),
            "average_days_between_orders": round(statistics.mean(gaps), 2) if gaps else 0.0,
            "distinct_products": len(product_ids),
            "distinct_categories": len(category_units),
            "favorite_count": len(favorites.get(customer_key, set())),
            "review_count": len(customer_reviews),
            "average_rating": round(
                statistics.mean(item["rating"] for item in customer_reviews), 3
            ) if customer_reviews else None,
            "view_count": event_counts[(customer_key, "view")],
            "cart_add_count": event_counts[(customer_key, "cart_add")],
            "recommendation_click_count": event_counts[(customer_key, "recommendation_click")],
            "discounted_order_share": round(discounted_orders / len(completed_orders), 4),
            "cancelled_order_rate": round(
                sum(item["status"] == "cancelled" for item in all_orders) / len(all_orders),
                4,
            ),
            "preferred_category": preferred_category,
            "generation_run_id": run_id,
            "is_synthetic": True,
        }
        for category in CATEGORIES:
            safe_category = category.replace("-", "_")
            row[f"share_{safe_category}"] = round(affinity_units[category] / denominator, 4)
        rows.append(row)
    return rows


RECOMMENDATION_COLUMNS = [
    "interaction_id",
    "customer_key",
    "session_id",
    "product_id",
    "product_name",
    "event_type",
    "interaction_strength",
    "occurred_at",
    "channel",
    "order_id",
    "recommendation_id",
    "quantity",
    "review_rating",
    "review_sentiment",
    "review_text",
    "category",
    "aromas",
    "benefits",
    "content_text",
    "generation_run_id",
    "is_synthetic",
]

DEMAND_COLUMNS = [
    "fecha_corte",
    "mes_objetivo",
    "product_id",
    "producto",
    "categoria",
    "demanda_lag_1m",
    "demanda_lag_2m",
    "demanda_lag_3m",
    "promedio_demanda_3m",
    "pedidos_lag_1m",
    "precio_promedio_lag_1m",
    "rating_promedio_al_corte",
    "cantidad_resenas_al_corte",
    "numero_mes",
    "Y_unidades_solicitadas_mes",
    "generation_run_id",
    "is_synthetic",
]

SEGMENTATION_COLUMNS = [
    "customer_key",
    "snapshot_date",
    "recency_days",
    "frequency_orders",
    "monetary_value",
    "average_order_value",
    "total_units",
    "tenure_days",
    "active_months",
    "average_days_between_orders",
    "distinct_products",
    "distinct_categories",
    "favorite_count",
    "review_count",
    "average_rating",
    "view_count",
    "cart_add_count",
    "recommendation_click_count",
    "discounted_order_share",
    "cancelled_order_rate",
    "preferred_category",
    "share_linea_insomnio",
    "share_linea_ansiedad_estres",
    "share_linea_verde",
    "share_linea_resfriado",
    "share_linea_estimulante",
    "generation_run_id",
    "is_synthetic",
]


def write_csv(path: Path, rows: Iterable[dict[str, Any]], columns: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def validate_generated(
    recommendation_rows: list[dict[str, Any]],
    demand_rows: list[dict[str, Any]],
    segmentation_rows: list[dict[str, Any]],
    catalog: list[dict[str, Any]],
    config: dict[str, Any],
) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    product_ids = {item["product_id"] for item in catalog}
    customer_keys = {item["customer_key"] for item in segmentation_rows}
    interaction_ids = [item["interaction_id"] for item in recommendation_rows]
    if len(interaction_ids) != len(set(interaction_ids)):
        errors.append("interaction_id contiene duplicados")
    if {item["product_id"] for item in recommendation_rows} - product_ids:
        errors.append("Recomendación contiene product_id desconocidos")
    if {item["customer_key"] for item in recommendation_rows} - customer_keys:
        errors.append("Recomendación contiene customer_key desconocidos")
    review_rows = [item for item in recommendation_rows if item["event_type"] == "review"]
    review_pairs = [(item["customer_key"], item["product_id"]) for item in review_rows]
    if len(review_pairs) != len(set(review_pairs)):
        errors.append("Hay más de una reseña por cliente-producto")
    if len({item["review_text"] for item in review_rows}) != len(review_rows):
        errors.append("Hay comentarios de reseña repetidos")
    for item in review_rows:
        rating = int(item["review_rating"])
        expected = "positive" if rating >= 4 else "mixed" if rating == 3 else "negative"
        if item["review_sentiment"] != expected:
            errors.append("Calificación y sentimiento no coinciden")
            break

    demand_months = month_range(
        date.fromisoformat(config["start_date"]),
        date.fromisoformat(config["end_date"]),
    )
    expected_demand_rows = len(demand_months) * len(catalog)
    if len(demand_rows) != expected_demand_rows:
        errors.append(
            f"Demanda debe tener {expected_demand_rows} filas y tiene {len(demand_rows)}"
        )
    demand_keys = [
        (item["mes_objetivo"], item["product_id"]) for item in demand_rows
    ]
    if len(demand_keys) != len(set(demand_keys)):
        errors.append("Demanda contiene meses-producto duplicados")
    if {item["product_id"] for item in demand_rows} != product_ids:
        errors.append("Demanda no contiene exactamente el catalogo esperado")
    if any(
        float(item["Y_unidades_solicitadas_mes"]) < 0 for item in demand_rows
    ):
        errors.append("Demanda contiene unidades negativas")
    trainable_demand_rows = sum(
        item["demanda_lag_3m"] not in {None, ""} for item in demand_rows
    )
    expected_trainable_rows = max(0, len(demand_months) - 3) * len(catalog)
    if trainable_demand_rows != expected_trainable_rows:
        errors.append(
            "Demanda debe tener "
            f"{expected_trainable_rows} filas con tres rezagos y tiene "
            f"{trainable_demand_rows}"
        )
    if len(segmentation_rows) != int(config["customer_count"]):
        errors.append("Segmentación no contiene exactamente customer_count filas")
    if len(customer_keys) != len(segmentation_rows):
        errors.append("Segmentación contiene customer_key duplicados")
    if any(int(item["frequency_orders"]) < 1 for item in segmentation_rows):
        errors.append("Hay clientes sin compra completada en RFM")

    rating_counts = Counter(int(item["review_rating"]) for item in review_rows)
    multi_event_customers = len(
        {
            item["customer_key"]
            for item in recommendation_rows
            if item["event_type"] in {"purchase", "favorite_add", "review"}
        }
    )
    nonzero_demand_rows = sum(
        int(float(item["Y_unidades_solicitadas_mes"])) > 0
        for item in demand_rows
    )
    if len(review_rows) < 250:
        warnings.append("Hay menos de 250 reseñas; revisar review_propensity")
    if nonzero_demand_rows < 200:
        warnings.append("Hay menos de 200 filas producto-mes con demanda")

    return {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "row_counts": {
            "recommendation": len(recommendation_rows),
            "demand": len(demand_rows),
            "segmentation": len(segmentation_rows),
        },
        "quality_summary": {
            "customers_with_positive_signal": multi_event_customers,
            "reviews": len(review_rows),
            "rating_distribution": dict(sorted(rating_counts.items())),
            "nonzero_product_months": nonzero_demand_rows,
            "trainable_product_months": trainable_demand_rows,
            "products": len(product_ids),
        },
    }


def generate(config: dict[str, Any], catalog: list[dict[str, Any]]) -> tuple[
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    rng = random.Random(int(config["random_seed"]))
    start = date.fromisoformat(config["start_date"])
    end = date.fromisoformat(config["end_date"])
    run_id = str(config["generation_run_id"])
    customers = build_customers(rng, int(config["customer_count"]), start, end)
    customers_by_id = {item["customer_key"]: item for item in customers}
    products_by_id = {item["product_id"]: item for item in catalog}
    orders = build_orders(
        rng,
        customers,
        catalog,
        int(config["order_count"]),
        end,
    )
    favorites = choose_favorites(rng, customers, catalog, orders)
    reviews = build_reviews(rng, customers_by_id, products_by_id, orders, end)
    recommendation_rows = build_recommendation_events(
        rng,
        run_id,
        customers,
        catalog,
        orders,
        favorites,
        reviews,
    )
    demand_rows = build_demand_rows(
        run_id,
        catalog,
        orders,
        reviews,
        start,
        end,
        int(config["target_horizon_months"]),
    )
    segmentation_rows = build_segmentation_rows(
        run_id,
        customers,
        catalog,
        orders,
        favorites,
        reviews,
        recommendation_rows,
        end,
    )
    return recommendation_rows, demand_rows, segmentation_rows


def main() -> int:
    args = parse_args()
    config = load_json(args.config.resolve())
    catalog = load_json(args.catalog.resolve())
    output_dir = (
        args.output_dir.resolve()
        if args.output_dir
        else (REPO_ROOT / config["output_directory"]).resolve()
    )
    recommendation_path = output_dir / "dataset_recomendacion_aromas.csv"
    demand_path = output_dir / "dataset_prediccion_demanda.csv"
    segmentation_path = output_dir / "dataset_segmentacion_clientes.csv"

    if args.validate_only:
        recommendation_rows = read_csv(recommendation_path)
        demand_rows = read_csv(demand_path)
        segmentation_rows = read_csv(segmentation_path)
    else:
        recommendation_rows, demand_rows, segmentation_rows = generate(config, catalog)
        write_csv(recommendation_path, recommendation_rows, RECOMMENDATION_COLUMNS)
        write_csv(demand_path, demand_rows, DEMAND_COLUMNS)
        write_csv(segmentation_path, segmentation_rows, SEGMENTATION_COLUMNS)

    report = validate_generated(
        recommendation_rows,
        demand_rows,
        segmentation_rows,
        catalog,
        config,
    )
    report_path = output_dir / "validation-report.json"
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
