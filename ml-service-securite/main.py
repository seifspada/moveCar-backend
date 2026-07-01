import os
import sys
import joblib
import scorer  # importe tout le module
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from scorer import analyze_driving_score

app = FastAPI(title="Convoyeur Securite ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Sécurité : même mécanisme que movecar mais clé séparée ─────────────────
INTERNAL_SECURITE_API_KEY = os.getenv("INTERNAL_SECURITE_API_KEY", "")

def verify_api_key(x_api_key: Optional[str] = Header(None)):
    if INTERNAL_SECURITE_API_KEY and x_api_key != INTERNAL_SECURITE_API_KEY:
        raise HTTPException(401, detail="Clé API invalide")
    return True

# ── Compat pickle : le modèle a été exporté depuis Colab où TOUT scorer.py ─
# vivait dans __main__ (classes ET fonctions). On copie automatiquement
# tout ce qui est défini dans le module scorer vers __main__, pour que
# joblib.load() retrouve n'importe quelle référence sans qu'on ait à les
# lister une par une.
main_module = sys.modules["__main__"]
for _name in dir(scorer):
    if not _name.startswith("_"):
        setattr(main_module, _name, getattr(scorer, _name))

# ── Chargement modèle ────────────────────────────────────────────────────
MODEL_PATH = os.getenv("MODEL_PATH", "convoyeur_scorer_securite.pkl")
bundle = {}
gps_behavior_model = None
try:
    bundle = joblib.load(MODEL_PATH)
    gps_behavior_model = bundle.get("gps_behavior_model")
    print(f"✅ Modèle sécurité chargé (version {bundle.get('version', '?')})")
except Exception as e:
    print(f"⚠️ Modèle sécurité non chargé : {e}")

# ── reste du fichier inchangé ──
# ── reste du fichier inchangé ──
# ── Schémas ───────────────────────────────────────────────────────────────
class ScoreRequest(BaseModel):
    gps_text: str
    rain_state: str = "Pas de pluie"

class ScoreResponse(BaseModel):
    score: float
    label: str
    weather_text: str
    speed_limit: float
    average_speed: float
    max_speed: float
    overspeed_count: int
    harsh_acceleration_count: int
    harsh_braking_count: int

# ── Routes ────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "convoyeur-securite-ml-service",
        "model_loaded": gps_behavior_model is not None,
    }

@app.post("/score", response_model=ScoreResponse, dependencies=[])
def get_score(req: ScoreRequest, x_api_key: Optional[str] = Header(None)):
    verify_api_key(x_api_key)
    result = analyze_driving_score(req.gps_text, req.rain_state)
    if result.get("label") == "Erreur":
        raise HTTPException(400, detail=result.get("error"))
    return ScoreResponse(
        score=result["score"],
        label=result.get("rule_behavior_label", result.get("label", "")),
        weather_text=result.get("weather_text", ""),
        speed_limit=result.get("speed_limit", 130.0),
        average_speed=result.get("average_speed", 0.0),
        max_speed=result.get("max_speed", 0.0),
        overspeed_count=result.get("overspeed_count", 0),
        harsh_acceleration_count=result.get("harsh_acceleration_count", 0),
        harsh_braking_count=result.get("harsh_braking_count", 0),
    )