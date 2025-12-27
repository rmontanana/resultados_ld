#!/usr/bin/env python3
"""
Genera el archivo JSON con todos los resultados para la visualización web.
Lee directamente de los archivos results_*.json en las carpetas de experimentos.
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# Añadir el directorio padre al path para importar results_common
sys.path.insert(0, str(Path(__file__).parent.parent))

from results_common import (
    ITERATIONS_OPTIONS,
    CUTS_OPTIONS,
    MODEL_BASES,
    get_discretization_type,
    get_model_base,
    iter_result_files,
)

BASE_DIR = Path(__file__).parent.parent
OUTPUT_JSON = Path(__file__).parent / "data" / "results.json"
OUTPUT_COMPACT = Path(__file__).parent / "data" / "results_compact.txt"

# Crear directorio data si no existe
OUTPUT_JSON.parent.mkdir(exist_ok=True)


def load_all_results() -> list[dict]:
    """Carga todos los resultados de los archivos results_*.json."""
    results = []
    files_processed = 0

    for result_file in iter_result_files(BASE_DIR):
        try:
            with open(result_file, "r") as f:
                data = json.load(f)

            model = data.get("model", "")
            discretization_algorithm = data.get("discretization_algorithm", "")

            model_base = get_model_base(model)
            disc_type = get_discretization_type(discretization_algorithm, model)

            # Extraer iterations y cuts del path
            parts = result_file.parts
            iterations = None
            cuts = None
            for i, part in enumerate(parts):
                if part in ITERATIONS_OPTIONS:
                    iterations = part
                    if i + 1 < len(parts) and parts[i + 1] in CUTS_OPTIONS:
                        cuts = parts[i + 1]
                    break

            if not iterations or not cuts:
                print(f"  Advertencia: No se pudo extraer iterations/cuts de {result_file}")
                continue

            # Procesar cada resultado (dataset) en el archivo
            for item in data.get("results", []):
                result_entry = {
                    "iterations": iterations,
                    "cuts": cuts,
                    "model": model,
                    "model_base": model_base,
                    "discretization_type": disc_type,
                    "dataset": item.get("dataset", ""),
                    "accuracy": round(item.get("score", 0), 6),
                    "std": round(item.get("score_std", 0), 6),
                    "accuracy_pct": round(item.get("score", 0) * 100, 2),
                    "samples": item.get("samples", 0),
                    "features": item.get("features", 0),
                    "classes": item.get("classes", 0),
                }
                results.append(result_entry)

            files_processed += 1

        except Exception as e:
            print(f"  Error procesando {result_file}: {e}")

    print(f"  Archivos procesados: {files_processed}")
    return results


def calculate_improvements(results: list[dict]) -> list[dict]:
    """Calcula las mejoras de modelos locales vs mejor base."""
    # Agrupar por iteraciones, cuts y dataset
    groups = {}
    for r in results:
        key = (r["iterations"], r["cuts"], r["dataset"])
        if key not in groups:
            groups[key] = []
        groups[key].append(r)

    # Para cada grupo, calcular mejora de Ld vs mejor base
    for key, group in groups.items():
        for model_base in MODEL_BASES:
            # Encontrar modelo local
            local_result = None
            base_results = []

            for r in group:
                if r["model"] == f"{model_base}Ld":
                    local_result = r
                elif r["model_base"] == model_base and r["discretization_type"] != "local":
                    base_results.append(r)

            if local_result and base_results:
                best_base = max(base_results, key=lambda x: x["accuracy"])
                improvement = (local_result["accuracy"] - best_base["accuracy"]) * 100
                local_result["improvement_vs_base"] = round(improvement, 2)
                local_result["best_base_model"] = best_base["model"]
                local_result["best_base_accuracy"] = best_base["accuracy"]

            # Marcar el mejor de cada grupo base
            all_same_base = [r for r in group if r["model_base"] == model_base]
            if all_same_base:
                best = max(all_same_base, key=lambda x: x["accuracy"])
                for r in all_same_base:
                    r["best_in_group"] = (r["model"] == best["model"])

    return results


def save_json(results: list[dict]) -> None:
    """Guarda los resultados en formato JSON."""
    output = {
        "metadata": {
            "generated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_results": len(results),
            "datasets": len(set(r["dataset"] for r in results)),
            "models": len(set(r["model"] for r in results)),
            "iterations_options": list(ITERATIONS_OPTIONS),
            "cuts_options": list(CUTS_OPTIONS),
            "model_bases": sorted(set(r["model_base"] for r in results)),
            "discretization_types": sorted(set(r["discretization_type"] for r in results))
        },
        "results": results
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"  JSON guardado: {OUTPUT_JSON}")


def save_compact(results: list[dict]) -> None:
    """Guarda los resultados en formato compacto legible para humanos/IA."""
    lines = []

    # Header
    lines.append("=" * 80)
    lines.append("RESULTADOS: DISCRETIZACIÓN LOCAL EN CLASIFICADORES BAYESIANOS")
    lines.append("=" * 80)
    lines.append("")
    lines.append("ESTUDIO: Comparación de discretización tradicional (a priori) vs local")
    lines.append("(iterativa) en clasificadores bayesianos TAN, KDB (k=2) y AODE.")
    lines.append("")
    lines.append("METODOLOGÍA: Validación cruzada estratificada 5-fold, 3 repeticiones.")
    lines.append("Métrica: Accuracy. Configs: 10/100 iteraciones, 3/4/5/ilim. puntos corte.")
    lines.append("")
    lines.append("MODELOS:")
    lines.append("  *Ld (TANLd, KDBLd, AODELd): Discretización LOCAL (propuesta)")
    lines.append("  *-mdlpN: MDLP tradicional (N=máx cortes, sin número=ilimitado)")
    lines.append("  *-binNq/u: Binning equal-freq(q) o equal-width(u), N bins")
    lines.append("  *-pkilog/sqrt: PKI con log(n) o sqrt(n) bins")
    lines.append("")
    lines.append("FORMATO: dataset (muestras,features,clases)")
    lines.append("  [iter/cortes] modelo=acc±std (* = mejor en su grupo base TAN/KDB/AODE)")
    lines.append("")
    lines.append("=" * 80)
    lines.append("")

    # Agrupar por dataset
    by_dataset = {}
    for r in results:
        ds = r["dataset"]
        if ds not in by_dataset:
            by_dataset[ds] = {
                "samples": r["samples"],
                "features": r["features"],
                "classes": r["classes"],
                "configs": {}
            }
        config_key = (r["iterations"], r["cuts"])
        if config_key not in by_dataset[ds]["configs"]:
            by_dataset[ds]["configs"][config_key] = []
        by_dataset[ds]["configs"][config_key].append(r)

    # Ordenar datasets alfabéticamente
    for dataset in sorted(by_dataset.keys()):
        ds_info = by_dataset[dataset]
        lines.append(f"### {dataset} ({ds_info['samples']},{ds_info['features']},{ds_info['classes']})")

        # Ordenar configuraciones: primero por iterations (100it, 10it), luego por cuts (3p, 4p, 5p, up)
        iter_order = {"100it": 0, "10it": 1}
        cuts_order = {"3p": 0, "4p": 1, "5p": 2, "up": 3}
        sorted_configs = sorted(
            ds_info["configs"].keys(),
            key=lambda x: (iter_order.get(x[0], 99), cuts_order.get(x[1], 99))
        )

        for config_key in sorted_configs:
            iterations, cuts = config_key
            config_results = ds_info["configs"][config_key]

            # Ordenar modelos alfabéticamente
            config_results.sort(key=lambda x: x["model"])

            # Construir línea de modelos
            model_parts = []
            for r in config_results:
                acc = f"{r['accuracy']:.4f}"
                std = f"{r['std']:.4f}"
                best_marker = "*" if r.get("best_in_group", False) else ""
                model_parts.append(f"{r['model']}={acc}±{std}{best_marker}")

            # Formato: [100/3p] sin 'it' en iterations
            iter_num = iterations.replace("it", "")
            line = f"  [{iter_num}/{cuts}] " + " | ".join(model_parts)
            lines.append(line)

        lines.append("")

    # Guardar archivo
    with open(OUTPUT_COMPACT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"  Compacto guardado: {OUTPUT_COMPACT}")


def print_summary(results: list[dict]) -> None:
    """Imprime un resumen de los resultados."""
    print(f"\n=== Resumen ===")
    print(f"Total resultados: {len(results)}")
    print(f"Datasets: {len(set(r['dataset'] for r in results))}")
    print(f"Modelos: {len(set(r['model'] for r in results))}")

    print(f"\nModelos encontrados:")
    for model in sorted(set(r["model"] for r in results)):
        count = sum(1 for r in results if r["model"] == model)
        print(f"  - {model}: {count} resultados")

    print(f"\nTipos de discretización:")
    for disc in sorted(set(r["discretization_type"] for r in results)):
        count = sum(1 for r in results if r["discretization_type"] == disc)
        print(f"  - {disc}: {count} resultados")


def main():
    print("Generando datos para visualización web...")
    print(f"Directorio base: {BASE_DIR}")

    # Cargar resultados
    print("\n1. Cargando resultados de archivos JSON...")
    results = load_all_results()
    print(f"   Resultados cargados: {len(results)}")

    if not results:
        print("ERROR: No se encontraron resultados")
        return

    # Calcular mejoras
    print("\n2. Calculando mejoras...")
    results = calculate_improvements(results)
    print("   Mejoras calculadas")

    # Guardar JSON
    print("\n3. Guardando JSON...")
    save_json(results)

    # Guardar formato compacto
    print("\n4. Guardando formato compacto...")
    save_compact(results)

    # Resumen
    print_summary(results)


if __name__ == "__main__":
    main()
