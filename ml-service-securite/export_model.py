"""
export_model.py — SÉCURITÉ CONVOYEUR
─────────────────────────────────────
Exécuter dans Colab après la cellule d'entraînement de
`gps_behavior_model` (XGBoost + RandomForest) ET après avoir
défini `RealisticDrivingScoreModel`.

Usage : python export_model.py
"""

import joblib
import json
import os

# ── 1. Sauvegarder le bundle complet ────────────────────────────────────────
# gps_behavior_model = votre Pipeline([...]) déjà entraîné (.fit())

bundle = {
    "gps_behavior_model": gps_behavior_model,
    "label_names": label_names,
    "class_remap_inv": class_remap_inv,
    "GPS_FEATURES": GPS_FEATURES,
    "version": "1.0.0",
}

joblib.dump(bundle, "securite_model.pkl", compress=3)
print("✅ Modèle sauvegardé : securite_model.pkl")

# ── 2. Sauvegarder les métadonnées ──────────────────────────────────────────
metadata = {
    "version": "1.0.0",
    "model_type": "RealisticDrivingScoreModel + gps_behavior_model",
    "input_format": "gps_text (timestamp,speed par ligne)",
    "weather_options": ["Pluie", "Pas de pluie"],
    "thresholds": {
        "pluie":      {"speed_limit": 110.0, "high_speed_threshold": 105.0},
        "sans_pluie": {"speed_limit": 130.0, "high_speed_threshold": 120.0},
    },
    "score_labels": {
        "85-100": "Conduite excellente",
        "70-84":  "Conduite correcte",
        "50-69":  "Conduite a surveiller",
        "25-49":  "Conduite risquee",
        "0-24":   "Conduite dangereuse",
    },
}

with open("securite_metadata.json", "w") as f:
    json.dump(metadata, f, indent=2, ensure_ascii=False)

print("✅ Métadonnées sauvegardées : securite_metadata.json")
print(f"\nTaille du modèle : {os.path.getsize('securite_model.pkl') / 1024 / 1024:.2f} MB")