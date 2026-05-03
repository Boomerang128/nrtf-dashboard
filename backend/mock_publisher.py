import asyncio
import json
import random
import websockets
from datetime import datetime

async def publish():
    uri = "ws://localhost:8000/ws"
    async with websockets.connect(uri) as websocket:
        while True:
            data = {
                "id": f"sensor_{random.randint(1, 5)}",
                "current": random.uniform(10, 25),
                "energy_kwh": random.uniform(100, 500),
                "vibration": random.uniform(0.01, 0.05),
                "pressure_hpa": random.uniform(980, 1020),
                "temp_c": random.uniform(40, 85),
                "unit": "kWh"
            }
            await websocket.send(json.dumps(data))
            print(f"Published: {data['id']}")
            await asyncio.sleep(2)

if __name__ == "__main__":
    asyncio.run(publish())
