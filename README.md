# Waste Heat Recovery Opportunity Design (Track B)

## Overview
This project presents a systematic methodology and a specialized tool to identify, characterize, and prioritize waste heat recovery opportunities at industrial sites. 

This work was developed for **ReTeqFusion** to demonstrate how telemetry data can be transformed into actionable energy-saving scenarios.

## Key Components

### 1. Systematic Identification Tool (`heat_source_analyzer.py`)
A Python-based utility that scans industrial sensor logs (Excel/CSV) to:
- Detect temperature gradients ($\Delta T$) across process loops.
- Correlate thermal flux with fuel consumption.
- Rank sources by **Exergy Grade** (temperature quality).

**Usage:**
```bash
python heat_source_analyzer.py
```

### 2. Strategic Design Report (`waste_heat_recovery_design.md`)
A comprehensive document that outlines:
- **Characterization**: Temperature levels, thermal flux, and availability profiles of identified sources.
- **Prioritization Framework**: The *ReTeq Recovery Matrix (RRM)* for scoring opportunities based on energy potential, CO₂ reduction, and ROI.
- **Recovery Scenarios**: Three concrete implementations (ORC Power Generation, Absorption Cooling, and Boiler Pre-heating).

## Methodology: The ReTeq Recovery Matrix (RRM)
We prioritize opportunities using a weighted scoring system (1-10):
- **Exergy Grade (EG)**: High temperature = higher potential for complex recovery.
- **Resource Volume (RV)**: Total available thermal power (kW).
- **Implementation Complexity (IC)**: Ease of physical integration.
- **Economic Viability (EV)**: Estimated payback period.

## Conclusion
By shifting from "Monitoring" to "Recovery," this methodology enables industrial sites to close the energy loop, significantly reducing both fuel costs and environmental impact.
