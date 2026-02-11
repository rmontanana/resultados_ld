#!/usr/bin/env python3
"""
Genera el archivo adversaries.json consolidado a partir de los datos estadísticos
del pipeline adversaries_final. Este archivo alimenta la web con comparaciones
pareadas independientes (no "vs mejor base").
"""

import csv
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "stats" / "adversaries_final" / "data"
OUTPUT_JSON = Path(__file__).parent / "data" / "adversaries.json"
OUTPUT_COMPACT = Path(__file__).parent / "data" / "adversaries_compact.txt"

# Crear directorio data si no existe
OUTPUT_JSON.parent.mkdir(exist_ok=True)


def load_json(filename: str) -> dict:
    path = DATA_DIR / filename
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_csv(filename: str) -> list[dict]:
    path = DATA_DIR / filename
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Convertir campos numéricos
            for key, value in row.items():
                try:
                    if "." in value or "e" in value.lower():
                        row[key] = float(value)
                    elif value.lstrip("-").isdigit():
                        row[key] = int(value)
                except (ValueError, AttributeError):
                    pass
            rows.append(row)
    return rows


def save_compact(
    statistical_results: dict,
    integrated_profile: dict,
    pairwise_comparisons: list[dict],
    dataset_patterns: list[dict],
) -> None:
    """Genera adversaries_compact.txt con datos estadísticos en formato legible."""
    lines: list[str] = []

    # Cabecera
    lines.append("=" * 80)
    lines.append("ANÁLISIS ESTADÍSTICO: COMPARACIONES PAREADAS (adversaries_final)")
    lines.append("=" * 80)
    lines.append("")
    lines.append(
        "MARCO: Cada clasificador local (TANLd, KDBLd, AODELd) vs cada método base"
    )
    lines.append(
        "(mdlp, equal_freq, equal_width, pki) = 12 adversarios, N=27 datasets."
    )
    lines.append(
        "Tests: Wilcoxon/t-test, corrección Holm-Bonferroni, "
        "efecto rank-biserial/Cohen's d."
    )
    lines.append("")

    # Resumen global
    ip = integrated_profile
    lines.append("RESUMEN GLOBAL:")
    lines.append(
        f"- Victorias: {ip['total_wins']}/{ip['total']} "
        f"({ip['pct_wins']:.1f}%), "
        f"Derrotas: {ip['total_losses']}, Empates: {ip['total_ties']}"
    )
    lines.append(
        f"- Media global: {ip['mean_global']:+.4f}%, "
        f"Mediana: {ip['median_global']:+.4f}%"
    )
    lines.append(
        f"- Configs positivas: {ip['n_positive']}/{ip['n_total']}, "
        f"negativas: {ip['n_negative']}"
    )
    lines.append("")

    # Resultados por adversario (12 pares)
    lines.append("RESULTADOS POR ADVERSARIO (12 pares):")
    for val in statistical_results.values():
        sig = (
            "SIG"
            if val["statistical_test"]["pvalue_adjusted"] < 0.05
            else "n.s."
        )
        p_adj = val["statistical_test"]["pvalue_adjusted"]
        p_str = "<0.001" if p_adj < 0.001 else f"{p_adj:.3f}"
        lines.append(
            f"  {val['classifier']} vs {val['discretization_method']}: "
            f"media={val['mean_improvement_pct']:+.2f}%, "
            f"p-adj={p_str}, "
            f"efecto={val['effect_size']['value']:.3f} "
            f"({val['effect_size']['interpretation']}), "
            f"W/L/T={val['wins_losses_ties']['wins']}/"
            f"{val['wins_losses_ties']['losses']}/"
            f"{val['wins_losses_ties']['ties']}, {sig}"
        )
    lines.append("")

    # Datos pareados por dataset
    lines.append("DATOS PAREADOS POR DATASET (27 datasets × 12 adversarios):")

    # Agrupar pairwise_comparisons por dataset
    by_dataset: dict[str, list[dict]] = {}
    for row in pairwise_comparisons:
        ds = row["dataset"]
        by_dataset.setdefault(ds, []).append(row)

    for ds in sorted(by_dataset.keys()):
        rows = by_dataset[ds]
        # Construir descripción compacta: agrupar por (classifier, discretization_method)
        # mostrando la mejor config (mayor improvement_pct) para cada adversario
        adversary_best: dict[str, dict] = {}
        for r in rows:
            adv_key = f"{r['classifier']}_vs_{r['discretization_method']}"
            if adv_key not in adversary_best or r["improvement_pct"] > adversary_best[adv_key]["improvement_pct"]:
                adversary_best[adv_key] = r

        lines.append(f"### {ds}")
        parts = []
        for adv_key in sorted(adversary_best.keys()):
            r = adversary_best[adv_key]
            parts.append(
                f"  {r['classifier']}Ld vs {r['classifier']}-{r['discretization_method']}: "
                f"{r['improvement_pct']:+.2f}% "
                f"[{r['iterations']}/{r['cuts']}]"
            )
        lines.append("\n".join(parts))

    lines.append("")

    # Patrones por dataset (resumen ordenado)
    lines.append("PATRONES POR DATASET (resumen, ordenado por mejora media):")
    sorted_patterns = sorted(
        dataset_patterns, key=lambda d: d["mean_improvement_pct"], reverse=True
    )
    for i, d in enumerate(sorted_patterns, 1):
        sign = "+" if d["mean_improvement_pct"] > 0 else ""
        lines.append(
            f"  {i:2d}. {d['dataset']}: "
            f"media={sign}{d['mean_improvement_pct']:.2f}%, "
            f"{d['n_positive']}/{d['n_total']} positivos"
        )

    content = "\n".join(lines) + "\n"
    with open(OUTPUT_COMPACT, "w", encoding="utf-8") as f:
        f.write(content)

    size_kb = OUTPUT_COMPACT.stat().st_size / 1024
    print(f"  adversaries_compact.txt guardado: {OUTPUT_COMPACT}")
    print(f"  Tamaño: {size_kb:.1f} KB")


def main():
    print("Generando adversaries.json para la web...")

    # 1. Resultados estadísticos (12 pares clasificador-método)
    statistical_results = load_json("statistical_results.json")
    print(f"  statistical_results: {len(statistical_results['results'])} pares")

    # 2. Análisis complementario (by_cuts, by_iterations, extreme_cases, etc.)
    complementary_analysis = load_json("complementary_analysis.json")
    print(f"  complementary_analysis: {len(complementary_analysis)} secciones")

    # 3. Perfil integrado (resumen global)
    integrated_profile = load_json("integrated_profile_summary.json")
    print(f"  integrated_profile: cargado")

    # 4. Tabla resumen (CSV)
    summary_table = load_csv("summary_table.csv")
    print(f"  summary_table: {len(summary_table)} filas")

    # 5. Comparaciones pareadas (CSV, ~1782 filas)
    pairwise_comparisons = load_csv("pairwise_comparisons.csv")
    print(f"  pairwise_comparisons: {len(pairwise_comparisons)} filas")

    # 6. Agregado por dataset (CSV, ~324 filas)
    aggregated_by_dataset = load_csv("aggregated_by_dataset.csv")
    print(f"  aggregated_by_dataset: {len(aggregated_by_dataset)} filas")

    # Construir JSON consolidado
    output = {
        "statistical_results": statistical_results["results"],
        "complementary_analysis": complementary_analysis,
        "integrated_profile": integrated_profile,
        "summary_table": summary_table,
        "pairwise_comparisons": pairwise_comparisons,
        "aggregated_by_dataset": aggregated_by_dataset,
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n  adversaries.json guardado: {OUTPUT_JSON}")
    print(f"  Tamaño: {OUTPUT_JSON.stat().st_size / 1024:.1f} KB")

    # Generar versión compacta de texto para contexto IA
    dataset_patterns = complementary_analysis.get("global_patterns", {}).get(
        "dataset_patterns", []
    )
    save_compact(
        statistical_results["results"],
        integrated_profile,
        pairwise_comparisons,
        dataset_patterns,
    )


if __name__ == "__main__":
    main()
