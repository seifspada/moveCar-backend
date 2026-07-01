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

    def score_label(self, score):
        if score >= 85:
            return "Conduite excellente"
        if score >= 70:
            return "Conduite correcte"
        if score >= 50:
            return "Conduite a surveiller"
        if score >= 25:
            return "Conduite risquee"
        return "Conduite dangereuse"

    def analyze(self, df_gps):
        if df_gps is None or df_gps.empty or len(df_gps) < 2:
            return self.empty_result("Donnees GPS insuffisantes pour l'analyse.")

        speeds = df_gps["current_speed"].astype(float).values
        timestamps = df_gps["timestamp"].astype(float).values

        average_speed = float(np.mean(speeds))
        max_speed = float(np.max(speeds))

        # ── Vitesse excessive ────────────────────────────────────────────
        overspeed_mask = speeds > self.speed_limit
        overspeed_count = int(np.sum(overspeed_mask))

        speed_penalty_total = 0.0
        for s in speeds[overspeed_mask]:
            excess = s - self.speed_limit
            speed_penalty_total += self.speed_penalty_rate(excess) * 10.0

        # ── Accélérations / freinages brusques ──────────────────────────
        speeds_ms = np.array([self.kmh_to_ms(s) for s in speeds])
        dt = np.diff(timestamps)
        dt[dt == 0] = 0.001  # évite division par zéro
        acceleration = np.diff(speeds_ms) / dt

        harsh_acceleration_count = int(np.sum(acceleration > self.harsh_acceleration_threshold))
        harsh_braking_count = int(np.sum(acceleration < self.harsh_braking_threshold))

        harsh_event_penalty = (harsh_acceleration_count * 4.0) + (harsh_braking_count * 5.0)

        # ── Score final ──────────────────────────────────────────────────
        score = 100.0 - speed_penalty_total - harsh_event_penalty
        score = clamp(score, 0.0, 100.0)

        return {
            "score": round(score, 2),
            "label": self.score_label(score),
            "rule_behavior_label": self.score_label(score),
            "average_speed": round(average_speed, 2),
            "max_speed": round(max_speed, 2),
            "overspeed_count": overspeed_count,
            "harsh_acceleration_count": harsh_acceleration_count,
            "harsh_braking_count": harsh_braking_count,
            "speed_limit": self.speed_limit,
        }

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