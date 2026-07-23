from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATASET = (
    REPO_ROOT / "ml" / "exports" / "dataset_prediccion_demanda.csv"
)
DEFAULT_OPERATIONAL_SEED = (
    REPO_ROOT / "ml" / "exports" / "operational-seed.json"
)
DEFAULT_INFERENCE_OUTPUT = (
    REPO_ROOT / "ml" / "exports" / "dataset_demanda_inferencia.csv"
)
DEFAULT_JSON_OUTPUT = (
    REPO_ROOT / "ml" / "artifacts" / "monthly-demand-forecast.v1.json"
)
DEFAULT_JOBLIB_OUTPUT = (
    REPO_ROOT / "ml" / "artifacts" / "monthly-demand-ridge.v1.joblib"
)
DEFAULT_TS_OUTPUT = (
    REPO_ROOT
    / "Server"
    / "src"
    / "modules"
    / "intelligence"
    / "artifacts"
    / "monthly-demand.generated.ts"
)

TARGET = "Y_unidades_solicitadas_mes"
CATEGORICAL_FEATURES = ["product_id", "categoria"]
NUMERIC_FEATURES = [
    "demanda_lag_1m",
    "demanda_lag_2m",
    "demanda_lag_3m",
    "promedio_demanda_3m",
    "pedidos_lag_1m",
    "precio_promedio_lag_1m",
    "rating_promedio_al_corte",
    "cantidad_resenas_al_corte",
    "numero_mes",
]
MODEL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES
INFERENCE_COLUMNS = [
    "fecha_corte",
    "mes_objetivo",
    "product_id",
    "producto",
    "categoria",
    *NUMERIC_FEATURES,
    "generation_run_id",
    "is_synthetic",
]
VALID_ORDER_STATUSES = {"pending_review", "confirmed", "completed"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Entrena la regresión Ridge global y genera el pronóstico mensual "
            "por producto para INHALEX."
        )
    )
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument(
        "--operational-seed", type=Path, default=DEFAULT_OPERATIONAL_SEED
    )
    parser.add_argument(
        "--inference-output", type=Path, default=DEFAULT_INFERENCE_OUTPUT
    )
    parser.add_argument("--json-output", type=Path, default=DEFAULT_JSON_OUTPUT)
    parser.add_argument("--joblib-output", type=Path, default=DEFAULT_JOBLIB_OUTPUT)
    parser.add_argument("--ts-output", type=Path, default=DEFAULT_TS_OUTPUT)
    parser.add_argument("--alpha", type=float, default=50.0)
    parser.add_argument("--validation-months", type=int, default=3)
    parser.add_argument("--interval-quantile", type=float, default=0.90)
    parser.add_argument("--version", default="1.0.0")
    parser.add_argument("--skip-joblib", action="store_true")
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


def load_historical(path: Path) -> pd.DataFrame:
    frame = pd.read_csv(
        path,
        encoding="utf-8-sig",
        dtype={"product_id": "string"},
    )
    required = {
        "fecha_corte",
        "mes_objetivo",
        "product_id",
        "producto",
        "categoria",
        *MODEL_FEATURES,
        TARGET,
        "generation_run_id",
        "is_synthetic",
    }
    missing = sorted(required - set(frame.columns))
    if missing:
        raise ValueError(f"Faltan columnas en demanda histórica: {missing}")
    frame["fecha_corte"] = pd.to_datetime(frame["fecha_corte"], errors="coerce")
    frame["mes_objetivo"] = pd.to_datetime(
        frame["mes_objetivo"], format="%Y-%m", errors="coerce"
    )
    if frame[["fecha_corte", "mes_objetivo"]].isna().any().any():
        raise ValueError("La demanda histórica contiene fechas inválidas")
    if frame.duplicated(["product_id", "mes_objetivo"]).any():
        raise ValueError("Existe más de una fila por producto y mes")
    if (frame["fecha_corte"] >= frame["mes_objetivo"]).any():
        raise ValueError("fecha_corte debe ser anterior al mes objetivo")
    if frame["generation_run_id"].nunique() != 1:
        raise ValueError("La demanda histórica mezcla corridas sintéticas")
    return frame.sort_values(["mes_objetivo", "product_id"]).reset_index(drop=True)


def load_operational_seed(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    required = {"metadata", "catalog", "orders", "reviews"}
    if not required.issubset(payload):
        raise ValueError(
            f"El operational seed no contiene {sorted(required - set(payload))}"
        )
    return payload


def build_future_rows(
    historical: pd.DataFrame,
    seed: dict[str, Any],
) -> pd.DataFrame:
    last_month = historical["mes_objetivo"].max()
    target_month = last_month + pd.offsets.MonthBegin(1)
    cutoff = target_month - pd.Timedelta(days=1)
    previous_month = target_month - pd.offsets.MonthBegin(1)
    run_id = str(historical["generation_run_id"].iloc[0])

    seed_run_id = str(seed.get("metadata", {}).get("generation_run_id", run_id))
    if seed_run_id != run_id:
        raise ValueError(
            "El operational seed y la demanda histórica pertenecen a corridas distintas"
        )

    catalog_by_id = {
        str(item["product_id"]): item for item in seed["catalog"]
    }
    if set(historical["product_id"].astype(str)) != set(catalog_by_id):
        raise ValueError("El catálogo del seed no coincide con los 16 productos históricos")

    monthly_metrics: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "requested_units": 0,
            "orders": set(),
            "weighted_price_total": 0.0,
        }
    )
    for order in seed["orders"]:
        if str(order.get("status")) not in VALID_ORDER_STATUSES:
            continue
        created_at = pd.Timestamp(order["created_at"])
        if created_at.tzinfo is not None:
            # Conservamos el mes calendario de México escrito en el seed. Una
            # conversión a UTC movería pedidos nocturnos del último día al mes
            # siguiente y rompería la identidad con el dataset mensual.
            created_at = created_at.tz_localize(None)
        if created_at.to_period("M") != previous_month.to_period("M"):
            continue
        for item in order["items"]:
            product_id = str(item["product_id"])
            quantity = int(item["quantity"])
            metric = monthly_metrics[product_id]
            metric["requested_units"] += quantity
            metric["orders"].add(str(order["order_id"]))
            metric["weighted_price_total"] += (
                quantity * float(item["effective_unit_price"])
            )

    review_metrics: dict[str, list[int]] = defaultdict(list)
    for review in seed["reviews"]:
        created_at = pd.Timestamp(review["created_at"])
        if created_at.tzinfo is not None:
            created_at = created_at.tz_localize(None)
        if created_at < target_month:
            review_metrics[str(review["product_id"])].append(int(review["rating"]))

    latest_actual = historical.loc[
        historical["mes_objetivo"].eq(previous_month)
    ].set_index("product_id")[TARGET]
    for product_id, metric in monthly_metrics.items():
        if int(latest_actual.loc[product_id]) != int(metric["requested_units"]):
            raise ValueError(
                f"La demanda de {product_id} en {previous_month:%Y-%m} "
                "no coincide entre CSV y operational seed"
            )

    rows: list[dict[str, Any]] = []
    for product_id, product_history in historical.groupby("product_id"):
        product_history = product_history.sort_values("mes_objetivo")
        if len(product_history) < 3:
            raise ValueError(f"{product_id} no tiene tres meses de historia")
        last_three = product_history.tail(3)
        demand_values = last_three[TARGET].astype(int).tolist()
        lag_3, lag_2, lag_1 = demand_values
        metric = monthly_metrics[str(product_id)]
        requested_units = int(metric["requested_units"])
        if lag_1 != requested_units:
            raise ValueError(f"El rezago M-1 no coincide para {product_id}")
        average_price = (
            round(metric["weighted_price_total"] / requested_units, 2)
            if requested_units
            else None
        )
        ratings = review_metrics.get(str(product_id), [])
        row_reference = product_history.iloc[-1]
        rows.append(
            {
                "fecha_corte": cutoff.strftime("%Y-%m-%d"),
                "mes_objetivo": target_month.strftime("%Y-%m"),
                "product_id": str(product_id),
                "producto": str(row_reference["producto"]),
                "categoria": str(row_reference["categoria"]),
                "demanda_lag_1m": lag_1,
                "demanda_lag_2m": lag_2,
                "demanda_lag_3m": lag_3,
                "promedio_demanda_3m": round(
                    float(np.mean([lag_1, lag_2, lag_3])), 4
                ),
                "pedidos_lag_1m": len(metric["orders"]),
                "precio_promedio_lag_1m": average_price,
                "rating_promedio_al_corte": (
                    round(float(np.mean(ratings)), 4) if ratings else None
                ),
                "cantidad_resenas_al_corte": len(ratings),
                "numero_mes": int(target_month.month),
                "generation_run_id": run_id,
                "is_synthetic": True,
            }
        )
    frame = pd.DataFrame(rows, columns=INFERENCE_COLUMNS)
    validate_future_rows(frame, historical, target_month)
    return frame


def validate_future_rows(
    future: pd.DataFrame,
    historical: pd.DataFrame,
    target_month: pd.Timestamp,
) -> None:
    if list(future.columns) != INFERENCE_COLUMNS:
        raise ValueError("El contrato de inferencia no tiene las columnas esperadas")
    if len(future) != historical["product_id"].nunique():
        raise ValueError("Debe existir una fila futura por producto")
    if not future["product_id"].is_unique:
        raise ValueError("Las filas futuras contienen productos duplicados")
    if set(future["product_id"]) != set(historical["product_id"]):
        raise ValueError("Las filas futuras no cubren exactamente el catálogo")
    if future["mes_objetivo"].nunique() != 1:
        raise ValueError("Todas las filas futuras deben compartir mes objetivo")
    if future["mes_objetivo"].iloc[0] != target_month.strftime("%Y-%m"):
        raise ValueError("El mes objetivo futuro no es el siguiente mes calendario")
    if future[["demanda_lag_1m", "demanda_lag_2m", "demanda_lag_3m"]].isna().any().any():
        raise ValueError("Las filas futuras requieren tres rezagos completos")


def create_pipeline(alpha: float) -> Pipeline:
    numeric_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(strategy="median", add_indicator=True),
            ),
            ("scaler", StandardScaler()),
        ]
    )
    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", numeric_pipeline, NUMERIC_FEATURES),
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CATEGORICAL_FEATURES,
            ),
        ]
    )
    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("regressor", Ridge(alpha=alpha)),
        ]
    )


def evaluate_model(
    historical: pd.DataFrame,
    alpha: float,
    validation_months: int,
    interval_quantile: float,
) -> tuple[dict[str, Any], float, int, int]:
    trainable = historical.loc[
        historical[
            ["demanda_lag_1m", "demanda_lag_2m", "demanda_lag_3m"]
        ]
        .notna()
        .all(axis=1)
    ].copy()
    months = sorted(trainable["mes_objetivo"].unique())
    if validation_months < 1 or validation_months >= len(months):
        raise ValueError("validation_months no deja suficientes meses para entrenar")
    validation_start = months[-validation_months]
    train = trainable.loc[trainable["mes_objetivo"] < validation_start]
    validation = trainable.loc[trainable["mes_objetivo"] >= validation_start]
    if train.empty or validation.empty:
        raise ValueError("La división cronológica dejó train o validación vacío")

    pipeline = create_pipeline(alpha)
    pipeline.fit(train[MODEL_FEATURES], train[TARGET])
    raw_predictions = pipeline.predict(validation[MODEL_FEATURES])
    predictions = np.clip(raw_predictions, 0, None)
    baseline = validation["promedio_demanda_3m"].to_numpy()
    residuals = validation[TARGET].to_numpy() - predictions
    absolute_radius = float(np.quantile(np.abs(residuals), interval_quantile))

    mae = float(mean_absolute_error(validation[TARGET], predictions))
    rmse = float(
        mean_squared_error(validation[TARGET], predictions) ** 0.5
    )
    r2 = float(r2_score(validation[TARGET], predictions))
    baseline_mae = float(mean_absolute_error(validation[TARGET], baseline))
    improvement = (
        ((baseline_mae - mae) / baseline_mae) * 100 if baseline_mae else 0.0
    )
    metrics = {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "r2": round(r2, 4),
        "baselineMae": round(baseline_mae, 4),
        "improvementPct": round(improvement, 4),
        "intervalQuantile": interval_quantile,
        "residualRadius": round(absolute_radius, 4),
    }
    return metrics, absolute_radius, len(train), len(validation)


def build_artifact(
    args: argparse.Namespace,
    historical: pd.DataFrame,
    future: pd.DataFrame,
    seed: dict[str, Any],
    metrics: dict[str, Any],
    residual_radius: float,
    evaluation_train_rows: int,
    validation_rows: int,
) -> tuple[dict[str, Any], Pipeline]:
    trainable = historical.loc[
        historical[
            ["demanda_lag_1m", "demanda_lag_2m", "demanda_lag_3m"]
        ]
        .notna()
        .all(axis=1)
    ].copy()
    final_pipeline = create_pipeline(args.alpha)
    final_pipeline.fit(trainable[MODEL_FEATURES], trainable[TARGET])
    predicted = np.clip(final_pipeline.predict(future[MODEL_FEATURES]), 0, None)

    slug_by_id = {
        str(item["product_id"]): str(item["slug"]) for item in seed["catalog"]
    }
    items: list[dict[str, Any]] = []
    for index, row in future.reset_index(drop=True).iterrows():
        product_id = str(row["product_id"])
        product_history = historical.loc[
            historical["product_id"].eq(product_id)
        ].sort_values("mes_objetivo").tail(6)
        units = max(0, int(round(float(predicted[index]))))
        lower = max(0, int(round(float(predicted[index] - residual_radius))))
        upper = max(lower, int(round(float(predicted[index] + residual_radius))))
        items.append(
            {
                "slug": slug_by_id[product_id],
                "productName": str(row["producto"]),
                "category": str(row["categoria"]),
                "history": [
                    {
                        "month": month.strftime("%Y-%m"),
                        "units": int(value),
                    }
                    for month, value in zip(
                        product_history["mes_objetivo"],
                        product_history[TARGET],
                        strict=True,
                    )
                ],
                "features": {
                    "demandLag1m": int(row["demanda_lag_1m"]),
                    "demandLag2m": int(row["demanda_lag_2m"]),
                    "demandLag3m": int(row["demanda_lag_3m"]),
                    "averageDemand3m": round(
                        float(row["promedio_demanda_3m"]), 4
                    ),
                    "ordersLag1m": int(row["pedidos_lag_1m"]),
                    "averagePriceLag1m": (
                        round(float(row["precio_promedio_lag_1m"]), 2)
                        if pd.notna(row["precio_promedio_lag_1m"])
                        else None
                    ),
                    "averageRatingAsOf": (
                        round(float(row["rating_promedio_al_corte"]), 4)
                        if pd.notna(row["rating_promedio_al_corte"])
                        else None
                    ),
                    "reviewCountAsOf": int(row["cantidad_resenas_al_corte"]),
                    "monthNumber": int(row["numero_mes"]),
                },
                "prediction": {
                    "units": units,
                    "lower": lower,
                    "upper": upper,
                },
            }
        )
    items.sort(key=lambda item: item["productName"])

    generated_at = args.generated_at or datetime.now(timezone.utc).isoformat()
    artifact: dict[str, Any] = {
        "schemaVersion": "1.0",
        "model": {
            "name": "Regresión Ridge",
            "version": args.version,
            "isSynthetic": True,
            "generatedAt": generated_at,
            "datasetSha256": sha256_file(args.dataset.resolve()),
            "alpha": args.alpha,
            "trainingPeriod": {
                "startMonth": trainable["mes_objetivo"].min().strftime("%Y-%m"),
                "endMonth": trainable["mes_objetivo"].max().strftime("%Y-%m"),
                "trainingRows": evaluation_train_rows,
                "validationRows": validation_rows,
                "finalTrainingRows": int(len(trainable)),
            },
            "metrics": metrics,
        },
        "targetMonth": str(future["mes_objetivo"].iloc[0]),
        "items": items,
    }
    validate_artifact(artifact, historical["product_id"].nunique())
    return artifact, final_pipeline


def validate_artifact(artifact: dict[str, Any], expected_products: int) -> None:
    if len(artifact["items"]) != expected_products:
        raise ValueError("El pronóstico no contiene una salida por producto")
    slugs = [item["slug"] for item in artifact["items"]]
    if len(slugs) != len(set(slugs)):
        raise ValueError("El pronóstico contiene slugs duplicados")
    for item in artifact["items"]:
        prediction = item["prediction"]
        if not (
            0
            <= prediction["lower"]
            <= prediction["units"]
            <= prediction["upper"]
        ):
            raise ValueError(f"Intervalo inválido para {item['slug']}")
        if len(item["history"]) < 3:
            raise ValueError(f"Historia insuficiente para {item['slug']}")


def write_future_csv(path: Path, frame: pd.DataFrame) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(path, index=False, encoding="utf-8-sig")


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
        "/* Archivo generado por ml/src/train_monthly_demand.py. "
        "No editar manualmente. */\n"
        "import type { MonthlyDemandArtifact } from "
        "'../intelligence-artifact.types';\n\n"
        f"export const MONTHLY_DEMAND_ARTIFACT = {serialized} "
        "satisfies MonthlyDemandArtifact;\n",
        encoding="utf-8",
    )


def main() -> int:
    args = parse_args()
    historical = load_historical(args.dataset.resolve())
    seed = load_operational_seed(args.operational_seed.resolve())
    future = build_future_rows(historical, seed)
    write_future_csv(args.inference_output.resolve(), future)
    metrics, residual_radius, train_rows, validation_rows = evaluate_model(
        historical,
        args.alpha,
        args.validation_months,
        args.interval_quantile,
    )
    artifact, final_pipeline = build_artifact(
        args,
        historical,
        future,
        seed,
        metrics,
        residual_radius,
        train_rows,
        validation_rows,
    )
    write_json(args.json_output.resolve(), artifact)
    write_typescript(args.ts_output.resolve(), artifact)
    if not args.skip_joblib:
        args.joblib_output.resolve().parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(final_pipeline, args.joblib_output.resolve())

    print(
        json.dumps(
            {
                "inferenceOutput": str(args.inference_output.resolve()),
                "jsonOutput": str(args.json_output.resolve()),
                "typescriptOutput": str(args.ts_output.resolve()),
                "joblibOutput": (
                    None
                    if args.skip_joblib
                    else str(args.joblib_output.resolve())
                ),
                "targetMonth": artifact["targetMonth"],
                "products": len(artifact["items"]),
                "metrics": metrics,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
