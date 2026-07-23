from __future__ import annotations

import json
import sys
from datetime import timedelta, timezone
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from generate_synthetic_datasets import (
    CATEGORIES,
    DEMAND_COLUMNS,
    INCOMPATIBLE_INHALER_REVIEW_TERMS,
    RECOMMENDATION_COLUMNS,
    SEGMENTATION_COLUMNS,
)


REPO_ROOT = Path(__file__).resolve().parents[2]
EXPORT_DIR = REPO_ROOT / "ml" / "exports"


@dataclass
class CheckResult:
    dataset: str
    check: str
    severity: str
    passed: bool
    observed: str
    expected: str


def clean_observed(value: Any) -> str:
    if isinstance(value, (float, np.floating)):
        return f"{float(value):.6g}"
    return str(value)


def add_check(
    results: list[CheckResult],
    dataset: str,
    check: str,
    severity: str,
    passed: bool,
    observed: Any,
    expected: Any,
) -> None:
    results.append(
        CheckResult(
            dataset=dataset,
            check=check,
            severity=severity,
            passed=bool(passed),
            observed=clean_observed(observed),
            expected=clean_observed(expected),
        )
    )


def load_datasets() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    recommendation = pd.read_csv(
        EXPORT_DIR / "dataset_recomendacion_aromas.csv",
        encoding="utf-8-sig",
        dtype={
            "interaction_id": "string",
            "customer_key": "string",
            "session_id": "string",
            "product_id": "string",
            "order_id": "string",
            "recommendation_id": "string",
        },
    )
    demand = pd.read_csv(
        EXPORT_DIR / "dataset_prediccion_demanda.csv",
        encoding="utf-8-sig",
        dtype={"product_id": "string"},
    )
    segmentation = pd.read_csv(
        EXPORT_DIR / "dataset_segmentacion_clientes.csv",
        encoding="utf-8-sig",
        dtype={"customer_key": "string"},
    )
    recommendation["occurred_at"] = pd.to_datetime(
        recommendation["occurred_at"], utc=True, errors="coerce"
    )
    demand["fecha_corte"] = pd.to_datetime(
        demand["fecha_corte"], errors="coerce"
    )
    demand["mes_objetivo"] = pd.to_datetime(
        demand["mes_objetivo"], format="%Y-%m", errors="coerce"
    )
    segmentation["snapshot_date"] = pd.to_datetime(
        segmentation["snapshot_date"], errors="coerce"
    )
    return recommendation, demand, segmentation


def check_contract(
    results: list[CheckResult],
    dataset: str,
    frame: pd.DataFrame,
    expected_columns: list[str],
) -> None:
    actual = list(frame.columns)
    add_check(
        results,
        dataset,
        "columnas_exactas",
        "ERROR",
        actual == expected_columns,
        actual,
        expected_columns,
    )
    add_check(
        results,
        dataset,
        "sin_filas_duplicadas",
        "ERROR",
        not frame.duplicated().any(),
        int(frame.duplicated().sum()),
        0,
    )


def validate_recommendation(
    results: list[CheckResult], frame: pd.DataFrame
) -> None:
    dataset = "recomendacion"
    add_check(results, dataset, "volumen", "WARNING", 12000 <= len(frame) <= 30000, len(frame), "12000..30000")
    add_check(results, dataset, "interaction_id_unico", "ERROR", frame["interaction_id"].is_unique, frame["interaction_id"].nunique(), len(frame))
    add_check(results, dataset, "fechas_validas", "ERROR", frame["occurred_at"].notna().all(), int(frame["occurred_at"].isna().sum()), 0)
    add_check(results, dataset, "cubre_16_productos", "ERROR", frame["product_id"].nunique() == 16, frame["product_id"].nunique(), 16)
    add_check(results, dataset, "cubre_300_clientes", "ERROR", frame["customer_key"].nunique() == 300, frame["customer_key"].nunique(), 300)
    add_check(results, dataset, "categorias_validas", "ERROR", set(frame["category"].dropna()).issubset(CATEGORIES), sorted(frame["category"].dropna().unique()), CATEGORIES)

    mapping_variation = frame.groupby("product_id")[["product_name", "category", "aromas", "benefits", "content_text"]].nunique(dropna=False).max().max()
    add_check(results, dataset, "metadatos_producto_estables", "ERROR", mapping_variation == 1, mapping_variation, 1)

    reviews = frame.loc[frame["event_type"].eq("review")].copy()
    purchases = frame.loc[frame["event_type"].eq("purchase")].copy()
    ratings = pd.to_numeric(reviews["review_rating"], errors="coerce")
    add_check(results, dataset, "rating_1_a_5", "ERROR", ratings.between(1, 5).all(), f"{ratings.min()}..{ratings.max()}", "1..5")
    expected_sentiment = np.select(
        [ratings.ge(4), ratings.eq(3)], ["positive", "mixed"], default="negative"
    )
    add_check(results, dataset, "rating_sentimiento_coherente", "ERROR", np.array_equal(expected_sentiment, reviews["review_sentiment"].to_numpy()), int((expected_sentiment != reviews["review_sentiment"].to_numpy()).sum()), 0)
    add_check(results, dataset, "una_resena_cliente_producto", "ERROR", not reviews.duplicated(["customer_key", "product_id"]).any(), int(reviews.duplicated(["customer_key", "product_id"]).sum()), 0)
    add_check(results, dataset, "comentarios_unicos", "ERROR", reviews["review_text"].is_unique, reviews["review_text"].nunique(), len(reviews))
    add_check(results, dataset, "longitud_comentario", "ERROR", reviews["review_text"].str.len().between(35, 700).all(), f"{reviews['review_text'].str.len().min()}..{reviews['review_text'].str.len().max()}", "35..700")
    incompatible_pattern = "|".join(
        map(lambda value: value.replace(" ", r"\s+"), INCOMPATIBLE_INHALER_REVIEW_TERMS)
    )
    incompatible_reviews = reviews["review_text"].str.contains(
        incompatible_pattern, case=False, regex=True, na=False
    )
    add_check(
        results,
        dataset,
        "resenas_coherentes_con_inhalador_personal",
        "ERROR",
        not incompatible_reviews.any(),
        int(incompatible_reviews.sum()),
        0,
    )

    purchase_lookup = purchases.set_index(["customer_key", "product_id", "order_id"])["occurred_at"]
    review_keys = pd.MultiIndex.from_frame(reviews[["customer_key", "product_id", "order_id"]])
    purchase_dates = purchase_lookup.reindex(review_keys).reset_index(drop=True)
    linked_reviews = purchase_dates.notna()
    review_after_purchase = linked_reviews & (reviews["occurred_at"].reset_index(drop=True) > purchase_dates)
    add_check(results, dataset, "resena_tiene_compra_previa", "ERROR", linked_reviews.all() and review_after_purchase.all(), int((~review_after_purchase).sum()), 0)

    non_purchase_with_order = frame["order_id"].notna() & ~frame["event_type"].isin(["purchase", "review"])
    add_check(results, dataset, "sin_order_id_futuro_en_eventos", "ERROR", not non_purchase_with_order.any(), int(non_purchase_with_order.sum()), 0)

    impressions = frame.loc[frame["event_type"].eq("recommendation_impression"), ["customer_key", "product_id", "session_id", "recommendation_id", "occurred_at"]].rename(columns={"occurred_at": "impression_at"})
    clicks = frame.loc[frame["event_type"].eq("recommendation_click"), ["customer_key", "product_id", "session_id", "recommendation_id", "occurred_at"]].rename(columns={"occurred_at": "click_at"})
    linked_clicks = clicks.merge(impressions, on=["customer_key", "product_id", "session_id", "recommendation_id"], how="left")
    valid_clicks = linked_clicks["impression_at"].notna() & (linked_clicks["click_at"] >= linked_clicks["impression_at"])
    add_check(results, dataset, "click_tiene_impresion_previa", "ERROR", valid_clicks.all(), int((~valid_clicks).sum()), 0)

    purchase_quantities = pd.to_numeric(purchases["quantity"], errors="coerce")
    add_check(results, dataset, "cantidad_compra_valida", "ERROR", purchase_quantities.between(1, 25).all(), f"{purchase_quantities.min()}..{purchase_quantities.max()}", "1..25")
    high_ratings_share = ratings.ge(4).mean()
    add_check(results, dataset, "mayoria_positiva_realista", "WARNING", 0.75 <= high_ratings_share <= 0.90, high_ratings_share, "0.75..0.90")
    add_check(results, dataset, "rating_promedio_realista", "WARNING", 4.1 <= ratings.mean() <= 4.5, ratings.mean(), "4.1..4.5")
    basket_sizes = purchases.groupby("order_id")["product_id"].nunique()
    multi_share = basket_sizes.ge(2).mean()
    add_check(results, dataset, "canastas_multiproducto", "WARNING", 0.35 <= multi_share <= 0.60, multi_share, "0.35..0.60")


def validate_demand(results: list[CheckResult], frame: pd.DataFrame) -> None:
    """Validate the monthly, leakage-safe demand contract."""

    dataset = "demanda"
    expected_rows = 16 * 18
    add_check(
        results, dataset, "filas_producto_mes", "ERROR",
        len(frame) == expected_rows, len(frame), expected_rows,
    )
    valid_dates = frame[["fecha_corte", "mes_objetivo"]].notna().all().all()
    add_check(
        results, dataset, "fechas_validas", "ERROR",
        valid_dates, valid_dates, True,
    )
    duplicated = frame.duplicated(["mes_objetivo", "product_id"])
    add_check(
        results, dataset, "clave_mes_producto_unica", "ERROR",
        not duplicated.any(), int(duplicated.sum()), 0,
    )
    products_per_month = frame.groupby("mes_objetivo")["product_id"].nunique()
    add_check(
        results, dataset, "16_productos_cada_mes", "ERROR",
        products_per_month.eq(16).all(),
        f"{products_per_month.min()}..{products_per_month.max()}", 16,
    )
    months_per_product = frame.groupby("product_id")["mes_objetivo"].nunique()
    add_check(
        results, dataset, "18_meses_cada_producto", "ERROR",
        months_per_product.eq(18).all(),
        f"{months_per_product.min()}..{months_per_product.max()}", 18,
    )
    expected_period = (
        frame["mes_objetivo"].min() == pd.Timestamp("2025-01-01")
        and frame["mes_objetivo"].max() == pd.Timestamp("2026-06-01")
    )
    add_check(
        results, dataset, "periodo_mensual_completo", "ERROR",
        expected_period,
        f"{frame['mes_objetivo'].min().date()}..{frame['mes_objetivo'].max().date()}",
        "2025-01..2026-06",
    )
    expected_cutoff = frame["mes_objetivo"] - pd.Timedelta(days=1)
    cutoff_ok = frame["fecha_corte"].eq(expected_cutoff).all()
    add_check(
        results, dataset, "corte_antes_del_mes_objetivo", "ERROR",
        cutoff_ok, int((frame["fecha_corte"] != expected_cutoff).sum()), 0,
    )
    expected_month_number = frame["mes_objetivo"].dt.month
    month_number_ok = frame["numero_mes"].eq(expected_month_number).all()
    add_check(
        results, dataset, "numero_mes_correcto", "ERROR",
        month_number_ok,
        int((frame["numero_mes"] != expected_month_number).sum()), 0,
    )
    valid_categories = set(frame["categoria"].dropna()).issubset(CATEGORIES)
    add_check(
        results, dataset, "categorias_validas", "ERROR",
        valid_categories, sorted(frame["categoria"].dropna().unique()), CATEGORIES,
    )
    stable_mapping = (
        frame.groupby("product_id")[["producto", "categoria"]]
        .nunique(dropna=False).max().max() == 1
    )
    add_check(
        results, dataset, "metadatos_producto_estables", "ERROR",
        stable_mapping, stable_mapping, True,
    )

    nonnegative_columns = [
        "demanda_lag_1m", "demanda_lag_2m", "demanda_lag_3m",
        "promedio_demanda_3m", "pedidos_lag_1m",
        "precio_promedio_lag_1m", "cantidad_resenas_al_corte",
        "Y_unidades_solicitadas_mes",
    ]
    negative_count = int((frame[nonnegative_columns] < 0).sum().sum())
    add_check(
        results, dataset, "numericos_no_negativos", "ERROR",
        negative_count == 0, negative_count, 0,
    )
    integer_columns = [
        "demanda_lag_1m", "demanda_lag_2m", "demanda_lag_3m",
        "pedidos_lag_1m", "cantidad_resenas_al_corte", "numero_mes",
        "Y_unidades_solicitadas_mes",
    ]
    integer_ok = all(
        np.isclose(frame[column].dropna(), frame[column].dropna().round()).all()
        for column in integer_columns
    )
    add_check(
        results, dataset, "conteos_enteros", "ERROR",
        integer_ok, integer_ok, True,
    )

    ordered = frame.sort_values(["product_id", "mes_objetivo"]).copy()
    target_column = "Y_unidades_solicitadas_mes"
    for lag in [1, 2, 3]:
        expected = ordered.groupby("product_id")[target_column].shift(lag)
        actual = ordered[f"demanda_lag_{lag}m"]
        comparison = np.isclose(
            actual.fillna(-9999), expected.fillna(-9999), atol=1e-4
        )
        add_check(
            results, dataset, f"lag_{lag}m_solo_pasado", "ERROR",
            comparison.all(), int((~comparison).sum()), 0,
        )
    expected_average = (
        ordered[["demanda_lag_1m", "demanda_lag_2m", "demanda_lag_3m"]]
        .sum(axis=1, min_count=3).div(3)
    )
    average_comparison = np.isclose(
        ordered["promedio_demanda_3m"].fillna(-9999),
        expected_average.fillna(-9999), atol=1e-4,
    )
    add_check(
        results, dataset, "promedio_3m_solo_pasado", "ERROR",
        average_comparison.all(), int((~average_comparison).sum()), 0,
    )
    trainable = ordered[
        ["demanda_lag_1m", "demanda_lag_2m", "demanda_lag_3m"]
    ].notna().all(axis=1)
    add_check(
        results, dataset, "240_filas_con_tres_rezagos", "ERROR",
        int(trainable.sum()) == 240, int(trainable.sum()), 240,
    )

    previous_known = ordered["demanda_lag_1m"].notna()
    previous_zero = ordered["demanda_lag_1m"].eq(0)
    previous_positive = ordered["demanda_lag_1m"].gt(0)
    first_month_context_empty = ordered.loc[
        ~previous_known, ["pedidos_lag_1m", "precio_promedio_lag_1m"]
    ].isna().all().all()
    price_and_orders_ok = (
        first_month_context_empty
        and ordered.loc[previous_zero, "pedidos_lag_1m"].eq(0).all()
        and ordered.loc[previous_zero, "precio_promedio_lag_1m"].isna().all()
        and ordered.loc[previous_positive, "pedidos_lag_1m"].gt(0).all()
        and (
            ordered.loc[previous_positive, "pedidos_lag_1m"]
            <= ordered.loc[previous_positive, "demanda_lag_1m"]
        ).all()
        and ordered.loc[
            previous_positive, "precio_promedio_lag_1m"
        ].gt(0).all()
    )
    add_check(
        results, dataset, "precio_y_pedidos_corresponden_a_m_1", "ERROR",
        price_and_orders_ok, price_and_orders_ok, True,
    )

    review_count_monotonic = (
        ordered.groupby("product_id")["cantidad_resenas_al_corte"]
        .diff().fillna(ordered["cantidad_resenas_al_corte"]).ge(0).all()
    )
    rating_valid = (
        (
            ordered["cantidad_resenas_al_corte"].eq(0)
            & ordered["rating_promedio_al_corte"].isna()
        )
        | (
            ordered["cantidad_resenas_al_corte"].gt(0)
            & ordered["rating_promedio_al_corte"].between(1, 5)
        )
    ).all()
    add_check(
        results, dataset, "conteo_resenas_acumulado", "ERROR",
        review_count_monotonic, review_count_monotonic, True,
    )
    add_check(
        results, dataset, "rating_al_corte_valido", "ERROR",
        rating_valid, rating_valid, True,
    )
    metadata_ok = (
        frame["generation_run_id"].nunique() == 1
        and frame["is_synthetic"].eq(True).all()
    )
    add_check(
        results, dataset, "metadatos_sinteticos", "ERROR", metadata_ok,
        {
            "runs": int(frame["generation_run_id"].nunique()),
            "synthetic": bool(frame["is_synthetic"].eq(True).all()),
        },
        {"runs": 1, "synthetic": True},
    )

    example = frame.loc[
        frame["product_id"].eq("SYN-PROD-006")
        & frame["mes_objetivo"].eq(pd.Timestamp("2026-06-01"))
    ]
    example_ok = len(example) == 1
    if example_ok:
        row = example.iloc[0]
        example_ok = (
            row["producto"] == "Lavanda"
            and row["categoria"] == "linea-insomnio"
            and row["fecha_corte"] == pd.Timestamp("2026-05-31")
            and row["demanda_lag_1m"] == 46
            and row["demanda_lag_2m"] == 51
            and row["demanda_lag_3m"] == 55
            and np.isclose(row["promedio_demanda_3m"], 50.6667, atol=1e-4)
            and row["pedidos_lag_1m"] == 38
            and np.isclose(row["precio_promedio_lag_1m"], 56.48, atol=1e-4)
            and np.isclose(row["rating_promedio_al_corte"], 4.2903, atol=1e-4)
            and row["cantidad_resenas_al_corte"] == 31
            and row["numero_mes"] == 6
            and row[target_column] == 55
        )
    add_check(
        results, dataset, "ejemplo_lavanda_junio_verificado", "ERROR",
        example_ok,
        example.iloc[0].to_dict() if len(example) == 1 else len(example),
        "46/51/55; prom=50.6667; pedidos=38; precio=56.48; "
        "rating=4.2903/31; Y=55",
    )

    nonzero_months = frame.groupby("product_id")[target_column].apply(
        lambda values: values.gt(0).sum()
    )
    add_check(
        results, dataset, "historia_mensual_por_producto", "WARNING",
        nonzero_months.ge(12).all(), int(nonzero_months.min()),
        ">=12 meses con demanda",
    )


def validate_segmentation(
    results: list[CheckResult],
    frame: pd.DataFrame,
    recommendation: pd.DataFrame,
) -> None:
    dataset = "segmentacion"
    add_check(results, dataset, "300_clientes", "ERROR", len(frame) == 300, len(frame), 300)
    add_check(results, dataset, "customer_key_unico", "ERROR", frame["customer_key"].is_unique, frame["customer_key"].nunique(), len(frame))
    add_check(results, dataset, "frecuencia_positiva", "ERROR", frame["frequency_orders"].ge(1).all(), frame["frequency_orders"].min(), ">=1")
    add_check(results, dataset, "monto_positivo", "ERROR", frame["monetary_value"].gt(0).all(), frame["monetary_value"].min(), ">0")
    add_check(results, dataset, "recencia_no_supera_antiguedad", "ERROR", frame["recency_days"].le(frame["tenure_days"]).all(), int((frame["recency_days"] > frame["tenure_days"]).sum()), 0)
    add_check(results, dataset, "productos_no_superan_unidades", "ERROR", frame["distinct_products"].le(frame["total_units"]).all(), int((frame["distinct_products"] > frame["total_units"]).sum()), 0)
    add_check(results, dataset, "favoritos_0_a_16", "ERROR", frame["favorite_count"].between(0, 16).all(), f"{frame['favorite_count'].min()}..{frame['favorite_count'].max()}", "0..16")
    rating_ok = frame["average_rating"].isna() | frame["average_rating"].between(1, 5)
    add_check(results, dataset, "rating_medio_valido", "ERROR", rating_ok.all(), int((~rating_ok).sum()), 0)

    share_columns = [f"share_{category.replace('-', '_')}" for category in CATEGORIES]
    shares_in_range = frame[share_columns].ge(0).all().all() and frame[share_columns].le(1).all().all()
    share_sums = frame[share_columns].sum(axis=1)
    add_check(results, dataset, "afinidades_0_a_1", "ERROR", shares_in_range, f"{frame[share_columns].min().min()}..{frame[share_columns].max().max()}", "0..1")
    add_check(results, dataset, "afinidades_suman_1", "ERROR", np.isclose(share_sums, 1, atol=5e-4).all(), f"{share_sums.min()}..{share_sums.max()}", "1 ± 0.0005")

    forbidden = {"customer_name", "email", "phone", "address", "street", "postal_code"}
    leaked_columns = sorted(forbidden.intersection(frame.columns))
    add_check(results, dataset, "sin_pii", "ERROR", not leaked_columns, leaked_columns, "ninguna columna PII")
    rec_customers = set(recommendation["customer_key"])
    add_check(results, dataset, "clientes_existen_en_interacciones", "ERROR", set(frame["customer_key"]).issubset(rec_customers), len(set(frame["customer_key"]) - rec_customers), 0)
    purchases = recommendation.loc[recommendation["event_type"].eq("purchase")]
    purchase_frequency = purchases.groupby("customer_key")["order_id"].nunique()
    expected_frequency = frame["customer_key"].map(purchase_frequency).fillna(0).astype(int)
    add_check(results, dataset, "frecuencia_coincide_con_compras", "ERROR", np.array_equal(frame["frequency_orders"].to_numpy(), expected_frequency.to_numpy()), int((frame["frequency_orders"] != expected_frequency).sum()), 0)
    add_check(results, dataset, "variacion_rfm", "WARNING", all(frame[column].nunique() >= 10 for column in ["recency_days", "frequency_orders", "monetary_value"]), {column: int(frame[column].nunique()) for column in ["recency_days", "frequency_orders", "monetary_value"]}, ">=10 valores distintos")


def validate_cross_dataset(
    results: list[CheckResult],
    recommendation: pd.DataFrame,
    demand: pd.DataFrame,
) -> None:
    rec_products = set(recommendation["product_id"])
    demand_products = set(demand["product_id"])
    add_check(results, "cruzado", "mismos_productos", "ERROR", rec_products == demand_products, len(rec_products.symmetric_difference(demand_products)), 0)
    rec_mapping = (
        recommendation[["product_id", "product_name", "category"]]
        .drop_duplicates()
        .rename(columns={"product_name": "producto", "category": "categoria"})
        .sort_values("product_id")
        .reset_index(drop=True)
    )
    demand_mapping = (
        demand[["product_id", "producto", "categoria"]]
        .drop_duplicates()
        .sort_values("product_id")
        .reset_index(drop=True)
    )
    add_check(results, "cruzado", "nombre_categoria_consistentes", "ERROR", rec_mapping.equals(demand_mapping), not rec_mapping.equals(demand_mapping), False)

    reviews = recommendation.loc[
        recommendation["event_type"].eq("review"),
        ["product_id", "occurred_at", "review_rating"],
    ].copy()
    mexico_offset = timezone(timedelta(hours=-6))
    reviews["occurred_local"] = (
        reviews["occurred_at"].dt.tz_convert(mexico_offset).dt.tz_localize(None)
    )
    expected_counts: list[int] = []
    expected_ratings: list[float] = []
    for row in demand.itertuples(index=False):
        available = reviews.loc[
            reviews["product_id"].eq(row.product_id)
            & reviews["occurred_local"].lt(row.mes_objetivo)
        ]
        expected_counts.append(len(available))
        expected_ratings.append(
            float(available["review_rating"].mean()) if len(available) else np.nan
        )
    count_comparison = demand["cantidad_resenas_al_corte"].eq(expected_counts)
    add_check(
        results,
        "cruzado",
        "resenas_al_corte_coinciden",
        "ERROR",
        count_comparison.all(),
        int((~count_comparison).sum()),
        0,
    )
    rating_comparison = np.isclose(
        demand["rating_promedio_al_corte"].fillna(-9999),
        pd.Series(expected_ratings, index=demand.index).fillna(-9999),
        atol=1e-4,
    )
    add_check(
        results,
        "cruzado",
        "rating_al_corte_coincide",
        "ERROR",
        rating_comparison.all(),
        int((~rating_comparison).sum()),
        0,
    )


def main() -> int:
    recommendation, demand, segmentation = load_datasets()
    results: list[CheckResult] = []
    check_contract(results, "recomendacion", recommendation, RECOMMENDATION_COLUMNS)
    check_contract(results, "demanda", demand, DEMAND_COLUMNS)
    check_contract(results, "segmentacion", segmentation, SEGMENTATION_COLUMNS)
    validate_recommendation(results, recommendation)
    validate_demand(results, demand)
    validate_segmentation(results, segmentation, recommendation)
    validate_cross_dataset(results, recommendation, demand)

    report = pd.DataFrame(asdict(item) for item in results)
    report.to_csv(EXPORT_DIR / "quality-report.csv", index=False, encoding="utf-8-sig")
    errors = report.loc[(report["severity"] == "ERROR") & (~report["passed"])]
    warnings = report.loc[(report["severity"] == "WARNING") & (~report["passed"])]
    summary = {
        "approved": errors.empty,
        "checks": int(len(report)),
        "passed": int(report["passed"].sum()),
        "failed_errors": int(len(errors)),
        "failed_warnings": int(len(warnings)),
        "row_counts": {
            "recommendation": int(len(recommendation)),
            "demand": int(len(demand)),
            "segmentation": int(len(segmentation)),
        },
    }
    (EXPORT_DIR / "quality-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if not errors.empty:
        print("\nErrores críticos:")
        print(errors[["dataset", "check", "observed", "expected"]].to_string(index=False))
    if not warnings.empty:
        print("\nAdvertencias:")
        print(warnings[["dataset", "check", "observed", "expected"]].to_string(index=False))
    return 0 if errors.empty else 1


if __name__ == "__main__":
    sys.exit(main())
