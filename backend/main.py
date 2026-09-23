# =========================================================
# CITY NERVE — Predictive Urban Infrastructure Nervous System
# Backend: FastAPI + Supabase + Random Forest + SHAP
# Version: 6.0.0
#
# LOCATION-AWARE UPGRADE
# ---------------------------------------------------------
# Every clicked / searched / GPS location can be analyzed.
#
# LIVE:
#   - Open-Meteo weather
#   - OpenStreetMap / Nominatim geocoding
#
# LOCATION CONTEXT:
#   - OpenStreetMap nearby roads
#   - waterways
#   - buildings
#   - infrastructure density
#
# DATABASE:
#   - CITY NERVE Supabase zones/incidents
#
# DEMO CONTEXT:
#   - traffic when no live traffic provider is connected
#
# ML:
#   - Random Forest
#   - SHAP
#
# IMPORTANT:
#   This system provides decision support only.
# =========================================================

from __future__ import annotations

import os
import math
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
import joblib
import numpy as np
import pandas as pd
import shap

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from supabase import create_client, Client
except Exception:
    create_client = None
    Client = Any


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.getenv(
    "CITY_NERVE_MODEL_PATH",
    os.path.join(BASE_DIR, "city_nerve_risk_model.pkl")
)

CONFIG_PATH = os.getenv(
    "CITY_NERVE_CONFIG_PATH",
    os.path.join(BASE_DIR, "city_nerve_config.pkl")
)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

NOMINATIM_URL = "https://nominatim.openstreetmap.org"

# Overpass provides OpenStreetMap infrastructure objects.
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Only use a Supabase zone when it is geographically close.
MAX_ZONE_DISTANCE_KM = 25.0

# OSM search radius around an arbitrary clicked location.
OSM_RADIUS_METERS = 1500

APP_VERSION = "6.0.0"


# =========================================================
# LOGGING
# =========================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger("city_nerve")


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="CITY NERVE API",
    description=(
        "Predictive Urban Infrastructure Nervous System — "
        "location-aware AI decision support."
    ),
    version=APP_VERSION
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# SUPABASE
# =========================================================

supabase: Optional[Client] = None

if (
    create_client is not None
    and SUPABASE_URL
    and SUPABASE_KEY
):
    try:
        supabase = create_client(
            SUPABASE_URL,
            SUPABASE_KEY
        )

        logger.info("Supabase client initialized.")

    except Exception as exc:
        logger.warning(
            "Supabase initialization failed: %s",
            exc
        )

else:
    logger.warning(
        "Supabase credentials not configured. "
        "Database persistence will be unavailable."
    )


# =========================================================
# MODEL LOADING
# =========================================================

model = None
model_config: Dict[str, Any] = {}
explainer = None

try:
    model = joblib.load(MODEL_PATH)

    logger.info(
        "ML model loaded: %s",
        MODEL_PATH
    )

except Exception as exc:
    logger.exception("Could not load ML model: %s", exc)


try:
    loaded_config = joblib.load(CONFIG_PATH)

    if isinstance(loaded_config, dict):
        model_config = loaded_config

    logger.info(
        "ML config loaded: %s",
        CONFIG_PATH
    )

except Exception as exc:
    logger.warning(
        "Could not load ML config: %s",
        exc
    )


if model is not None:
    try:
        explainer = shap.TreeExplainer(model)

        logger.info("SHAP TreeExplainer initialized.")

    except Exception as exc:
        logger.warning(
            "SHAP initialization failed: %s",
            exc
        )


# =========================================================
# MODEL FEATURES
# =========================================================

FEATURES = [
    "rainfall_mm",
    "traffic_density",
    "drainage_capacity",
    "road_condition",
    "historical_incidents",
    "population_density",
]


# =========================================================
# DISCLAIMER
# =========================================================

DISCLAIMER = (
    "AI-generated decision-support recommendation. "
    "Human approval required."
)


# =========================================================
# GENERIC HELPERS
# =========================================================

def safe_float(
    value: Any,
    default: float = 0.0
) -> float:

    try:
        if value is None:
            return default

        result = float(value)

        if not math.isfinite(result):
            return default

        return result

    except Exception:
        return default


def clamp(
    value: float,
    minimum: float,
    maximum: float
) -> float:

    return max(
        minimum,
        min(maximum, value)
    )


def haversine_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:

    earth_radius_km = 6371.0088

    p1 = math.radians(lat1)
    p2 = math.radians(lat2)

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(p1)
        * math.cos(p2)
        * math.sin(dlon / 2) ** 2
    )

    return (
        earth_radius_km
        * 2
        * math.atan2(
            math.sqrt(a),
            math.sqrt(1 - a)
        )
    )


def utc_now() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


# =========================================================
# HTTP CLIENT
# =========================================================

async def http_get(
    url: str,
    params: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: float = 15.0
):

    default_headers = {
        "User-Agent": (
            "CITY-NERVE/6.0 "
            "(urban-intelligence-hackathon-project)"
        )
    }

    if headers:
        default_headers.update(headers)

    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True
    ) as client:

        response = await client.get(
            url,
            params=params,
            headers=default_headers
        )

        response.raise_for_status()

        return response


async def http_post(
    url: str,
    data: Optional[str] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: float = 20.0
):

    default_headers = {
        "User-Agent": (
            "CITY-NERVE/6.0 "
            "(urban-intelligence-hackathon-project)"
        )
    }

    if headers:
        default_headers.update(headers)

    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True
    ) as client:

        response = await client.post(
            url,
            content=data,
            headers=default_headers
        )

        response.raise_for_status()

        return response


# =========================================================
# SUPABASE HELPERS
# =========================================================

def supabase_available() -> bool:
    return supabase is not None


def supabase_select(
    table: str,
    columns: str = "*",
    limit: Optional[int] = None
):

    if supabase is None:
        return []

    try:

        query = supabase.table(
            table
        ).select(columns)

        if limit is not None:
            query = query.limit(limit)

        result = query.execute()

        return result.data or []

    except Exception as exc:

        logger.warning(
            "Supabase SELECT failed [%s]: %s",
            table,
            exc
        )

        return []


def supabase_insert(
    table: str,
    payload: Dict[str, Any]
) -> bool:

    if supabase is None:
        return False

    try:

        supabase.table(
            table
        ).insert(payload).execute()

        return True

    except Exception as exc:

        logger.warning(
            "Supabase INSERT failed [%s]: %s",
            table,
            exc
        )

        return False


# =========================================================
# ZONES
# =========================================================

def get_all_zones() -> List[Dict[str, Any]]:

    rows = supabase_select(
        "zones"
    )

    normalized = []

    for row in rows:

        try:

            normalized.append({
                "id": row.get("id"),
                "name": row.get("name", "Unnamed Zone"),
                "latitude": safe_float(
                    row.get("latitude")
                ),
                "longitude": safe_float(
                    row.get("longitude")
                ),
                "population_density": safe_float(
                    row.get("population_density")
                ),
                "drainage_capacity": safe_float(
                    row.get("drainage_capacity")
                ),
                "road_condition": safe_float(
                    row.get("road_condition")
                )
            })

        except Exception:
            continue

    return normalized


def get_zone_by_id(
    zone_id: Any
) -> Optional[Dict[str, Any]]:

    if supabase is None:
        return None

    try:

        result = (
            supabase
            .table("zones")
            .select("*")
            .eq("id", zone_id)
            .limit(1)
            .execute()
        )

        rows = result.data or []

        if not rows:
            return None

        row = rows[0]

        return {
            "id": row.get("id"),
            "name": row.get("name", "Unnamed Zone"),
            "latitude": safe_float(
                row.get("latitude")
            ),
            "longitude": safe_float(
                row.get("longitude")
            ),
            "population_density": safe_float(
                row.get("population_density")
            ),
            "drainage_capacity": safe_float(
                row.get("drainage_capacity")
            ),
            "road_condition": safe_float(
                row.get("road_condition")
            )
        }

    except Exception as exc:

        logger.warning(
            "Could not fetch zone %s: %s",
            zone_id,
            exc
        )

        return None


def find_nearest_zone(
    latitude: float,
    longitude: float
) -> Optional[Dict[str, Any]]:

    zones = get_all_zones()

    if not zones:
        return None

    nearest = None
    nearest_distance = float("inf")

    for zone in zones:

        distance = haversine_km(
            latitude,
            longitude,
            zone["latitude"],
            zone["longitude"]
        )

        if distance < nearest_distance:

            nearest_distance = distance
            nearest = zone

    if nearest is None:
        return None

    if nearest_distance > MAX_ZONE_DISTANCE_KM:

        logger.info(
            "No nearby CITY NERVE zone. "
            "Nearest zone %.2f km away.",
            nearest_distance
        )

        return None

    nearest["distance_km"] = round(
        nearest_distance,
        3
    )

    return nearest


# =========================================================
# INCIDENTS
# =========================================================

def get_incidents() -> List[Dict[str, Any]]:

    return supabase_select(
        "incidents"
    )


def count_nearby_incidents(
    latitude: float,
    longitude: float,
    radius_km: float = 10.0
) -> int:

    incidents = get_incidents()

    count = 0

    for incident in incidents:

        incident_lat = safe_float(
            incident.get("latitude"),
            float("nan")
        )

        incident_lon = safe_float(
            incident.get("longitude"),
            float("nan")
        )

        if not (
            math.isfinite(incident_lat)
            and math.isfinite(incident_lon)
        ):
            continue

        distance = haversine_km(
            latitude,
            longitude,
            incident_lat,
            incident_lon
        )

        if distance <= radius_km:
            count += 1

    return count


# =========================================================
# OPEN-METEO WEATHER
# =========================================================

async def get_weather(
    latitude: float,
    longitude: float
) -> Dict[str, Any]:

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": (
            "temperature_2m,"
            "relative_humidity_2m,"
            "precipitation,"
            "rain,"
            "wind_speed_10m"
        ),
        "hourly": (
            "precipitation_probability,"
            "precipitation,"
            "rain"
        ),
        "forecast_days": 2,
        "timezone": "auto"
    }

    try:

        response = await http_get(
            OPEN_METEO_URL,
            params=params,
            timeout=15
        )

        data = response.json()

        current = data.get(
            "current",
            {}
        )

        hourly = data.get(
            "hourly",
            {}
        )

        precipitation = safe_float(
            current.get("precipitation")
        )

        rain = safe_float(
            current.get("rain")
        )

        hourly_precip = [
            safe_float(x)
            for x in hourly.get(
                "precipitation",
                []
            )[:24]
        ]

        hourly_rain = [
            safe_float(x)
            for x in hourly.get(
                "rain",
                []
            )[:24]
        ]

        probabilities = [
            safe_float(x)
            for x in hourly.get(
                "precipitation_probability",
                []
            )[:24]
        ]

        return {
            "available": True,
            "temperature_c": safe_float(
                current.get("temperature_2m")
            ),
            "humidity_percent": safe_float(
                current.get("relative_humidity_2m")
            ),
            "current_precipitation_mm": precipitation,
            "current_rain_mm": rain,

            "rainfall_next_24h_mm": round(
                sum(hourly_precip),
                2
            ),

            "rain_next_24h_mm": round(
                sum(hourly_rain),
                2
            ),

            "max_rain_probability_percent": (
                max(probabilities)
                if probabilities
                else 0
            ),

            "wind_speed_kmh": safe_float(
                current.get("wind_speed_10m")
            ),

            "source": "Open-Meteo",
            "status": "LIVE"
        }

    except Exception as exc:

        logger.warning(
            "Weather request failed: %s",
            exc
        )

        return {
            "available": False,
            "temperature_c": None,
            "humidity_percent": None,
            "current_precipitation_mm": None,
            "current_rain_mm": None,
            "rainfall_next_24h_mm": None,
            "rain_next_24h_mm": None,
            "max_rain_probability_percent": None,
            "wind_speed_kmh": None,
            "source": "Open-Meteo",
            "status": "UNAVAILABLE",
            "message": str(exc)
        }


# =========================================================
# NOMINATIM REVERSE GEOCODING
# =========================================================

async def reverse_geocode(
    latitude: float,
    longitude: float
) -> Dict[str, Any]:

    params = {
        "lat": latitude,
        "lon": longitude,
        "format": "jsonv2",
        "zoom": 18,
        "addressdetails": 1
    }

    try:

        response = await http_get(
            f"{NOMINATIM_URL}/reverse",
            params=params,
            timeout=15
        )

        data = response.json()

        return {
            "latitude": latitude,
            "longitude": longitude,
            "name": data.get(
                "display_name",
                "Selected location"
            ),
            "address": data.get(
                "address",
                {}
            ),
            "status": "LIVE"
        }

    except Exception as exc:

        logger.warning(
            "Reverse geocoding failed: %s",
            exc
        )

        return {
            "latitude": latitude,
            "longitude": longitude,
            "name": "Selected location",
            "address": {},
            "status": "UNAVAILABLE"
        }


# =========================================================
# LOCATION SEARCH
# =========================================================

async def search_location(
    query: str
) -> List[Dict[str, Any]]:

    params = {
        "q": query,
        "format": "jsonv2",
        "limit": 8,
        "addressdetails": 1
    }

    try:

        response = await http_get(
            f"{NOMINATIM_URL}/search",
            params=params,
            timeout=15
        )

        data = response.json()

        results = []

        for item in data:

            results.append({
                "name": item.get(
                    "display_name",
                    "Unknown location"
                ),
                "latitude": safe_float(
                    item.get("lat")
                ),
                "longitude": safe_float(
                    item.get("lon")
                ),
                "type": item.get(
                    "type"
                ),
                "class": item.get(
                    "class"
                ),
                "address": item.get(
                    "address",
                    {}
                )
            })

        return results

    except Exception as exc:

        logger.warning(
            "Location search failed: %s",
            exc
        )

        return []


# =========================================================
# OPENSTREETMAP INFRASTRUCTURE LAYER
# =========================================================

async def get_osm_infrastructure(
    latitude: float,
    longitude: float,
    radius_m: int = OSM_RADIUS_METERS
) -> Dict[str, Any]:
    """
    Build location-aware infrastructure context using
    OpenStreetMap / Overpass.

    This does NOT claim to provide live traffic or live
    road-condition sensor data.

    It measures geographic context around the selected point.
    """

    query = f"""
    [out:json][timeout:20];

    (
      way(around:{radius_m},{latitude},{longitude})["highway"];
      way(around:{radius_m},{latitude},{longitude})["waterway"];
      way(around:{radius_m},{latitude},{longitude})["building"];
      node(around:{radius_m},{latitude},{longitude})["amenity"];
      node(around:{radius_m},{latitude},{longitude})["emergency"];
      way(around:{radius_m},{latitude},{longitude})["landuse"];
    );

    out center tags;
    """

    try:

        response = await http_post(
            OVERPASS_URL,
            data=query,
            headers={
                "Content-Type": "text/plain"
            },
            timeout=25
        )

        data = response.json()

        elements = data.get(
            "elements",
            []
        )

        roads = []
        waterways = []
        buildings = 0
        amenities = 0
        emergency_features = 0
        landuse_features = 0

        road_class_counts: Dict[str, int] = {}

        for element in elements:

            tags = element.get(
                "tags",
                {}
            )

            if "highway" in tags:

                highway = tags.get(
                    "highway",
                    "unknown"
                )

                road_class_counts[highway] = (
                    road_class_counts.get(
                        highway,
                        0
                    ) + 1
                )

                roads.append({
                    "type": highway,
                    "name": tags.get(
                        "name"
                    )
                })

            if "waterway" in tags:
                waterways.append({
                    "type": tags.get(
                        "waterway"
                    ),
                    "name": tags.get(
                        "name"
                    )
                })

            if "building" in tags:
                buildings += 1

            if "amenity" in tags:
                amenities += 1

            if "emergency" in tags:
                emergency_features += 1

            if "landuse" in tags:
                landuse_features += 1

        # -------------------------------------------------
        # ROAD CONTEXT SCORE
        # -------------------------------------------------

        major_road_types = {
            "motorway",
            "trunk",
            "primary",
            "secondary"
        }

        major_roads = sum(
            count
            for road_type, count
            in road_class_counts.items()
            if road_type in major_road_types
        )

        total_roads = len(roads)

        road_density_score = clamp(
            total_roads / 30.0 * 100.0,
            0,
            100
        )

        major_road_score = clamp(
            major_roads / 8.0 * 100.0,
            0,
            100
        )

        # -------------------------------------------------
        # URBAN DENSITY SCORE
        # -------------------------------------------------

        built_environment_score = clamp(
            (
                buildings / 250.0
            ) * 70
            + (
                amenities / 40.0
            ) * 30,
            0,
            100
        )

        # -------------------------------------------------
        # WATER EXPOSURE SCORE
        # -------------------------------------------------

        waterway_count = len(
            waterways
        )

        water_exposure_score = clamp(
            waterway_count / 8.0 * 100.0,
            0,
            100
        )

        # -------------------------------------------------
        # CONTEXTUAL ROAD CONDITION
        #
        # IMPORTANT:
        # This is NOT a real road-condition measurement.
        # It is only a geographic proxy for model fallback.
        # -------------------------------------------------

        if major_roads >= 6:
            contextual_road_condition = 65.0
        elif major_roads >= 3:
            contextual_road_condition = 58.0
        elif total_roads >= 10:
            contextual_road_condition = 52.0
        else:
            contextual_road_condition = 48.0

        # -------------------------------------------------
        # CONTEXTUAL DRAINAGE
        #
        # OSM waterways provide geographic water exposure,
        # not actual drainage capacity.
        #
        # Therefore this is explicitly a proxy.
        # -------------------------------------------------

        contextual_drainage = clamp(
            60.0 - (
                water_exposure_score * 0.25
            ) + (
                built_environment_score * 0.10
            ),
            25.0,
            75.0
        )

        # -------------------------------------------------
        # CONTEXTUAL POPULATION PROXY
        #
        # We do NOT pretend this is official population.
        # It is an urban-density proxy derived from OSM.
        # -------------------------------------------------

        population_proxy = int(
            clamp(
                built_environment_score / 100.0
                * 10000.0,
                0,
                10000
            )
        )

        return {
            "available": True,
            "source": "OpenStreetMap / Overpass",
            "status": "LIVE_GEO_CONTEXT",

            "radius_m": radius_m,

            "roads": {
                "total_features": total_roads,
                "major_features": major_roads,
                "road_density_score": round(
                    road_density_score,
                    2
                ),
                "major_road_score": round(
                    major_road_score,
                    2
                ),
                "road_class_counts":
                    road_class_counts
            },

            "waterways": {
                "count": waterway_count,
                "features": waterways[:20],
                "water_exposure_score":
                    round(
                        water_exposure_score,
                        2
                    )
            },

            "buildings": {
                "count": buildings
            },

            "amenities": {
                "count": amenities
            },

            "emergency_features": {
                "count": emergency_features
            },

            "landuse_features": {
                "count": landuse_features
            },

            "urban_density": {
                "score": round(
                    built_environment_score,
                    2
                ),
                "population_proxy":
                    population_proxy,
                "population_status":
                    "OSM_DENSITY_PROXY"
            },

            "model_context": {
                "drainage_capacity":
                    round(
                        contextual_drainage,
                        2
                    ),
                "road_condition":
                    round(
                        contextual_road_condition,
                        2
                    ),

                "drainage_status":
                    "OSM_CONTEXT_PROXY",

                "road_condition_status":
                    "OSM_CONTEXT_PROXY"
            }
        }

    except Exception as exc:

        logger.warning(
            "OSM infrastructure lookup failed: %s",
            exc
        )

        return {
            "available": False,
            "source": "OpenStreetMap / Overpass",
            "status": "UNAVAILABLE",
            "radius_m": radius_m,
            "roads": {
                "total_features": 0,
                "major_features": 0,
                "road_density_score": 0,
                "major_road_score": 0,
                "road_class_counts": {}
            },
            "waterways": {
                "count": 0,
                "features": [],
                "water_exposure_score": 0
            },
            "buildings": {
                "count": 0
            },
            "amenities": {
                "count": 0
            },
            "emergency_features": {
                "count": 0
            },
            "landuse_features": {
                "count": 0
            },
            "urban_density": {
                "score": None,
                "population_proxy": None,
                "population_status": "UNAVAILABLE"
            },
            "model_context": {
                "drainage_capacity": None,
                "road_condition": None,
                "drainage_status": "UNAVAILABLE",
                "road_condition_status": "UNAVAILABLE"
            },
            "message": str(exc)
        }


# =========================================================
# TRAFFIC CONTEXT
# =========================================================

def get_traffic_context(
    zone: Optional[Dict[str, Any]],
    osm: Dict[str, Any]
) -> Dict[str, Any]:

    if zone is not None:

        return {
            "value": safe_float(
                zone.get(
                    "traffic_density",
                    50
                ),
                50
            ),
            "status": "DEMO_CONTEXT",
            "message": (
                "Traffic is contextual database data "
                "because no live traffic provider is connected."
            )
        }

    # -----------------------------------------------------
    # We intentionally DO NOT call OSM road density
    # "live traffic".
    #
    # It is only a geographic proxy.
    # -----------------------------------------------------

    road_score = safe_float(
        osm.get(
            "roads",
            {}
        ).get(
            "road_density_score"
        ),
        50
    )

    traffic_proxy = clamp(
        30.0 + road_score * 0.35,
        30,
        70
    )

    return {
        "value": round(
            traffic_proxy,
            2
        ),
        "status": "OSM_CONTEXT_PROXY",
        "message": (
            "Traffic is not live. "
            "This value is a geographic road-density proxy "
            "because no live traffic provider is connected."
        )
    }


# =========================================================
# ML INPUT BUILDER
# =========================================================

def build_ml_inputs(
    rainfall_mm: float,
    traffic_density: float,
    drainage_capacity: float,
    road_condition: float,
    historical_incidents: float,
    population_density: float
) -> pd.DataFrame:

    values = {
        "rainfall_mm": safe_float(
            rainfall_mm
        ),
        "traffic_density": safe_float(
            traffic_density
        ),
        "drainage_capacity": safe_float(
            drainage_capacity
        ),
        "road_condition": safe_float(
            road_condition
        ),
        "historical_incidents": safe_float(
            historical_incidents
        ),
        "population_density": safe_float(
            population_density
        )
    }

    return pd.DataFrame(
        [values],
        columns=FEATURES
    )


# =========================================================
# RISK LEVEL
# =========================================================

def risk_level(
    probability: float
) -> str:

    if probability >= 0.80:
        return "Critical"

    if probability >= 0.60:
        return "High"

    if probability >= 0.30:
        return "Moderate"

    return "Low"


# =========================================================
# PRIMARY RISK
# =========================================================

def determine_primary_risk(
    rainfall_mm: float,
    traffic_density: float,
    drainage_capacity: float,
    road_condition: float,
    historical_incidents: float
) -> str:

    signals = {
        "Flood Disruption": (
            rainfall_mm * 1.0
            + max(
                0,
                60 - drainage_capacity
            ) * 1.5
        ),

        "Traffic Disruption": (
            traffic_density * 1.2
        ),

        "Road Failure": (
            max(
                0,
                60 - road_condition
            ) * 1.5
            + historical_incidents * 5
        )
    }

    return max(
        signals,
        key=signals.get
    )


# =========================================================
# EMERGENCY CORRIDOR
# =========================================================

def emergency_corridor(
    probability: float,
    traffic_density: float,
    road_condition: float
) -> str:

    if (
        probability >= 0.80
        or road_condition <= 25
    ):
        return "BLOCKED"

    if (
        probability >= 0.60
        or traffic_density >= 80
        or road_condition <= 40
    ):
        return "AT RISK"

    return "NORMAL"


# =========================================================
# RECOMMENDATIONS
# =========================================================

def generate_recommendations(
    rainfall_mm: float,
    traffic_density: float,
    drainage_capacity: float,
    road_condition: float,
    historical_incidents: float,
    risk_probability: float
) -> List[Dict[str, str]]:

    recommendations = []

    if drainage_capacity < 50:

        recommendations.append({
            "action": (
                "Inspect and clear drainage systems "
                "in the affected zone."
            ),
            "priority": "High",
            "reason": (
                "Drainage capacity is below the "
                "operational threshold."
            )
        })

    if rainfall_mm >= 80:

        recommendations.append({
            "action": (
                "Pre-position flood response resources "
                "near exposed locations."
            ),
            "priority": "High",
            "reason": (
                "Forecast rainfall indicates elevated "
                "disruption potential."
            )
        })

    if traffic_density >= 75:

        recommendations.append({
            "action": (
                "Review alternate emergency corridors "
                "and traffic diversion options."
            ),
            "priority": "High",
            "reason": (
                "Traffic density is elevated."
            )
        })

    if road_condition < 60:

        recommendations.append({
            "action": (
                "Inspect damaged roads and prioritize "
                "maintenance."
            ),
            "priority": "Medium",
            "reason": (
                "Road condition is below the preferred threshold."
            )
        })

    if historical_incidents >= 3:

        recommendations.append({
            "action": (
                "Increase monitoring frequency for "
                "historically affected infrastructure."
            ),
            "priority": "Medium",
            "reason": (
                "Multiple historical incidents were recorded."
            )
        })

    if risk_probability >= 0.60:

        recommendations.append({
            "action": (
                "Escalate location to human emergency "
                "planning review."
            ),
            "priority": "High",
            "reason": (
                "Predicted disruption risk exceeds "
                "the escalation threshold."
            )
        })

    if not recommendations:

        recommendations.append({
            "action": (
                "Continue routine infrastructure monitoring."
            ),
            "priority": "Low",
            "reason": (
                "No immediate high-priority signal "
                "was detected."
            )
        })

    # -------------------------------------------------------
    # SPEC REQUIREMENT (Section G — Preventive Action Engine):
    # every recommendation must explicitly carry a human
    # approval requirement and the exact disclaimer text.
    # This is decision support only — never autonomous action.
    # -------------------------------------------------------

    for item in recommendations:
        item["human_approval_required"] = True
        item["disclaimer"] = DISCLAIMER

    return recommendations


# =========================================================
# SHAP
# =========================================================

def explain_prediction(
    X: pd.DataFrame
) -> List[Dict[str, Any]]:

    if explainer is None:

        return []

    try:

        shap_values = explainer.shap_values(
            X
        )

        values = shap_values

        if isinstance(
            shap_values,
            list
        ):
            values = shap_values[-1]

        values = np.asarray(
            values
        )

        if values.ndim == 2:
            values = values[0]

        values = values.flatten()

        explanation = []

        for feature, value in zip(
            FEATURES,
            values
        ):

            numeric_value = safe_float(
                value
            )

            explanation.append({
                "feature": feature,
                "shap_value": round(
                    numeric_value,
                    4
                ),
                "impact": (
                    "increases risk"
                    if numeric_value > 0
                    else "reduces risk"
                )
            })

        explanation.sort(
            key=lambda item:
                abs(
                    item["shap_value"]
                ),
            reverse=True
        )

        return explanation

    except Exception as exc:

        logger.warning(
            "SHAP explanation failed: %s",
            exc
        )

        return []


# =========================================================
# PREDICTION ENGINE
# =========================================================

def run_prediction(
    rainfall_mm: float,
    traffic_density: float,
    drainage_capacity: float,
    road_condition: float,
    historical_incidents: float,
    population_density: float
) -> Dict[str, Any]:

    X = build_ml_inputs(
        rainfall_mm,
        traffic_density,
        drainage_capacity,
        road_condition,
        historical_incidents,
        population_density
    )

    if model is None:

        raise HTTPException(
            status_code=503,
            detail=(
                "CITY NERVE ML model is unavailable."
            )
        )

    try:

        prediction = model.predict(
            X
        )

        probability = float(
            np.asarray(
                prediction
            ).flatten()[0]
        )

        # -------------------------------------------------
        # If the trained model already outputs probability
        # in 0..1, preserve it.
        #
        # If it outputs percentage 0..100, normalize.
        # -------------------------------------------------

        if probability > 1:
            probability /= 100.0

        probability = clamp(
            probability,
            0,
            1
        )

    except Exception as exc:

        logger.exception(
            "ML prediction failed."
        )

        raise HTTPException(
            status_code=500,
            detail=f"ML prediction failed: {exc}"
        )

    level = risk_level(
        probability
    )

    primary_risk = determine_primary_risk(
        rainfall_mm,
        traffic_density,
        drainage_capacity,
        road_condition,
        historical_incidents
    )

    corridor = emergency_corridor(
        probability,
        traffic_density,
        road_condition
    )

    recommendations = generate_recommendations(
        rainfall_mm,
        traffic_density,
        drainage_capacity,
        road_condition,
        historical_incidents,
        probability
    )

    explanation = explain_prediction(
        X
    )

    return {
        "risk_probability": round(
            probability,
            4
        ),

        "risk_percentage": round(
            probability * 100,
            2
        ),

        "risk_level": level,

        "predicted_disruption":
            primary_risk,

        "primary_risk":
            primary_risk,

        "emergency_corridor":
            corridor,

        "recommendations":
            recommendations,

        "explanation":
            explanation,

        "model": {
            "name": "Random Forest",
            "version": "city-nerve-rf-v1"
        }
    }


# =========================================================
# REQUEST MODELS
# =========================================================

class PredictionRequest(BaseModel):

    rainfall_mm: float = Field(
        0,
        ge=0
    )

    traffic_density: float = Field(
        50,
        ge=0,
        le=100
    )

    drainage_capacity: float = Field(
        50,
        ge=0,
        le=100
    )

    road_condition: float = Field(
        50,
        ge=0,
        le=100
    )

    historical_incidents: float = Field(
        0,
        ge=0
    )

    population_density: float = Field(
        0,
        ge=0
    )


class LocationAnalysisRequest(BaseModel):

    latitude: float = Field(
        ...,
        ge=-90,
        le=90
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180
    )

    zone_id: Optional[Any] = None


class ExplainRequest(PredictionRequest):
    pass


class SimulationRequest(PredictionRequest):
    pass


class ActionRequest(PredictionRequest):

    risk_probability: Optional[float] = Field(
        None,
        ge=0,
        le=1
    )


class CitizenReportRequest(BaseModel):

    latitude: float = Field(
        ...,
        ge=-90,
        le=90
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180
    )

    report_type: str = "Other"

    description: str = ""

    severity: str = "Medium"

    image_url: Optional[str] = None

    audio_url: Optional[str] = None

    zone_id: Optional[Any] = None


# =========================================================
# DATABASE PERSISTENCE
# =========================================================

def save_prediction(
    latitude: Optional[float],
    longitude: Optional[float],
    prediction: Dict[str, Any],
    inputs: Dict[str, Any]
) -> bool:

    payload = {
        "latitude": latitude,
        "longitude": longitude,
        "risk_probability":
            prediction["risk_probability"],
        "risk_percentage":
            prediction["risk_percentage"],
        "risk_level":
            prediction["risk_level"],
        "predicted_disruption":
            prediction["predicted_disruption"],
        "primary_risk":
            prediction["primary_risk"],
        "emergency_corridor":
            prediction["emergency_corridor"],
        "model_version":
            prediction["model"]["version"],
        "input_data":
            inputs,
        "prediction_timestamp": utc_now()
    }

    return supabase_insert(
        "predictions",
        payload
    )


def save_explanation(
    latitude: Optional[float],
    longitude: Optional[float],
    explanation: List[Dict[str, Any]]
) -> bool:

    payload = {
        "latitude": latitude,
        "longitude": longitude,
        "explanation": explanation,
        "model_version":
            "city-nerve-rf-v1",
        "explanation_timestamp": utc_now()
    }

    return supabase_insert(
        "ai_explanations",
        payload
    )


def save_actions(
    latitude: Optional[float],
    longitude: Optional[float],
    actions: List[Dict[str, Any]]
) -> bool:

    payload = {
        "latitude": latitude,
        "longitude": longitude,
        "actions": actions,
        "status": "PENDING_HUMAN_REVIEW",
        "actions_timestamp": utc_now()
    }

    return supabase_insert(
        "preventive_actions",
        payload
    )


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():

    return {
        "name":
            "CITY NERVE",

        "description":
            "Predictive Urban Infrastructure Nervous System",

        "version":
            APP_VERSION,

        "status":
            "ONLINE",

        "architecture":
            "React → FastAPI → ML → Open-Meteo → OpenStreetMap → Supabase",

        "disclaimer":
            DISCLAIMER
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",

        "service":
            "CITY NERVE API",

        "version":
            APP_VERSION,

        "ml_model":
            "AVAILABLE"
            if model is not None
            else "UNAVAILABLE",

        "shap":
            "AVAILABLE"
            if explainer is not None
            else "UNAVAILABLE",

        "supabase":
            "CONNECTED"
            if supabase is not None
            else "UNAVAILABLE",

        "weather":
            "Open-Meteo",

        "geocoding":
            "OpenStreetMap Nominatim",

        "infrastructure":
            "OpenStreetMap / Overpass",

        "traffic":
            "DEMO_CONTEXT"
    }


# =========================================================
# SUPABASE TEST
# =========================================================

@app.get("/supabase-test")
def supabase_test():

    if supabase is None:

        return {
            "success": False,
            "available": False,
            "message":
                "Supabase is not configured."
        }

    try:

        rows = (
            supabase
            .table("zones")
            .select("id")
            .limit(1)
            .execute()
        )

        return {
            "success": True,
            "available": True,
            "rows_returned":
                len(rows.data or [])
        }

    except Exception as exc:

        return {
            "success": False,
            "available": True,
            "message": str(exc)
        }


# =========================================================
# ZONES
# =========================================================

@app.get("/zones")
def zones():

    return get_all_zones()


# =========================================================
# INCIDENTS
# =========================================================

@app.get("/incidents")
def incidents():

    return get_incidents()


# =========================================================
# LOCATION ANALYSIS
# =========================================================

@app.get("/debug-model")
def debug_model():
    import os
    return {
        "model_path": MODEL_PATH,
        "model_exists": os.path.exists(MODEL_PATH),
        "model_size": os.path.getsize(MODEL_PATH) if os.path.exists(MODEL_PATH) else 0,
        "model_loaded": model is not None,
        "config_exists": os.path.exists(CONFIG_PATH),
        "config_size": os.path.getsize(CONFIG_PATH) if os.path.exists(CONFIG_PATH) else 0
    }

@app.post("/location-analysis")
async def location_analysis(
    data: LocationAnalysisRequest
):

    latitude = data.latitude
    longitude = data.longitude

    # -----------------------------------------------------
    # LOCATION
    # -----------------------------------------------------

    location = await reverse_geocode(
        latitude,
        longitude
    )

    # -----------------------------------------------------
    # WEATHER
    # -----------------------------------------------------

    weather = await get_weather(
        latitude,
        longitude
    )

    # -----------------------------------------------------
    # EXACT USER SELECTED ZONE
    # -----------------------------------------------------

    zone = None

    if data.zone_id is not None:

        zone = get_zone_by_id(
            data.zone_id
        )

    # -----------------------------------------------------
    # OTHERWISE FIND NEAREST SAFE ZONE
    # -----------------------------------------------------

    if zone is None:

        zone = find_nearest_zone(
            latitude,
            longitude
        )

    # -----------------------------------------------------
    # OSM INFRASTRUCTURE
    # -----------------------------------------------------

    osm = await get_osm_infrastructure(
        latitude,
        longitude
    )

    # -----------------------------------------------------
    # HISTORICAL INCIDENTS
    # -----------------------------------------------------

    historical_incidents = (
        count_nearby_incidents(
            latitude,
            longitude,
            radius_km=10
        )
    )

    # -----------------------------------------------------
    # RAINFALL
    # -----------------------------------------------------

    if weather.get("available"):

        rainfall_mm = safe_float(
            weather.get(
                "rainfall_next_24h_mm"
            ),
            0
        )

    else:

        rainfall_mm = 0.0

    # -----------------------------------------------------
    # INFRASTRUCTURE CONTEXT
    # -----------------------------------------------------

    if zone is not None:

        drainage_capacity = safe_float(
            zone.get(
                "drainage_capacity"
            ),
            50
        )

        road_condition = safe_float(
            zone.get(
                "road_condition"
            ),
            50
        )

        population_density = safe_float(
            zone.get(
                "population_density"
            ),
            0
        )

        infrastructure_status = (
            "CITY_NERVE_DATABASE"
        )

        infrastructure_message = (
            "Infrastructure context comes "
            "from the nearest CITY NERVE zone."
        )

    elif osm.get("available"):

        drainage_capacity = safe_float(
            osm.get(
                "model_context",
                {}
            ).get(
                "drainage_capacity"
            ),
            50
        )

        road_condition = safe_float(
            osm.get(
                "model_context",
                {}
            ).get(
                "road_condition"
            ),
            50
        )

        population_density = safe_float(
            osm.get(
                "urban_density",
                {}
            ).get(
                "population_proxy"
            ),
            0
        )

        infrastructure_status = (
            "OSM_CONTEXT_PROXY"
        )

        infrastructure_message = (
            "Infrastructure context is derived "
            "from OpenStreetMap geographic features. "
            "It is not a direct sensor measurement."
        )

    else:

        drainage_capacity = 50.0
        road_condition = 50.0
        population_density = 0.0

        infrastructure_status = (
            "UNAVAILABLE"
        )

        infrastructure_message = (
            "No nearby CITY NERVE zone or "
            "OpenStreetMap infrastructure context "
            "was available."
        )

    # -----------------------------------------------------
    # TRAFFIC
    # -----------------------------------------------------

    traffic = get_traffic_context(
        zone,
        osm
    )

    traffic_density = safe_float(
        traffic.get(
            "value"
        ),
        50
    )

    # -----------------------------------------------------
    # ML
    # -----------------------------------------------------

    prediction = run_prediction(
        rainfall_mm=rainfall_mm,
        traffic_density=traffic_density,
        drainage_capacity=drainage_capacity,
        road_condition=road_condition,
        historical_incidents=historical_incidents,
        population_density=population_density
    )

    # -----------------------------------------------------
    # PERSISTENCE
    # -----------------------------------------------------

    inputs = {
        "rainfall_mm": rainfall_mm,
        "traffic_density": traffic_density,
        "drainage_capacity":
            drainage_capacity,
        "road_condition":
            road_condition,
        "historical_incidents":
            historical_incidents,
        "population_density":
            population_density
    }

    prediction_saved = save_prediction(
        latitude,
        longitude,
        prediction,
        inputs
    )

    explanation_saved = save_explanation(
        latitude,
        longitude,
        prediction["explanation"]
    )

    actions_saved = save_actions(
        latitude,
        longitude,
        prediction["recommendations"]
    )

    location_saved = supabase_insert(
        "location_analysis",
        {
            "latitude": latitude,
            "longitude": longitude,
            "location_name":
                location.get(
                    "name"
                ),
            "risk_level":
                prediction[
                    "risk_level"
                ],
            "risk_probability":
                prediction[
                    "risk_probability"
                ],
            "primary_risk":
                prediction[
                    "primary_risk"
                ],
            "weather_temperature": weather.get("temperature_c"),
            "weather_humidity": weather.get("humidity_percent"),
            "weather_rainfall": weather.get("rainfall_next_24h_mm"),
            "weather_wind": weather.get("wind_speed_kmh"),
            "weather_available": weather.get("available"),
            "zone_id": zone.get("id") if zone else None,
            "zone_name": zone.get("name") if zone else None,
            "distance_km": zone.get("distance_km") if zone else None,
            "traffic_density": traffic_density,
            "traffic_status": traffic.get("status"),
            "drainage_capacity": drainage_capacity,
            "road_condition": road_condition,
            "historical_incidents": historical_incidents,
            "population_density": population_density,
            "analysis_timestamp": utc_now()
        }
    )

    # -----------------------------------------------------
    # FINAL RESPONSE
    # -----------------------------------------------------

    return {
        "success": True,

        "location": location,

        "weather": weather,

        "urban_context": {

            "nearest_zone": (
                zone.get("name")
                if zone
                else None
            ),

            "zone_id": (
                zone.get("id")
                if zone
                else None
            ),

            "distance_km": (
                zone.get("distance_km")
                if zone
                else None
            ),

            "infrastructure_status":
                infrastructure_status,

            "infrastructure_message":
                infrastructure_message,

            "traffic_density":
                traffic_density,

            "traffic_data_status":
                traffic.get(
                    "status"
                ),

            "traffic_data_message":
                traffic.get(
                    "message"
                ),

            "drainage_capacity":
                drainage_capacity,

            "drainage_status": (
                "CITY_NERVE_DATABASE"
                if zone
                else osm.get(
                    "model_context",
                    {}
                ).get(
                    "drainage_status",
                    "UNAVAILABLE"
                )
            ),

            "road_condition":
                road_condition,

            "road_condition_status": (
                "CITY_NERVE_DATABASE"
                if zone
                else osm.get(
                    "model_context",
                    {}
                ).get(
                    "road_condition_status",
                    "UNAVAILABLE"
                )
            ),

            "historical_incidents":
                historical_incidents,

            "population_density":
                population_density,

            "population_status": (
                "CITY_NERVE_DATABASE"
                if zone
                else osm.get(
                    "urban_density",
                    {}
                ).get(
                    "population_status",
                    "UNAVAILABLE"
                )
            ),

            "osm": osm
        },

        "prediction":
            prediction,

        "data_sources": {

            "weather": {
                "provider":
                    "Open-Meteo",
                "status":
                    weather.get(
                        "status"
                    )
            },

            "geocoding": {
                "provider":
                    "OpenStreetMap Nominatim",
                "status":
                    location.get(
                        "status"
                    )
            },

            "infrastructure": {
                "provider":
                    (
                        "CITY NERVE database"
                        if zone
                        else "OpenStreetMap / Overpass"
                    ),
                "status":
                    infrastructure_status
            },

            "traffic": {
                "provider":
                    "CITY NERVE database"
                    if zone
                    else "OSM geographic proxy",
                "status":
                    traffic.get(
                        "status"
                    )
            },

            "ml": {
                "provider":
                    "CITY NERVE Random Forest",
                "status":
                    "LIVE_MODEL"
                    if model is not None
                    else "UNAVAILABLE"
            },

            "explainability": {
                "provider":
                    "SHAP",
                "status":
                    "AVAILABLE"
                    if explainer is not None
                    else "UNAVAILABLE"
            }
        },

        "persistence": {

            "database_available":
                supabase is not None,

            "prediction_saved":
                prediction_saved,

            "ai_explanation_saved":
                explanation_saved,

            "preventive_actions_saved":
                actions_saved,

            "location_analysis_saved":
                location_saved
        },

        "disclaimer":
            DISCLAIMER
    }


# =========================================================
# GEOCODING SEARCH
# =========================================================

@app.get("/geocode")
async def geocode(
    q: str = Query(
        ...,
        min_length=2
    )
):

    results = await search_location(
        q
    )

    return {
        "success": True,
        "query": q,
        "results": results,
        "source":
            "OpenStreetMap Nominatim"
    }


# =========================================================
# PREDICT
# =========================================================

@app.post("/predict")
def predict(
    data: PredictionRequest
):

    return run_prediction(
        rainfall_mm=data.rainfall_mm,
        traffic_density=data.traffic_density,
        drainage_capacity=data.drainage_capacity,
        road_condition=data.road_condition,
        historical_incidents=data.historical_incidents,
        population_density=data.population_density
    )


# =========================================================
# SIMULATE
# =========================================================

@app.post("/simulate")
def simulate(
    data: SimulationRequest
):

    prediction = run_prediction(
        rainfall_mm=data.rainfall_mm,
        traffic_density=data.traffic_density,
        drainage_capacity=data.drainage_capacity,
        road_condition=data.road_condition,
        historical_incidents=data.historical_incidents,
        population_density=data.population_density
    )

    inputs = data.model_dump()

    # -------------------------------------------------------
    # SPEC REQUIREMENT (Section 13 — Database Persistence):
    # what-if simulations must be persisted as simulation
    # history when Supabase is available, and the API must
    # never pretend a save happened when it did not.
    # -------------------------------------------------------

    simulation_saved = supabase_insert(
        "simulation_history",
        {
            "inputs": inputs,
            "risk_probability":
                prediction["risk_probability"],
            "risk_percentage":
                prediction["risk_percentage"],
            "risk_level":
                prediction["risk_level"],
            "predicted_disruption":
                prediction["predicted_disruption"],
            "emergency_corridor":
                prediction["emergency_corridor"],
            "model_version":
                prediction["model"]["version"]
        }
    )

    return {
        "success": True,
        "simulation": prediction,
        "inputs": inputs,
        "timestamp": utc_now(),
        "persistence": {
            "database_available": supabase is not None,
            "simulation_history_saved": simulation_saved
        },
        "disclaimer": DISCLAIMER
    }


# =========================================================
# EXPLAIN
# =========================================================

@app.post("/explain")
def explain(
    data: ExplainRequest
):

    X = build_ml_inputs(
        data.rainfall_mm,
        data.traffic_density,
        data.drainage_capacity,
        data.road_condition,
        data.historical_incidents,
        data.population_density
    )

    explanation = explain_prediction(
        X
    )

    return {
        "success": True,
        "explanation": explanation,
        "model": {
            "name":
                "Random Forest",
            "version":
                "city-nerve-rf-v1"
        },
        "provider":
            "SHAP"
    }


# =========================================================
# ACTIONS
# =========================================================

@app.post("/actions")
def actions(
    data: ActionRequest
):

    prediction = run_prediction(
        rainfall_mm=data.rainfall_mm,
        traffic_density=data.traffic_density,
        drainage_capacity=data.drainage_capacity,
        road_condition=data.road_condition,
        historical_incidents=data.historical_incidents,
        population_density=data.population_density
    )

    return {
        "success": True,
        "actions":
            prediction[
                "recommendations"
            ],
        "risk_level":
            prediction[
                "risk_level"
            ],
        "emergency_corridor":
            prediction[
                "emergency_corridor"
            ],
        "approval_required": True,
        "disclaimer": DISCLAIMER
    }


# =========================================================
# RISK SUMMARY
# =========================================================

@app.get("/risk-summary")
def risk_summary():

    rows = supabase_select(
        "predictions",
        limit=500
    )

    if not rows:

        return {
            "total_predictions": 0,
            "high_risk_predictions": 0,
            "critical_predictions": 0,
            "emergency_corridors_at_risk": 0,
            "average_risk_percentage": 0
        }

    high = 0
    critical = 0
    corridors = 0
    probabilities = []

    for row in rows:

        level = str(
            row.get(
                "risk_level",
                ""
            )
        ).lower()

        if level == "high":
            high += 1

        if level == "critical":
            critical += 1

        corridor = str(
            row.get(
                "emergency_corridor",
                "NORMAL"
            )
        )

        if corridor in {
            "AT RISK",
            "BLOCKED"
        }:
            corridors += 1

        probabilities.append(
            safe_float(
                row.get(
                    "risk_percentage"
                )
            )
        )

    return {
        "total_predictions":
            len(rows),

        "high_risk_predictions":
            high,

        "critical_predictions":
            critical,

        "emergency_corridors_at_risk":
            corridors,

        "average_risk_percentage":
            round(
                sum(probabilities)
                / len(probabilities),
                2
            )
            if probabilities
            else 0
    }


# =========================================================
# CITIZEN REPORTS
# =========================================================

@app.post("/citizen-reports")
def create_citizen_report(
    data: CitizenReportRequest
):

    payload = {
        "latitude":
            data.latitude,

        "longitude":
            data.longitude,

        "report_type":
            data.report_type,

        "description":
            data.description,

        "severity":
            data.severity,

        "image_url":
            data.image_url,

        "audio_url":
            data.audio_url,

        "zone_id":
            data.zone_id,

        "status":
            "NEW"
    }

    saved = supabase_insert(
        "citizen_reports",
        payload
    )

    return {
        "success": saved,
        "saved": saved,
        "report": payload
    }


@app.get("/citizen-reports")
def citizen_reports(
    limit: int = Query(
        100,
        ge=1,
        le=500
    )
):

    return supabase_select(
        "citizen_reports",
        limit=limit
    )


@app.get(
    "/citizen-reports/zone/{zone_id}"
)
def citizen_reports_by_zone(
    zone_id: int
):

    if supabase is None:
        return []

    try:

        result = (
            supabase
            .table("citizen_reports")
            .select("*")
            .eq("zone_id", zone_id)
            .execute()
        )

        return result.data or []

    except Exception as exc:

        logger.warning(
            "Citizen report query failed: %s",
            exc
        )

        return []


# =========================================================
# SIMULATION HISTORY
# =========================================================

@app.get("/simulation-history")
def simulation_history(
    limit: int = Query(
        50,
        ge=1,
        le=500
    )
):

    return supabase_select(
        "simulation_history",
        limit=limit
    )


# =========================================================
# AI EXPLANATIONS
# =========================================================

@app.get("/ai-explanations")
def ai_explanations(
    limit: int = Query(
        50,
        ge=1,
        le=500
    )
):

    return supabase_select(
        "ai_explanations",
        limit=limit
    )


# =========================================================
# PREVENTIVE ACTIONS
# =========================================================

@app.get("/preventive-actions")
def preventive_actions(
    limit: int = Query(
        50,
        ge=1,
        le=500
    )
):

    return supabase_select(
        "preventive_actions",
        limit=limit
    )


# =========================================================
# LOCATION ANALYSIS HISTORY
# =========================================================

@app.get("/location-analysis")
def location_analysis_history(
    limit: int = Query(
        50,
        ge=1,
        le=500
    )
):

    return supabase_select(
        "location_analysis",
        limit=limit
    )


# =========================================================
# STARTUP
# =========================================================

@app.on_event("startup")
async def startup_event():

    logger.info(
        "================================================="
    )

    logger.info(
        "CITY NERVE API v%s STARTING",
        APP_VERSION
    )

    logger.info(
        "ML model: %s",
        "READY"
        if model is not None
        else "UNAVAILABLE"
    )

    logger.info(
        "SHAP: %s",
        "READY"
        if explainer is not None
        else "UNAVAILABLE"
    )

    logger.info(
        "Supabase: %s",
        "CONNECTED"
        if supabase is not None
        else "UNAVAILABLE"
    )

    logger.info(
        "Weather: Open-Meteo LIVE"
    )

    logger.info(
        "Geocoding: OpenStreetMap Nominatim"
    )

    logger.info(
        "Infrastructure: OpenStreetMap / Overpass"
    )

    logger.info(
        "Traffic: DEMO_CONTEXT / OSM proxy"
    )

    logger.info(
        "Zone matching limit: %.1f km",
        MAX_ZONE_DISTANCE_KM
    )

    logger.info(
        "================================================="
    )


# =========================================================
# RUN DIRECTLY
# =========================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
