def normalize_to_kwh(value, unit):
    """
    Normalizes various energy units to kWh based on ReTeqFusion physical constants.
    """
    factors = {
        "kWh": 1.0,
        "MWh": 1000.0,
        "Gcal": 1163.0,
        "GJ": 277.78,
        "BTU": 0.00029307,
        "toe": 11630.0,  # Tonne of Oil Equivalent
        "thermie": 1.163,
        "Nm3": 10.56,    # Natural Gas average (Higher Heating Value)
    }
    
    return value * factors.get(unit, 1.0)

def calculate_delta(current_reading, previous_reading):
    """
    Handles cumulative meter resets and calculates interval consumption.
    """
    if previous_reading is None:
        return 0.0
    
    delta = current_reading - previous_reading
    
    # Handle meter resets (if delta is negative, assume 0 for this interval)
    if delta < 0:
        return 0.0
        
    return delta
