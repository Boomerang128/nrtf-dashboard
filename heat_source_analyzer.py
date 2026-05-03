import pandas as pd
import glob
import os
import sys

# Ensure UTF-8 output
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

class WasteHeatAnalyzer:
    """
    A tool to systematically identify and prioritize waste heat recovery 
    opportunities from industrial telemetry data.
    """
    
    def __init__(self, data_dir):
        self.data_dir = data_dir
        self.sources = []

    def analyze(self):
        print("="*60)
        print("  ReTeqFusion - Waste Heat Source Analyzer (Track B)")
        print("="*60)
        
        if not os.path.exists(self.data_dir):
            print(f"Error: Data directory '{self.data_dir}' not found.")
            return

        files = glob.glob(os.path.join(self.data_dir, "**/*.xlsx"), recursive=True)
        if not files:
            print(f"No Excel files found in {self.data_dir}")
            return

        print(f"Scanning {len(files)} reports for heat sources...\n")
        
        for file_path in files[:5]: # Analyze sample for characterization
            try:
                df = pd.read_excel(file_path, header=None)
                self._extract_thermal_points(df, os.path.basename(file_path))
            except Exception as e:
                print(f"Error reading {file_path}: {e}")

        self._prioritize()

    def _extract_thermal_points(self, df, filename):
        """Identifies temperature pairs and thermal gradients."""
        # Keywords for thermal detection
        temp_keywords = ["temp", "tt", "chaleur", "entrée", "sortie", "inlet", "outlet"]
        
        # Search for temperature rows
        temp_rows = []
        for r in range(len(df)):
            label = str(df.iloc[r, 1]).lower()
            if any(k in label for k in temp_keywords):
                try:
                    val = df.iloc[r, 4]
                    if pd.notna(val) and isinstance(val, (int, float)):
                        temp_rows.append({"label": df.iloc[r, 1], "value": val, "row": r})
                except:
                    continue

        # Pair up Inlet/Outlet (usually adjacent or specifically labeled)
        for i in range(len(temp_rows) - 1):
            t1 = temp_rows[i]
            t2 = temp_rows[i+1]
            
            # Simple heuristic: adjacent temperature rows are often a pair
            if abs(t1["row"] - t2["row"]) <= 2:
                dt = abs(t1["value"] - t2["value"])
                if dt > 5: # Significant gradient
                    source_name = f"Loop: {t1['label']} / {t2['label']}"
                    self.sources.append({
                        "name": source_name,
                        "t_high": max(t1["value"], t2["value"]),
                        "t_low": min(t1["value"], t2["value"]),
                        "dt": dt,
                        "file": filename
                    })

    def _prioritize(self):
        """Ranks sources based on temperature level and gradient."""
        if not self.sources:
            print("No significant heat sources identified.")
            return

        # Deduplicate and average
        unique_sources = {}
        for s in self.sources:
            if s["name"] not in unique_sources:
                unique_sources[s["name"]] = s
            else:
                # Keep the one with highest temp
                if s["t_high"] > unique_sources[s["name"]]["t_high"]:
                    unique_sources[s["name"]] = s

        sorted_sources = sorted(unique_sources.values(), key=lambda x: x["t_high"], reverse=True)

        print(f"{'Source Description':<50} | {'Temp Max':<10} | {'Delta T':<10} | {'Rank'}")
        print("-" * 85)
        for i, s in enumerate(sorted_sources):
            rank = "HIGH" if s["t_high"] > 90 else "MEDIUM" if s["t_high"] > 60 else "LOW"
            print(f"{s['name'][:50]:<50} | {s['t_high']:>8.1f}°C | {s['dt']:>8.1f}°C | {rank}")

        print("\n" + "="*60)
        print("  ANALYSIS COMPLETE")
        print("="*60)

if __name__ == "__main__":
    DATA_PATH = r"data" # Relative path
    analyzer = WasteHeatAnalyzer(DATA_PATH)
    analyzer.analyze()
