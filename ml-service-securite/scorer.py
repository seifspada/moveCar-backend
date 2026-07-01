# securite-ml-service/scorer.py
import numpy as np
import pandas as pd


def clamp(value, minimum=0.0, maximum=100.0):
    return max(minimum, min(maximum, float(value)))


def parse_gps_text(gps_text):
    rows = []
    if gps_text is None or str(gps_text).strip() == "":
        return pd.DataFrame(columns=["timestamp", "current_speed"])
    for line in str(gps_text).strip().splitlines():
        line = line.strip().replace(";", ",")
        if line == "" or "timestamp" in line.lower():
            continue
        parts = line.split(",")
        if len(parts) != 2:
            continue
        try:
            rows.append({
                "timestamp": float(parts[0].strip()),
                "current_speed": max(0.0, float(parts[1].strip())),
            })
        except Exception:
            continue
    df = pd.DataFrame(rows)
    if not df.empty:
        df = df.sort_values("timestamp").reset_index(drop=True)
    return df


def get_driving_thresholds_by_weather(rain_state):
    rain_value = str(rain_state).strip().lower()
    is_rain = rain_state is True or rain_value in ["pluie", "oui", "yes", "true", "1"]
    if is_rain:
        return {
            "weather_text": "Pluie",
            "speed_limit": 110.0,
            "harsh_acceleration_threshold": 2.5,
            "harsh_braking_threshold": -2.5,
            "high_speed_threshold": 105.0,
        }
    return {
        "weather_text": "Pas de pluie",
        "speed_limit": 130.0,
        "harsh_acceleration_threshold": 3.0,
        "harsh_braking_threshold": -3.0,
        "high_speed_threshold": 120.0,
    }


class RealisticDrivingScoreModel:
    def __init__(
        self,
        speed_limit=130.0,
        harsh_acceleration_threshold=3.0,
        harsh_braking_threshold=-3.0,
        high_speed_threshold=120.0,
    ):
        self.speed_limit = float(speed_limit)
        self.harsh_acceleration_threshold = float(harsh_acceleration_threshold)
        self.harsh_braking_threshold = float(harsh_braking_threshold)
        self.high_speed_threshold = float(high_speed_threshold)

    @staticmethod
    def kmh_to_ms(speed_kmh):
        return float(speed_kmh) / 3.6

    def speed_penalty_rate(self, excess_speed):
        if excess_speed <= 0:
            return 0.0
        if excess_speed <= 10:
            return 0.10
        if excess_speed <= 20:
            return 0.20
        if excess_speed <= 30:
            return 0.35
        return 0.60

    # ⬇️ collez ici EXACTEMENT votre méthode .analyze(...)
    # du fichier finalmodelsecurityconvoyeur.py (lignes 699-873)
    def analyze(self, df_gps):
        ...

    def empty_result(self, message):
        return {"score": 0.0, "label": "Erreur", "error": message}


def analyze_driving_score(gps_text, rain_state="Pas de pluie"):
    df_gps = parse_gps_text(gps_text)
    if df_gps.empty:
        return {"score": 0.0, "label": "Erreur", "error": "Aucune donnee GPS valide."}
    thresholds = get_driving_thresholds_by_weather(rain_state)
    model = RealisticDrivingScoreModel(
        speed_limit=thresholds["speed_limit"],
        harsh_acceleration_threshold=thresholds["harsh_acceleration_threshold"],
        harsh_braking_threshold=thresholds["harsh_braking_threshold"],
        high_speed_threshold=thresholds["high_speed_threshold"],
    )
    result = model.analyze(df_gps)
    result["weather_text"] = thresholds["weather_text"]
    return result