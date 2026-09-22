# CITY NERVE

**"The City That Sees Tomorrow"**

A production-quality AI-powered predictive urban infrastructure intelligence platform that combines real-time weather, geospatial infrastructure context, machine learning, and explainable AI to identify emerging urban risks, simulate what-if scenarios, and recommend preventive actions before disruption occurs.

## Architecture

```
React Frontend (Vite)
    ↓
FastAPI Backend
    ↓
├── Random Forest ML Model
├── SHAP Explainability
├── Open-Meteo (Live Weather)
├── OpenStreetMap Nominatim (Geocoding)
├── OpenStreetMap Overpass (Infrastructure Context)
└── Supabase PostgreSQL (Persistence)
```

## Intelligence Loop

**SENSE** → Real-time weather, geocoding, OSM infrastructure, historical incidents

**PREDICT** → Random Forest ML model with 6 features

**EXPLAIN** → SHAP TreeExplainer shows why the model predicted its result

**SIMULATE** → What-if scenario testing with adjustable variables

**ACT** → Preventive recommendations (human approval required)

**LEARN** → All predictions, explanations, actions, and simulations persisted to Supabase

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Supabase account (for database persistence)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv312

# Activate virtual environment
.venv312\Scripts\activate  # Windows
source .venv312/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials:
# SUPABASE_URL=your_supabase_url
# SUPABASE_KEY=your_supabase_key

# Start backend
.venv312\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8001
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env if needed (default points to http://127.0.0.1:8001)

# Start frontend
npm run dev
```

Access the dashboard at: http://localhost:5173

## Database Tables (Supabase)

The following tables are automatically created/used by the backend:

- `zones` - Predefined CITY NERVE monitoring zones
- `incidents` - Historical incident data
- `predictions` - ML prediction results with timestamps
- `ai_explanations` - SHAP explanations with timestamps
- `preventive_actions` - Generated recommendations with timestamps
- `location_analysis` - Complete analysis snapshots with real-time weather and infrastructure data
- `citizen_reports` - User-submitted reports
- `simulation_history` - What-if simulation results

### Schema Updates Required

If you're upgrading from an earlier version, run the SQL commands in `supabase_schema_update.sql` in your Supabase SQL Editor to add the new columns for real-time data persistence and timestamps.

## Data Sources & Status Transparency

- **Weather**: Open-Meteo (LIVE)
- **Geocoding**: OpenStreetMap Nominatim (LIVE)
- **Infrastructure**: OpenStreetMap / Overpass (LIVE_GEO_CONTEXT)
- **Traffic**: DEMO_CONTEXT / OSM proxy (no live provider connected)
- **ML**: Random Forest (LIVE_MODEL)
- **Explainability**: SHAP (AVAILABLE)
- **Database**: Supabase (CONNECTED/UNAVAILABLE)

All data sources are transparently labeled in the UI. The system never pretends data is live when it's unavailable.

## Key Features

### Location Intelligence
- Click anywhere on the map
- Search for locations
- Use "My Location" (GPS)
- Automatic zone matching (within 25km)
- Fallback to OSM context when no zone exists

### Predictive Risk
- Real-time ML predictions
- Risk levels: Low, Moderate, High, Critical
- Emergency corridor status
- AI-generated recommendations

### Explainable AI
- SHAP-based feature contributions
- Shows which factors increase/decrease risk
- Transparent model reasoning

### What-If Simulator
- Adjust rainfall, traffic, drainage, road condition
- Test alternative scenarios
- See predicted outcomes

### Infrastructure Intelligence
- OpenStreetMap context (roads, buildings, waterways)
- Urban density scores
- Geographic proxies (clearly labeled)

### Emergency Response
- Corridor status assessment
- Response recommendations
- Decision-support only (no autonomous control)

### Citizen Reporting
- Submit urban issues
- Attach location coordinates
- Categorize by severity

### Analysis History
- View all persisted analyses
- AI explanations history
- Preventive actions history
- Simulation history

## Deployment

### Backend Deployment (e.g., Render, Railway)

1. Deploy the FastAPI backend
2. Set environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `CITY_NERVE_MODEL_PATH` (if using custom model path)
3. Ensure ML model files are deployed:
   - `city_nerve_risk_model.pkl`
   - `city_nerve_config.pkl`

### Frontend Deployment (e.g., Vercel, Netlify)

1. Deploy the React/Vite frontend
2. Set environment variable:
   - `VITE_API_BASE_URL` (point to deployed backend URL)
3. Build command: `npm run build`

## Important Notes

- **Decision Support Only**: CITY NERVE does NOT control traffic lights, emergency vehicles, roads, drainage systems, or any infrastructure. All recommendations require human approval.
- **No Fake Data**: The system never invents live data. If a service is unavailable, it's clearly marked.
- **Geographic Proxies**: OSM-derived values are contextual proxies, not physical sensor measurements.
- **Traffic**: No live traffic provider is connected. Traffic values are geographic road-density proxies.

## License

This is a demonstration project for urban intelligence and predictive infrastructure monitoring.

## Version

6.0.0
