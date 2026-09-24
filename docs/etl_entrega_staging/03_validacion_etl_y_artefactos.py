"""Validación portable de los datasets y artefactos de INHALEX.

Este programa es de sólo lectura. Está pensado para vivir en 04_ETL dentro
del ZIP de entrega y valida la estructura mínima de 05_Datasets y 07_Modelos.

Uso desde la raíz del ZIP:
    python 04_ETL/03_validacion_etl_y_artefactos.py

O bien, para una carpeta distinta:
    python 03_validacion_etl_y_artefactos.py --root C:/ruta/al/ZIP
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path


APRIORI_COLUMNS = {"tid", "items"}
DEMAND_COLUMNS = {
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
}
JSON_ARTIFACTS = [
    "apriori-rules.v1.json",
    "apriori-rules.flask.v1.json",
    "monthly-demand-forecast.v1.json",
    "monthly-demand-flask-manifest.v1.json",
]
MODEL_ARTIFACTS = ["monthly-demand-ridge.v1.joblib"]


def show(status: str, message: str) -> None:
    print(f"[{status}] {message}")


def validate_csv(path: Path, expected: set[str], label: str) -> list[str]:
    errors: list[str] = []
    if not path.is_file():
        return [f"No existe {label}: {path}"]

    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        columns = set(reader.fieldnames or [])
        missing = expected - columns
        if missing:
            errors.append(f"{label} no contiene las columnas: {', '.join(sorted(missing))}")
            return errors

        rows = list(reader)

    if not rows:
        errors.append(f"{label} no contiene observaciones.")
        return errors

    if label == "dataset Apriori":
        invalid = [row for row in rows if not row["tid"] or not row["items"]]
        if invalid:
            errors.append(f"{label} tiene {len(invalid)} filas sin tid o items.")
    else:
        invalid = [
            row
            for row in rows
            if not row["product_id"] or not row["mes_objetivo"] or row["Y_unidades_solicitadas_mes"] == ""
        ]
        if invalid:
            errors.append(f"{label} tiene {len(invalid)} filas incompletas.")

    if not errors:
        show("OK", f"{label}: {len(rows)} filas y {len(columns)} columnas.")
    return errors


def validate_json_artifacts(models_dir: Path) -> list[str]:
    errors: list[str] = []
    for name in JSON_ARTIFACTS:
        path = models_dir / name
        if not path.is_file():
            errors.append(f"No existe el artefacto JSON: {path}")
            continue
        try:
            with path.open("r", encoding="utf-8") as file:
                payload = json.load(file)
            if not isinstance(payload, dict):
                errors.append(f"El artefacto {name} no contiene un objeto JSON.")
            else:
                show("OK", f"Artefacto JSON válido: {name}.")
        except json.JSONDecodeError as exc:
            errors.append(f"JSON inválido en {name}: {exc}")

    for name in MODEL_ARTIFACTS:
        path = models_dir / name
        if not path.is_file() or path.stat().st_size == 0:
            errors.append(f"No existe o está vacío el modelo: {path}")
        else:
            show("OK", f"Modelo binario presente: {name} ({path.stat().st_size} bytes).")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida la entrega ETL de INHALEX.")
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Carpeta raíz que contiene 05_Datasets y 07_Modelos.",
    )
    args = parser.parse_args()
    root = args.root.resolve()
    datasets_dir = root / "05_Datasets"
    models_dir = root / "07_Modelos"

    show("INFO", f"Validando entrega en: {root}")
    errors: list[str] = []
    errors.extend(
        validate_csv(
            datasets_dir / "dataset_apriori_transacciones.csv",
            APRIORI_COLUMNS,
            "dataset Apriori",
        )
    )
    errors.extend(
        validate_csv(
            datasets_dir / "dataset_prediccion_demanda.csv",
            DEMAND_COLUMNS,
            "dataset de demanda mensual",
        )
    )
    errors.extend(validate_json_artifacts(models_dir))

    if errors:
        print("\nVALIDACIÓN FALLIDA")
        for error in errors:
            show("ERROR", error)
        return 1

    print("\nVALIDACIÓN EXITOSA: datasets y artefactos listos para la entrega.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
