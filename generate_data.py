#!/usr/bin/env python3
"""
Genera el archivo JSON con todos los resultados para la visualización web.
"""

import json
import os
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent.parent
OUTPUT_FILE = Path(__file__).parent / "data" / "results.json"

# Crear directorio data si no existe
OUTPUT_FILE.parent.mkdir(exist_ok=True)

def get_discretization_type(model):
    """Determina el tipo de discretización según el nombre del modelo."""
    if model.endswith('Ld'):
        return 'local'
    elif 'mdlp' in model:
        return 'mdlp'
    elif 'q' in model and 'bin' in model:
        return 'equal_freq'
    elif 'u' in model and 'bin' in model:
        return 'equal_width'
    elif 'pki' in model:
        return 'pki'
    else:
        return 'base'

def get_model_base(model):
    """Extrae el modelo base del nombre."""
    if model.startswith('TAN'):
        return 'TAN'
    elif model.startswith('KDB'):
        return 'KDB'
    elif model.startswith('AODE'):
        return 'AODE'
    return model

def load_all_results():
    """Carga todos los resultados de los experimentos."""
    results = []
    best_results = {}

    for iterations in ['10it', '100it']:
        for cuts in ['3p', '4p', '5p', 'up']:
            path = BASE_DIR / iterations / cuts
            if not path.exists():
                continue

            # Cargar best_results para cada modelo
            for bf in path.glob('best_results_accuracy_*.json'):
                model = bf.stem.replace('best_results_accuracy_', '')
                try:
                    with open(bf, 'r') as f:
                        data = json.load(f)
                        best_results[f"{iterations}/{cuts}/{model}"] = data
                except:
                    pass

            # Cargar resultados completos para tiempos
            raw_results = {}
            for rf in path.glob('results_accuracy_*.json'):
                parts = rf.stem.split('_')
                if len(parts) >= 3:
                    model = parts[2]
                    try:
                        with open(rf, 'r') as f:
                            raw_data = json.load(f)
                            raw_results[model] = raw_data
                    except:
                        pass

    # Procesar todos los resultados
    for key, data in best_results.items():
        parts = key.split('/')
        iterations = parts[0]
        cuts = parts[1]
        model = parts[2]

        model_base = get_model_base(model)
        disc_type = get_discretization_type(model)

        for dataset, values in data.items():
            if isinstance(values, list) and len(values) >= 4:
                accuracy = values[0]
                std = values[3]

                # Buscar información adicional del dataset
                samples = 0
                features = 0
                classes = 0
                train_time = 0

                # Buscar en raw_results
                raw_key = f"{iterations}/{cuts}"

                results.append({
                    'iterations': iterations,
                    'cuts': cuts,
                    'model': model,
                    'model_base': model_base,
                    'discretization_type': disc_type,
                    'dataset': dataset,
                    'accuracy': round(accuracy, 6),
                    'std': round(std, 6),
                    'accuracy_pct': round(accuracy * 100, 2),
                })

    return results

def calculate_improvements(results):
    """Calcula las mejoras de modelos locales vs base."""
    # Agrupar por iteraciones, cuts y dataset
    groups = {}
    for r in results:
        key = (r['iterations'], r['cuts'], r['dataset'])
        if key not in groups:
            groups[key] = []
        groups[key].append(r)

    # Para cada grupo, calcular mejora de Ld vs mejor base
    for key, group in groups.items():
        for model_base in ['TAN', 'KDB', 'AODE']:
            # Encontrar modelo local
            local_result = None
            base_results = []

            for r in group:
                if r['model'] == f"{model_base}Ld":
                    local_result = r
                elif r['model_base'] == model_base and r['discretization_type'] != 'local':
                    base_results.append(r)

            if local_result and base_results:
                best_base = max(base_results, key=lambda x: x['accuracy'])
                improvement = (local_result['accuracy'] - best_base['accuracy']) * 100
                local_result['improvement_vs_base'] = round(improvement, 2)
                local_result['best_base_model'] = best_base['model']
                local_result['best_base_accuracy'] = best_base['accuracy']

            # Marcar el mejor de cada grupo base
            all_same_base = [r for r in group if r['model_base'] == model_base]
            if all_same_base:
                best = max(all_same_base, key=lambda x: x['accuracy'])
                for r in all_same_base:
                    r['best_in_group'] = (r['model'] == best['model'])

    return results

def get_dataset_info():
    """Retorna información de los datasets."""
    return {
        'adult': {'samples': 45222, 'features': 14, 'classes': 2},
        'balance-scale': {'samples': 625, 'features': 4, 'classes': 3},
        'breast-w': {'samples': 683, 'features': 9, 'classes': 2},
        'diabetes': {'samples': 768, 'features': 8, 'classes': 2},
        'ecoli': {'samples': 336, 'features': 7, 'classes': 8},
        'glass': {'samples': 214, 'features': 9, 'classes': 6},
        'hayes-roth': {'samples': 160, 'features': 4, 'classes': 3},
        'heart-statlog': {'samples': 270, 'features': 13, 'classes': 2},
        'ionosphere': {'samples': 351, 'features': 34, 'classes': 2},
        'iris': {'samples': 150, 'features': 4, 'classes': 3},
        'kdd_JapaneseVowels': {'samples': 9961, 'features': 14, 'classes': 9},
        'letter': {'samples': 20000, 'features': 16, 'classes': 26},
        'liver-disorders': {'samples': 345, 'features': 6, 'classes': 2},
        'mfeat-factors': {'samples': 2000, 'features': 216, 'classes': 10},
        'mfeat-fourier': {'samples': 2000, 'features': 76, 'classes': 10},
        'mfeat-karhunen': {'samples': 2000, 'features': 64, 'classes': 10},
        'mfeat-morphological': {'samples': 2000, 'features': 6, 'classes': 10},
        'mfeat-zernike': {'samples': 2000, 'features': 47, 'classes': 10},
        'optdigits': {'samples': 5620, 'features': 64, 'classes': 10},
        'page-blocks': {'samples': 5473, 'features': 10, 'classes': 5},
        'pendigits': {'samples': 10992, 'features': 16, 'classes': 10},
        'segment': {'samples': 2310, 'features': 19, 'classes': 7},
        'sonar': {'samples': 208, 'features': 60, 'classes': 2},
        'spambase': {'samples': 4601, 'features': 57, 'classes': 2},
        'vehicle': {'samples': 846, 'features': 18, 'classes': 4},
        'waveform-5000': {'samples': 5000, 'features': 40, 'classes': 3},
        'wine': {'samples': 178, 'features': 13, 'classes': 3},
    }

def enrich_with_dataset_info(results):
    """Añade información de datasets a los resultados."""
    dataset_info = get_dataset_info()
    for r in results:
        if r['dataset'] in dataset_info:
            info = dataset_info[r['dataset']]
            r['samples'] = info['samples']
            r['features'] = info['features']
            r['classes'] = info['classes']
    return results

def main():
    print("Generando datos JSON para visualización web...")

    # Cargar resultados
    results = load_all_results()
    print(f"  Resultados cargados: {len(results)}")

    # Calcular mejoras
    results = calculate_improvements(results)
    print("  Mejoras calculadas")

    # Enriquecer con info de datasets
    results = enrich_with_dataset_info(results)
    print("  Información de datasets añadida")

    # Crear estructura final
    output = {
        'metadata': {
            'generated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'total_results': len(results),
            'datasets': len(set(r['dataset'] for r in results)),
            'models': len(set(r['model'] for r in results)),
            'iterations_options': ['10it', '100it'],
            'cuts_options': ['3p', '4p', '5p', 'up'],
            'model_bases': ['TAN', 'KDB', 'AODE'],
            'discretization_types': ['local', 'mdlp', 'equal_freq', 'equal_width', 'pki', 'base']
        },
        'results': results
    }

    # Guardar JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\nArchivo generado: {OUTPUT_FILE}")
    print(f"  Total resultados: {len(results)}")

if __name__ == "__main__":
    main()
