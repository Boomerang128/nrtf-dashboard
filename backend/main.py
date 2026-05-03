import os
import json
import asyncio
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

import normalization
from isolation_forest import IsolationForest

# --- Logging Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend")

# --- App Config ---
app = FastAPI(title="NRTF Hybrid Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Setup ---
MONGO_URL = os.getenv("MONGO_URL", "mongodb://mongodb:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.nrtf_db
collection = db.telemetry

# --- Models ---
class SensorReading(BaseModel):
    id: str
    current: float
    energy_kwh: float
    vibration: float
    pressure_hpa: float
    temp_c: float
    timestamp: Optional[datetime] = None

# --- AI Model Loader ---
MODEL_PATH = "model.json"
if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, "r") as f:
        model_data = json.load(f)
        detector = IsolationForest.from_dict(model_data)
        logger.info("Loaded anomaly detector from model.json")
else:
    detector = IsolationForest(n_trees=100, sample_size=256)
    logger.info("Initialized new anomaly detector")

# --- WebSocket Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

# --- Endpoints ---
@app.get("/history")
async def get_history():
    cursor = collection.find().sort("timestamp", -1).limit(50)
    data = await cursor.to_list(length=50)
    # Convert ObjectId to string
    for item in data:
        item["_id"] = str(item["_id"])
    return data[::-1]

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            reading_dict = json.loads(data)
            
            # 1. Normalize Energy (kWh)
            # If incoming data is from a gas meter in Nm3, convert to kWh
            if "unit" in reading_dict and reading_dict["unit"] == "Nm3":
                reading_dict["energy_kwh"] = normalization.normalize_to_kwh(reading_dict["value"], "Nm3")
            
            # 2. Run Anomaly Detection
            features = [
                reading_dict.get("current", 0),
                reading_dict.get("vibration", 0),
                reading_dict.get("temp_c", 0)
            ]
            score = detector.anomaly_score(features)
            is_anomaly = score > 0.6  # Threshold
            
            reading_dict["is_anomaly"] = bool(is_anomaly)
            reading_dict["anomaly_score"] = float(score)
            reading_dict["confidence"] = float(score * 100)
            reading_dict["timestamp"] = datetime.utcnow().isoformat()
            
            # 3. Store in DB
            await collection.insert_one(reading_dict.copy())
            
            # 4. Broadcast to frontend
            reading_dict["_id"] = str(reading_dict.get("_id", ""))
            await manager.broadcast(reading_dict)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
