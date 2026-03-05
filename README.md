# Interactive Results Explorer: Local Discretization

This project is an interactive web tool designed to explore and analyze results from **local discretization** experiments in Bayesian Network-based classifiers (TAN, KDB, and AODE). It allows for detailed performance comparisons across multiple datasets and experimental configurations.

**🌐 Multilingual Support**: The web interface is available in both **English** and **Spanish**, selectable from the top navigation bar.

## 🚀 Key Features

- **Results Explorer**: Interactive table with dataset search, dynamic filters, and multi-column sorting (Accuracy, Std, Time).
- **Comparative Charts**: Advanced visualization using Chart.js, including:
  - Accuracy Comparison by Classifier.
  - Accuracy Distribution (Box Plots).
  - Local Improvements Heatmap.
  - Cut-points trend analysis.
- **Model Comparator**: Dedicated tool to compare base models against their local discretization versions.
- **Results Grid**: Compact visualization of the best results per dataset.
- **AI Assistant**: Integrated chat interface to query experimental results.
- **Modern Design**: Responsive interface with light and dark mode support.

## 📂 Project Structure

```text
show_results/
├── index.html           # Main results explorer
├── charts.html          # Interactive charts dashboard
├── compare.html         # Model comparison tool
├── results-grid.html    # Compact results grid
├── ai-chat.html         # AI Assistant interface
├── report.html          # Report generator
├── generate_data.py     # Python script for data processing/generation
├── css/                 # Page-specific styling
├── js/                  # Application logic and i18n
└── data/                # JSON files with experimental results
```

## 🛠️ Technical Stack

- **Frontend**: HTML5, CSS3 (CSS Variables, Flexbox, Grid), Vanilla JavaScript.
- **Visualization**: [Chart.js](https://www.chartjs.org/) for dynamic charts.
- **Data**: JSON for efficient result storage and loading.
- **Processing**: Python for experimental data formatting and generation.

## 📊 Experimental Data

The results cover:
- **Datasets**: 27 standard machine learning datasets.
- **Models**: TAN, KDB, AODE, and their local discretization variants.
- **Configurations**: 10 and 100 iterations; 3, 4, 5, and unlimited cut points.
- **Metrics**: Accuracy, Standard Deviation, Training Time, Relative Improvement.

## 📖 How to Use

1. Clone the repository.
2. Open `index.html` in any modern web browser (no web server required for basic functionality).
3. Use the filter panel to isolate specific experimental scenarios.
4. Explore the top navigation tabs for charts and comparisons.
5. Switch between **English** and **Spanish** using the language toggle in the navbar.

---
*This project is part of research on local discretization techniques in probabilistic models.*
