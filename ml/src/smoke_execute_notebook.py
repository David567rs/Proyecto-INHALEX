from __future__ import annotations

import os
import sys
import traceback
from pathlib import Path

import matplotlib
import nbformat
from IPython.display import display


REPO_ROOT = Path(__file__).resolve().parents[2]
NOTEBOOK_PATHS = [
    REPO_ROOT / "ml" / "notebooks" / "01_apriori_inhalex.ipynb",
    REPO_ROOT / "ml" / "notebooks" / "02_demanda_mensual_inhalex.ipynb",
]


def execute_notebook(path: Path) -> int:
    """Execute every code cell from one notebook in an isolated namespace."""

    notebook = nbformat.read(path, as_version=4)
    namespace: dict[str, object] = {
        "__name__": "__main__",
        "display": display,
    }
    code_cells = [cell for cell in notebook.cells if cell.cell_type == "code"]
    for position, cell in enumerate(code_cells, start=1):
        try:
            exec(
                compile(cell.source, f"{path.name}:cell-{position}", "exec"),
                namespace,
            )
        except Exception:
            print(
                f"ERROR: falló {path.name}, celda {position}/{len(code_cells)}",
                file=sys.stderr,
            )
            traceback.print_exc()
            return 1
    print(f"OK: {path.name} ejecutó {len(code_cells)} celdas correctamente")
    return 0


def main() -> int:
    """Execute the two deployable ML notebooks without a Jupyter kernel."""

    os.chdir(REPO_ROOT)
    os.environ.setdefault("LOKY_MAX_CPU_COUNT", "1")
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    plt.show = lambda *args, **kwargs: None
    for path in NOTEBOOK_PATHS:
        result = execute_notebook(path)
        if result:
            return result
    print(f"OK: {len(NOTEBOOK_PATHS)} libretas P1/P2 aprobadas")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
