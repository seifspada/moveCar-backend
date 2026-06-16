"""
export_model.py
───────────────
Exécuter CE SCRIPT dans votre notebook Kaggle/Colab
après l'entraînement du modèle pour sauvegarder le pipeline.

Usage :
    python export_model.py
"""

import joblib
import json
import os

# ── 1. Sauvegarder le pipeline sklearn complet ──────────────────────────────
# `model` = votre Pipeline([("pre", pre), ("model", ensemble)])
# Remplacez par votre variable après le training

joblib.dump(model, "movecar_model.pkl", compress=3)
print("✅ Modèle sauvegardé : movecar_model.pkl")

# ── 2. Sauvegarder les métadonnées ──────────────────────────────────────────
metadata = {
    "version": "1.0.0",
    "num_features": [
        "Delivery_person_Age",
        "Vehicle_condition",
        "distance_km",
        "pickup_delay_min",
        "Order_Hour",
        "Order_Day",
    ],
    "cat_features": [
        "Weather_conditions",
        "Type_of_order",
        "City",
    ],
    "class_labels": {
        "0": "Faible",
        "1": "Moyen",
        "2": "Bon",
        "3": "Excellent",
    },
    "weather_options": ["Sunny", "Cloudy", "Windy", "Fog", "Stormy", "Sandstorms"],
    "city_options": ["Metropolitian", "Urban", "Semi-Urban"],
    "type_order_options": ["Meal", "Snack", "Drinks", "Buffet"],
}

with open("model_metadata.json", "w") as f:
    json.dump(metadata, f, indent=2, ensure_ascii=False)

print("✅ Métadonnées sauvegardées : model_metadata.json")
print(f"\nTaille du modèle : {os.path.getsize('movecar_model.pkl') / 1024 / 1024:.2f} MB")
