# Plan de Desarrollo: Visualizador Interactivo de Resultados

## Objetivo
Crear una página web interactiva para explorar los resultados de los experimentos de discretización local en Clasificadores basados en redes bayesianas, con filtros dinámicos similares a https://kyuz0.github.io/amd-r9700-ai-toolboxes/

## Tecnologías
- **HTML5** - Estructura de la página
- **CSS3** - Estilos modernos con variables CSS y flexbox/grid
- **JavaScript Vanilla** - Sin dependencias externas para mantener simplicidad
- **JSON** - Datos de resultados

## Estructura de Archivos
```
show_results/
├── plan.md              # Este archivo
├── index.html           # Página principal
├── css/
│   └── styles.css       # Estilos
├── js/
│   ├── app.js          # Lógica principal
│   ├── filters.js      # Lógica de filtros
│   └── charts.js       # Gráficos (opcional)
└── data/
    └── results.json    # Datos de resultados
```

## Fases de Desarrollo

### Fase 1: Preparación de Datos [COMPLETADO]
- [x] Crear script para exportar resultados a JSON (`generate_data.py`)
- [x] Estructura del JSON: 3240 resultados con metadata completa

### Fase 2: Estructura HTML [COMPLETADO]
- [x] Header con título y descripción
- [x] Panel de filtros completo
- [x] Área de estadísticas resumen
- [x] Tabla de resultados con ordenación
- [x] Paginación
- [x] Leyenda explicativa
- [x] Footer con información

### Fase 3: Estilos CSS [COMPLETADO]
- [x] Variables CSS para colores y spacing
- [x] Layout responsive con CSS Grid
- [x] Estilos para filtros (selectores, búsqueda)
- [x] Estilos para tabla con hover y zebra striping
- [x] Indicadores de mejora/pérdida con colores
- [x] Animaciones suaves
- [x] Loading overlay

### Fase 4: JavaScript - Filtros [COMPLETADO]
- [x] Carga de datos JSON
- [x] Event listeners para filtros
- [x] Función de filtrado combinado
- [x] Actualización dinámica de la tabla
- [x] Ordenación de columnas
- [x] Contador de resultados filtrados
- [x] Paginación funcional

### Fase 5: Funcionalidades Adicionales [COMPLETADO]
- [x] Estadísticas dinámicas según filtros
- [x] Exportar resultados filtrados a CSV
- [x] Gráficos comparativos interactivos (5 tipos)
- [ ] Comparador de modelos lado a lado (futuro)

### Fase 6: Gráficos Comparativos [COMPLETADO]
- [x] Comparación de Accuracy por Clasificador (barras agrupadas)
- [x] Distribución de Accuracy (Box Plot con estadísticas)
- [x] Heatmap de Mejoras Locales (burbujas con color)
- [x] Comparación por Dataset (barras horizontales)
- [x] Tendencia por Puntos de Corte (líneas)

## Filtros Disponibles

| Filtro | Tipo | Opciones |
|--------|------|----------|
| Iteraciones | Select | 10it, 100it, Ambos |
| Puntos de corte | Multi-select | 3p, 4p, 5p, up |
| Modelo base | Multi-select | TAN, KDB, AODE |
| Tipo discretización | Multi-select | MDLP, Igual freq, Igual amp, PKI, Local |
| Dataset | Búsqueda texto | 27 datasets |
| Mostrar solo mejoras | Toggle | Sí/No |

## Estructura de Datos JSON

```json
{
  "metadata": {
    "generated": "2025-12-09",
    "total_experiments": 648,
    "datasets": 27,
    "models": 15
  },
  "results": [
    {
      "iterations": "10it",
      "cuts": "3p",
      "model": "TANLd",
      "model_base": "TAN",
      "discretization_type": "local",
      "dataset": "iris",
      "accuracy": 0.9333,
      "std": 0.053,
      "samples": 150,
      "features": 4,
      "classes": 3,
      "train_time": 0.05,
      "improvement_vs_base": -0.5,
      "best_in_group": false
    }
  ]
}
```

## Notas de Progreso

### 2025-12-09
- Plan creado
- Script `generate_data.py` creado y ejecutado (3240 resultados)
- `index.html` completado con estructura completa
- `css/styles.css` completado con diseño moderno y responsive
- `js/app.js` completado con filtros, ordenación, paginación y exportación CSV
- Página web funcional y lista para uso

### 2025-12-10
- Añadida sección de gráficos comparativos con Chart.js
- `js/charts.js` creado con 5 tipos de gráficos:
  1. Comparación de Accuracy por Clasificador (barras agrupadas)
  2. Distribución de Accuracy (Box Plot con estadísticas min/Q1/mediana/Q3/max)
  3. Heatmap de Mejoras Locales (gráfico de burbujas con color)
  4. Comparación por Dataset (barras horizontales con selector de dataset)
  5. Tendencia por Puntos de Corte (líneas con diferenciación local/MDLP)
- Controles dinámicos según tipo de gráfico (iteraciones, cortes, dataset)
- Botón para descargar gráficos como PNG
- Botón para ocultar/mostrar tabla de resultados
- Estilos responsive para gráficos en móvil
