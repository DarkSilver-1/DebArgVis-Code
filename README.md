# DebArgVis

This is a lightweight tool for data visualization, currently focused on visualizing argumentative structure in debate. The tool consists of Python-based preprocessing and an interactive D3.js visualization, that can be viewed in the browser.
In it's current version, DebArgVis can visualize Inference Anchoring Theory (IAT) annotated data. 

## Features
- Preprocessing
  -  Data cleaning and normalization;
  - Chronological ordering;
  - Timestamp annotation;
  - Topic extraction.
- Visualization

## Usage instructions

- Clone the repository
- Run the main.py file (visualizingDebates\main.py)
- Access the visualization in the browser via localhost (http://127.0.0.1:8000).
  The performance may vary depending on the browser, Firefox appears to be the best browser, Micrisoft Edge the worst
- After running the server once, the preprocessed data as well as the files for the visualisation can be accessed (and easily exported) via the analysis_results folder

## Example visualization
<img width="1294" height="644" alt="grafik" src="https://github.com/user-attachments/assets/b972086a-370e-4f3b-abc3-8d0661a69105" />

## License
MIT License

## Acknowledgments
- D3.js
- Dataset QT30 (Hautli-Janisz et al. 2022)

## Further notes
- Note that the video is not included in the repositiory, partially due to the file size
- As the data is not perfect, some connections/nodes cannot be displayed, the logger gives an overview of what had to be excluded
