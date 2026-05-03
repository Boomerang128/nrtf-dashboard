import pandas as pd
import glob
import os
import normalization

def extract_all():
    DATA_DIR = r"data/nrtf data/data tri gen"
    all_files = glob.glob(os.path.join(DATA_DIR, "*.xlsx"))
    
    results = []
    
    for file in all_files:
        try:
            df = pd.read_excel(file, header=None)
            # Simplified logic for recovery: find rows with 'Puissance' or 'Energy'
            for r in range(len(df)):
                label = str(df.iloc[r, 1]).lower()
                if "puissance" in label or "energy" in label:
                    val = df.iloc[r, 4]
                    if pd.notna(val):
                        results.append({
                            "timestamp": os.path.basename(file).split("_")[0],
                            "label": df.iloc[r, 1],
                            "value": val,
                            "energy_kwh": normalization.normalize_to_kwh(val, "kWh")
                        })
        except Exception as e:
            print(f"Error processing {file}: {e}")
            
    pd.DataFrame(results).to_csv("historical_dataset.csv", index=False)
    print(f"Extracted {len(results)} rows to historical_dataset.csv")

if __name__ == "__main__":
    extract_all()
