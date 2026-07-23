from __future__ import annotations

import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any

import pandas as pd

from train_monthly_demand import INFERENCE_COLUMNS


REPO_ROOT = Path(__file__).resolve().parents[2]
EXPORT_DIR = REPO_ROOT / "ml" / "exports"
ARTIFACT_DIR = REPO_ROOT / "ml" / "artifacts"
SERVER_ARTIFACT_DIR = (
    REPO_ROOT / "Server" / "src" / "modules" / "intelligence" / "artifacts"
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def load_typescript_artifact(
    path: Path,
    constant_name: str,
    type_name: str,
) -> dict[str, Any]:
    source = path.read_text(encoding="utf-8")
    assignment = f"export const {constant_name} = "
    suffix = f" satisfies {type_name};"
    start = source.find(assignment)
    end = source.rfind(suffix)
    require(start >= 0, f"Constante TypeScript ausente: {constant_name}")
    require(end > start, f"Contrato TypeScript ausente: {type_name}")
    payload = source[start + len(assignment) : end].strip()
    try:
        embedded = json.loads(payload)
    except json.JSONDecodeError as error:
        raise ValueError(
            f"El JSON embebido en {path.name} no es válido: {error}"
        ) from error
    require(
        isinstance(embedded, dict),
        f"El artefacto TypeScript {path.name} debe ser un objeto",
    )
    return embedded


def validate_typescript_copy(
    canonical: dict[str, Any],
    path: Path,
    constant_name: str,
    type_name: str,
) -> None:
    embedded = load_typescript_artifact(path, constant_name, type_name)
    require(
        embedded == canonical,
        (
            f"El JSON embebido en {path.name} difiere del artefacto "
            "canónico; regenere los artefactos"
        ),
    )


def validate_apriori() -> dict[str, Any]:
    dataset_path = EXPORT_DIR / "dataset_apriori_transacciones.csv"
    artifact_path = ARTIFACT_DIR / "apriori-rules.v1.json"
    typescript_path = SERVER_ARTIFACT_DIR / "apriori-rules.generated.ts"
    frame = pd.read_csv(dataset_path, encoding="utf-8-sig", dtype="string")
    artifact = json.loads(artifact_path.read_text(encoding="utf-8"))

    require(list(frame.columns) == ["tid", "items"], "Apriori debe usar tid,items")
    require(artifact["schemaVersion"] == "1.0", "Schema Apriori no soportado")
    require(frame["tid"].is_unique, "tid debe ser único")
    require(not frame.isna().any().any(), "Apriori no admite valores vacíos")
    require(len(frame) >= 100, "Apriori requiere un histórico suficiente")

    catalog = json.loads(
        (REPO_ROOT / "ml" / "config" / "product-catalog.json").read_text(
            encoding="utf-8"
        )
    )
    valid_slugs = {str(item["slug"]) for item in catalog}
    covered: set[str] = set()
    for row in frame.itertuples(index=False):
        raw_items = str(row.items).split("|")
        require(
            raw_items == sorted(set(raw_items)),
            f"Productos duplicados o desordenados en {row.tid}",
        )
        require(set(raw_items).issubset(valid_slugs), f"Slug inválido en {row.tid}")
        covered.update(raw_items)
    require(covered == valid_slugs, "Las canastas no cubren los 16 productos")
    require(
        artifact["model"]["datasetSha256"] == sha256_file(dataset_path),
        "El hash del artefacto Apriori no coincide con su dataset",
    )
    require(
        artifact["training"]["transactions"] == len(frame),
        "El número de transacciones no coincide",
    )
    rules = artifact["rules"]
    require(len(rules) == artifact["metrics"]["rules"], "Conteo de reglas inválido")
    require(bool(rules), "Apriori debe producir reglas")
    for rule in rules:
        require(len(rule["antecedentSlugs"]) == 1, "Antecedente no singleton")
        require(
            rule["antecedentSlugs"][0] != rule["consequentSlug"],
            "Regla autorreferente",
        )
        require(
            rule["support"] >= artifact["training"]["minSupport"],
            "Regla bajo soporte mínimo",
        )
        require(
            rule["confidence"] >= artifact["training"]["minConfidence"],
            "Regla bajo confianza mínima",
        )
        require(
            rule["lift"] >= artifact["training"]["minLift"],
            "Regla bajo lift mínimo",
        )
        require(rule["cooccurrenceCount"] >= 1, "Coocurrencia inválida")
    require(
        0 <= artifact["metrics"]["temporalTop1HitRate"] <= 1,
        "Hit rate temporal inválido",
    )
    require(
        len(artifact["popularFallbacks"]) == len(valid_slugs),
        "Fallbacks incompletos",
    )
    validate_typescript_copy(
        artifact,
        typescript_path,
        "APRIORI_RULES_ARTIFACT",
        "AprioriArtifact",
    )
    return {
        "transactions": len(frame),
        "rules": len(rules),
        "catalogCoverage": artifact["metrics"]["catalogCoverage"],
        "temporalTop1HitRate": artifact["metrics"]["temporalTop1HitRate"],
    }


def validate_demand() -> dict[str, Any]:
    history_path = EXPORT_DIR / "dataset_prediccion_demanda.csv"
    inference_path = EXPORT_DIR / "dataset_demanda_inferencia.csv"
    artifact_path = ARTIFACT_DIR / "monthly-demand-forecast.v1.json"
    typescript_path = SERVER_ARTIFACT_DIR / "monthly-demand.generated.ts"
    historical = pd.read_csv(history_path, encoding="utf-8-sig")
    inference = pd.read_csv(inference_path, encoding="utf-8-sig")
    artifact = json.loads(artifact_path.read_text(encoding="utf-8"))

    require(
        artifact["schemaVersion"] == "1.0",
        "Schema de demanda no soportado",
    )
    require(
        list(inference.columns) == INFERENCE_COLUMNS,
        "Columnas de inferencia inesperadas",
    )
    require(
        len(inference) == historical["product_id"].nunique(),
        "Debe existir una fila futura por producto",
    )
    require(inference["product_id"].is_unique, "Producto futuro duplicado")
    require(inference["mes_objetivo"].nunique() == 1, "Mes futuro inconsistente")
    require(
        artifact["targetMonth"] == inference["mes_objetivo"].iloc[0],
        "El artefacto y el CSV no comparten mes objetivo",
    )
    require(
        len(artifact["items"]) == historical["product_id"].nunique(),
        "El artefacto no cubre los 16 productos",
    )
    require(
        len({item["slug"] for item in artifact["items"]})
        == len(artifact["items"]),
        "Slugs duplicados en pronóstico",
    )
    metrics = artifact["model"]["metrics"]
    for key in ["mae", "rmse", "r2", "baselineMae", "improvementPct"]:
        require(math.isfinite(float(metrics[key])), f"Métrica no finita: {key}")
    require(
        float(metrics["mae"]) <= float(metrics["baselineMae"]),
        "Ridge no supera el baseline temporal",
    )
    for item in artifact["items"]:
        prediction = item["prediction"]
        require(
            0
            <= prediction["lower"]
            <= prediction["units"]
            <= prediction["upper"],
            f"Intervalo inválido en {item['slug']}",
        )
        require(len(item["history"]) >= 3, f"Historia insuficiente en {item['slug']}")
    validate_typescript_copy(
        artifact,
        typescript_path,
        "MONTHLY_DEMAND_ARTIFACT",
        "MonthlyDemandArtifact",
    )
    return {
        "historicalRows": len(historical),
        "inferenceRows": len(inference),
        "targetMonth": artifact["targetMonth"],
        "metrics": metrics,
    }


def main() -> int:
    try:
        summary = {
            "approved": True,
            "apriori": validate_apriori(),
            "monthlyDemand": validate_demand(),
        }
    except Exception as error:
        print(
            json.dumps(
                {"approved": False, "error": str(error)},
                ensure_ascii=False,
                indent=2,
            ),
            file=sys.stderr,
        )
        return 1
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
