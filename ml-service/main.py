"""
main.py — MoveCar ML Service (FastAPI)
Deploy sur Render.com (Python Web Service)
"""

import os
import json
import logging
import numpy as np
import pandas as pd
import joblib

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from pathlib import Path

# ── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("movecar-ml")

# ── Chargement du modèle au démarrage ───────────────────────────────────────
MODEL = None
METADATA = None

def load_model():
    global MODEL, METADATA
    model_path = Path(os.getenv("MODEL_PATH", "movecar_model.pkl"))
    meta_path  = Path(os.getenv("META_PATH",  "model_metadata.json"))

    if not model_path.exists():
        # Télécharger depuis Supabase Storage si disponible
        _download_model_from_supabase(model_path)

    MODEL    = joblib.load(model_path)
    METADATA = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    logger.info(f"✅ Modèle chargé depuis {model_path}")


def _download_model_from_supabase(dest: Path):
    """Télécharge le modèle depuis Supabase Storage à la volée."""
    import httpx
    url    = os.getenv("SUPABASE_URL")
    key    = os.getenv("SUPABASE_SERVICE_KEY")
    bucket = os.getenv("MODEL_BUCKET", "ml-models")
    file   = os.getenv("MODEL_FILE",   "movecar_model.pkl")

    if not url or not key:
        raise RuntimeError("Variables Supabase manquantes pour télécharger le modèle.")

    dl_url = f"{url}/storage/v1/object/{bucket}/{file}"
    headers = {"Authorization": f"Bearer {key}"}

    logger.info(f"Téléchargement du modèle depuis {dl_url}...")
    with httpx.stream("GET", dl_url, headers=headers) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_bytes():
                f.write(chunk)
    logger.info("✅ Modèle téléchargé depuis Supabase Storage")


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="MoveCar ML Service",
    version="1.0.0",
    description="Microservice de scoring ML pour convoyeurs de véhicules",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ── Auth interne (clé partagée avec NestJS) ───────────────────────────────
INTERNAL_API_KEY = os.getenv("INTERNAL_ML_API_KEY", "change_me_in_env")

def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Clé API invalide")
    return True


# ── Schémas Pydantic ─────────────────────────────────────────────────────────
class ScoringInput(BaseModel):
    # Profil convoyeur
    delivery_person_age: float = Field(35, ge=18, le=90)
    vehicle_condition:   int   = Field(1,  ge=0,  le=2)
    delivery_person_ratings: float = Field(5.0, ge=1.0, le=5.0)

    # Mission
    distance_km:        float  = Field(100, ge=0.5,  le=1500)
    pickup_delay_min:   float  = Field(5,   ge=0,    le=300)
    delivery_delay_min: float  = Field(0,   ge=0)
    order_hour:         int    = Field(9,   ge=0,    le=23)
    order_day:          int    = Field(2,   ge=0,    le=6)

    # Catégoriels
    weather_conditions: str    = Field("Sunny")
    type_of_order:      str    = Field("Meal")
    city:               str    = Field("Urban")

    @field_validator("weather_conditions")
    @classmethod
    def validate_weather(cls, v):
        allowed = ["Sunny", "Cloudy", "Windy", "Fog", "Stormy", "Sandstorms"]
        if v not in allowed:
            raise ValueError(f"weather_conditions doit être parmi : {allowed}")
        return v

    @field_validator("city")
    @classmethod
    def validate_city(cls, v):
        allowed = ["Metropolitian", "Urban", "Semi-Urban"]
        if v not in allowed:
            raise ValueError(f"city doit être parmi : {allowed}")
        return v


class ScoringOutput(BaseModel):
    ml_score:      float
    probabilities: dict[str, float]
    predicted_class: int
    predicted_label: str


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":       "ok",
        "model_loaded": MODEL is not None,
        "version":      METADATA.get("version", "unknown"),
    }


@app.post("/predict", response_model=ScoringOutput)
def predict(payload: ScoringInput, _: bool = Depends(verify_api_key)):
    if MODEL is None:
        raise HTTPException(status_code=503, detail="Modèle non chargé")

    NUM = [
        "Delivery_person_Age",
        "Vehicle_condition",
        "distance_km",
        "pickup_delay_min",
        "Order_Hour",
        "Order_Day",
    ]
    CAT = ["Weather_conditions", "Type_of_order", "City"]

    input_df = pd.DataFrame([{
        "Delivery_person_Age":  payload.delivery_person_age,
        "Vehicle_condition":    payload.vehicle_condition,
        "distance_km":          payload.distance_km,
        "pickup_delay_min":     payload.pickup_delay_min,
        "Order_Hour":           payload.order_hour,
        "Order_Day":            payload.order_day,
        "Weather_conditions":   payload.weather_conditions,
        "Type_of_order":        payload.type_of_order,
        "City":                 payload.city,
    }])

    try:
        probas          = MODEL.predict_proba(input_df)[0]
        predicted_class = int(MODEL.predict(input_df)[0])
        n_classes       = len(probas)
        weights         = np.linspace(0, 100, n_classes)
        ml_score        = float(np.clip(np.dot(probas, weights), 0, 100))

        label_map = {0: "Faible", 1: "Moyen", 2: "Bon", 3: "Excellent"}
        proba_dict = {
            label_map.get(i, str(i)): round(float(p), 4)
            for i, p in enumerate(probas)
        }

        return ScoringOutput(
            ml_score=round(ml_score, 2),
            probabilities=proba_dict,
            predicted_class=predicted_class,
            predicted_label=label_map.get(predicted_class, "Inconnu"),
        )
    except Exception as e:
        logger.error(f"Erreur prédiction : {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/metadata")
def get_metadata(_: bool = Depends(verify_api_key)):
    return METADATA or {"message": "Pas de métadonnées"}
