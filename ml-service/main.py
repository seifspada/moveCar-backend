"""
main.py — MoveCar ML Service (FastAPI)
Logique alignée sur FinalConvoyeurModel-Logistique.py
"""

import os
from dotenv import load_dotenv
load_dotenv()

import json
import logging
import numpy as np
import pandas as pd
import joblib

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("movecar-ml")

MODEL    = None
METADATA = None

def load_model():
    global MODEL, METADATA
    model_path = Path(os.getenv("MODEL_PATH", "movecar_model.pkl"))
    meta_path  = Path(os.getenv("META_PATH",  "model_metadata.json"))
    if not model_path.exists():
        _download_model_from_supabase(model_path)
    MODEL    = joblib.load(model_path)
    METADATA = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    logger.info(f"✅ Modèle chargé depuis {model_path}")


def _download_model_from_supabase(dest: Path):
    import httpx
    url    = os.getenv("SUPABASE_URL")
    key    = os.getenv("SUPABASE_SERVICE_KEY")
    bucket = os.getenv("MODEL_BUCKET", "ml-models")
    file   = os.getenv("MODEL_FILE",   "movecar_model.pkl")
    if not url or not key:
        raise RuntimeError("Variables Supabase manquantes.")
    dl_url  = f"{url}/storage/v1/object/{bucket}/{file}"
    headers = {"Authorization": f"Bearer {key}"}
    with httpx.stream("GET", dl_url, headers=headers) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_bytes():
                f.write(chunk)
    logger.info("✅ Modèle téléchargé depuis Supabase")


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield

app = FastAPI(
    title="MoveCar ML Service",
    version="2.0.0",
    description="Scoring convoyeurs — logique alignée sur Colab",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

INTERNAL_API_KEY = os.getenv("INTERNAL_ML_API_KEY", "change_me_in_env")

def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Clé API invalide")
    return True


# ── Schémas ──────────────────────────────────────────────────────────────────
class ScoringInput(BaseModel):
    # Profil
    delivery_person_age:     float = Field(35,  ge=18,   le=90)
    vehicle_condition:       int   = Field(1,   ge=0,    le=2)
    delivery_person_ratings: float = Field(4.0, ge=1.0,  le=5.0)
    # Mission
    distance_km:             float = Field(100, ge=0.5,  le=1000)
    pickup_delay_min:        float = Field(5,   ge=0,    le=300)
    delivery_delay_min:      float = Field(0,   ge=0,    le=300)
    order_hour:              int   = Field(9,   ge=0,    le=23)
    order_day:               int   = Field(2,   ge=0,    le=6)
    # Catégoriels (valeurs du dataset Zomato mappées)
    weather_conditions:      str   = Field("Sunny")
    type_of_order:           str   = Field("Meal")
    city:                    str   = Field("Urban")
    # MoveCar spécifique (pour score métier)
    mission_type:            str   = Field("Véhicule Neuf")
    route_type:              str   = Field("Autoroute / Inter-urbain")

    @field_validator("weather_conditions")
    @classmethod
    def validate_weather(cls, v):
        allowed = ["Sunny", "Cloudy", "Windy", "Fog", "Stormy", "Sandstorms"]
        if v not in allowed:
            raise ValueError(f"Doit être parmi : {allowed}")
        return v

    @field_validator("city")
    @classmethod
    def validate_city(cls, v):
        allowed = ["Metropolitian", "Urban", "Semi-Urban"]
        if v not in allowed:
            raise ValueError(f"Doit être parmi : {allowed}")
        return v

    @field_validator("mission_type")
    @classmethod
    def validate_mission(cls, v):
        allowed = ["Véhicule Neuf", "Véhicule d'Occasion",
                   "Véhicule en Panne (Assistance)", "Lot de véhicules / Flotte"]
        if v not in allowed:
            raise ValueError(f"Doit être parmi : {allowed}")
        return v

    @field_validator("route_type")
    @classmethod
    def validate_route(cls, v):
        allowed = ["Autoroute / Inter-urbain", "Zone Urbaine / Ville", "Zone Rurale / Difficile"]
        if v not in allowed:
            raise ValueError(f"Doit être parmi : {allowed}")
        return v


class ScoringOutput(BaseModel):
    ml_score:          float
    probabilities:     dict[str, float]
    predicted_class:   int
    predicted_label:   str
    score_metier:      float
    score_final:       float
    evaluation:        str


# ── Fonctions de score métier (identiques au Colab) ──────────────────────────
def _clip(x, lo, hi):
    return max(lo, min(hi, x))

def _score_by_points(value: float, points: list) -> float:
    points = sorted(points, key=lambda p: p[0])
    if value <= points[0][0]:
        return float(points[0][1])
    if value >= points[-1][0]:
        return float(points[-1][1])
    for i in range(len(points) - 1):
        x1, y1 = points[i]
        x2, y2 = points[i + 1]
        if x1 <= value <= x2:
            return float(y1 + (value - x1) / (x2 - x1) * (y2 - y1))
    return float(points[-1][1])

def _score_age(age: float) -> float:
    if age <= 40:
        s = 55 + ((age - 18) / (40 - 18)) * 45
    else:
        s = 100 - ((age - 40) / (75 - 40)) * 55
    return _clip(s, 30, 100)

def _score_depart(retard: float) -> float:
    return _clip(_score_by_points(retard, [
        (0,100),(5,96),(10,88),(15,78),(20,66),
        (30,48),(40,32),(50,20),(60,10),(90,0),(300,0)
    ]), 0, 100)

def _score_livraison(retard: float) -> float:
    return _clip(_score_by_points(retard, [
        (0,100),(5,95),(10,88),(20,72),(30,55),
        (40,38),(50,25),(60,15),(90,0),(300,0)
    ]), 0, 100)

def _score_rating_agent(rating: float) -> float:
    return _clip(_score_by_points(rating, [
        (1,20),(2,40),(3,65),(4,85),(5,100)
    ]), 0, 100)

def _score_distance(dist: float) -> float:
    return _score_by_points(dist, [
        (0.5,45),(5,50),(10,56),(20,63),(50,72),
        (100,80),(200,88),(400,94),(600,98),(800,100),(1000,100)
    ])

def _score_total_process(retard: float) -> float:
    return _score_by_points(retard, [
        (0,100),(10,92),(20,78),(40,55),(60,35),(90,15),(120,5),(300,0)
    ])

def compute_score_metier(
    age, vehicle_condition, agent_rating,
    distance_km, pickup_delay_min, delivery_delay_min,
    order_hour, order_day,
    weather, mission_type, route_type,
) -> float:
    """Reproduction exacte du score métier du Colab (pondération 90%)."""

    temps_par_km = {
        "Autoroute / Inter-urbain": 1.4,
        "Zone Urbaine / Ville":     2.8,
        "Zone Rurale / Difficile":  2.2,
    }
    coef_route    = temps_par_km.get(route_type, 1.8)
    time_taken    = (distance_km * coef_route) + 15   # 15 min fixe

    score_distance     = _score_distance(distance_km)
    score_depart       = _score_depart(pickup_delay_min)
    score_livraison    = _score_livraison(delivery_delay_min)
    score_agent        = _score_rating_agent(agent_rating)
    score_age          = _score_age(age)
    score_vehicle      = {0: 45, 1: 72, 2: 96}.get(vehicle_condition, 72)
    score_process      = _score_total_process(pickup_delay_min)

    score_weather = {
        "Sunny": 100, "Cloudy": 93, "Windy": 86,
        "Fog": 76, "Stormy": 62, "Sandstorms": 66,
    }.get(weather, 90)

    score_mission = {
        "Véhicule Neuf":                  100,
        "Véhicule d'Occasion":             95,
        "Véhicule en Panne (Assistance)":  82,
        "Lot de véhicules / Flotte":       88,
    }.get(mission_type, 95)

    score_route = {
        "Autoroute / Inter-urbain": 100,
        "Zone Urbaine / Ville":      94,
        "Zone Rurale / Difficile":   88,
    }.get(route_type, 94)

    score_hour = (
        72  if (order_hour >= 22 or order_hour <= 5)
        else 88 if (7 <= order_hour <= 10 or 17 <= order_hour <= 20)
        else 100
    )
    score_day = 94 if order_day in [5, 6] else 100

    # ── Pondération identique au Colab ───────────────────────────────────────
    score_metier = (
        score_depart       * 0.25 +
        score_livraison    * 0.21 +
        score_distance     * 0.17 +
        score_agent        * 0.12 +
        100                * 0.03 +   # score_temps_estime = 100 fixe
        score_process      * 0.03 +
        score_age          * 0.04 +
        score_vehicle      * 0.04 +
        score_weather      * 0.035 +
        score_mission      * 0.025 +
        score_route        * 0.02 +
        score_hour         * 0.015 +
        score_day          * 0.015
    )

    return _clip(score_metier, 0, 100)


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

    # ── Mapping MoveCar → Zomato (identique au Colab) ────────────────────────
    mapping_mission = {
        "Véhicule Neuf":                  "Meal",
        "Véhicule d'Occasion":            "Snack",
        "Véhicule en Panne (Assistance)": "Drinks",
        "Lot de véhicules / Flotte":      "Buffet",
    }
    mapping_route = {
        "Zone Urbaine / Ville":     "Metropolitian",
        "Autoroute / Inter-urbain": "Urban",
        "Zone Rurale / Difficile":  "Semi-Urban",
    }

    # ── Temps estimé automatique (identique au Colab) ────────────────────────
    temps_par_km = {
        "Autoroute / Inter-urbain": 1.4,
        "Zone Urbaine / Ville":     2.8,
        "Zone Rurale / Difficile":  2.2,
    }
    coef_route     = temps_par_km.get(payload.route_type, 1.8)
    time_taken_auto = (payload.distance_km * coef_route) + 15
    speed_min_per_km = time_taken_auto / payload.distance_km

    # ── Input XGBoost — VALEURS FIGÉES comme dans le Colab ───────────────────
    # Le Colab envoie age=35, vehicle=1, pickup_delay=5, retard=0 au modèle ML
    # (les vrais paramètres sont utilisés uniquement dans le score métier)
    input_df = pd.DataFrame([{
        "Delivery_person_Age":  35,
        "Vehicle_condition":    1,
        "distance_km":          payload.distance_km,
        "pickup_delay_min":     5,
        "retard_livraison_min": 0,
        "Order_Hour":           payload.order_hour,
        "Order_Day":            payload.order_day,
        "Time_taken (min)":     time_taken_auto,
        "speed_min_per_km":     speed_min_per_km,
        "total_process_min":    time_taken_auto + 5,
        "Weather_conditions":   payload.weather_conditions,
        "Type_of_order":        mapping_mission.get(payload.mission_type, "Meal"),
        "City":                 mapping_route.get(payload.route_type, "Urban"),
    }])

    try:
        probas          = MODEL.predict_proba(input_df)[0]
        predicted_class = int(MODEL.predict(input_df)[0])
        n_classes       = len(probas)
        weights         = np.linspace(0, 100, n_classes)
        ml_score        = float(np.clip(np.dot(probas, weights), 0, 100))

        # ── Score métier (90% du score final — identique au Colab) ──────────
        score_metier = compute_score_metier(
            age=payload.delivery_person_age,
            vehicle_condition=payload.vehicle_condition,
            agent_rating=payload.delivery_person_ratings,
            distance_km=payload.distance_km,
            pickup_delay_min=payload.pickup_delay_min,
            delivery_delay_min=payload.delivery_delay_min,
            order_hour=payload.order_hour,
            order_day=payload.order_day,
            weather=payload.weather_conditions,
            mission_type=payload.mission_type,
            route_type=payload.route_type,
        )

        # ── Score final hybride (identique au Colab) ─────────────────────────
        score_final = (ml_score * 0.10) + (score_metier * 0.90)

        # Malus retard combiné (identique au Colab)
        malus = 0
        if payload.pickup_delay_min >= 30 and payload.delivery_delay_min >= 30:
            malus = 15
        elif payload.pickup_delay_min >= 20 and payload.delivery_delay_min >= 20:
            malus = 10
        elif payload.pickup_delay_min >= 10 and payload.delivery_delay_min >= 10:
            malus = 5

        score_final = float(np.clip(score_final - malus, 0, 100))

        # Évaluation texte
        if score_final >= 80:
            evaluation = "🟢 Top Convoyeur — Haute Fiabilité"
        elif score_final >= 60:
            evaluation = "🟡 Bon Convoyeur — Standard"
        elif score_final >= 40:
            evaluation = "🟠 Convoyeur Moyen — À surveiller"
        else:
            evaluation = "🔴 Risque élevé — Ponctualité critique"

        label_map = {0: "Faible", 1: "Moyen", 2: "Bon", 3: "Excellent"}
        proba_dict = {
            label_map.get(i, str(i)): round(float(p), 4)
            for i, p in enumerate(probas)
        }

        logger.info(
            f"ML: {ml_score:.1f} | Métier: {score_metier:.1f} | "
            f"Malus: -{malus} | Final: {score_final:.1f}"
        )

        return ScoringOutput(
            ml_score=round(ml_score, 2),
            probabilities=proba_dict,
            predicted_class=predicted_class,
            predicted_label=label_map.get(predicted_class, "Inconnu"),
            score_metier=round(score_metier, 2),
            score_final=round(score_final, 2),
            evaluation=evaluation,
        )

    except Exception as e:
        logger.error(f"❌ Erreur : {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/metadata")
def get_metadata(_: bool = Depends(verify_api_key)):
    return METADATA or {"message": "Pas de métadonnées"}