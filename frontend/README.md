# CITY NERVE — Frontend

"The City That Sees Tomorrow" — React + Vite dashboard for the CITY NERVE
predictive urban infrastructure intelligence platform.

This is a **decision-support UI**, not a control system. Every recommendation
shown carries "AI-generated decision-support recommendation. Human approval
required." and no button here can move traffic lights, drainage systems, or
emergency vehicles.

## Setup

```bash
npm install
cp .env.example .env
# edit .env: VITE_API_BASE_URL should point at your running FastAPI backend
npm run dev
```

The backend (`main.py`) must be running separately, e.g.:

```bash
uvicorn main:app --reload --port 8000
```

## Structure

```
src/
  index.css               # dark command-center theme, cyan/blue accents
  services/api.js        # single point of contact with the FastAPI backend
  services/uiHelpers.js  # pure presentation helpers (risk colors, status badges)
  components/
    Header.jsx            # brand + live risk snapshot
    Sidebar.jsx            # module navigation
    MetricsCard.jsx        # overview stat tiles
    RiskMap.jsx            # React-Leaflet map: click / zone markers / fly-to
    LocationPanel.jsx      # search, My Location, address, weather, source status, database persistence
    PredictiveRisk.jsx     # risk probability/level/corridor + recommendations
    Explainability.jsx     # SHAP feature contribution bars
    WhatIfSimulator.jsx    # scenario sliders -> POST /simulate
    ActionEngine.jsx       # preventive actions with human-approval checkbox
    Infrastructure.jsx     # OSM/Overpass context, explicitly labeled as proxies
    EmergencyResponse.jsx  # corridor status + response recommendations
    CitizenReports.jsx     # submit + browse citizen reports
    AnalysisHistory.jsx    # view persisted analyses, explanations, actions, simulations from Supabase
    SystemStatus.jsx       # live status of every backend dependency
  App.jsx                  # wires modules together, owns selected-location state
```

## Contract with the backend

`services/api.js` is the **only** file that calls `fetch`. Every function name
maps 1:1 to a backend route (`postLocationAnalysis` → `POST /location-analysis`,
`getZones` → `GET /zones`, etc.). If the backend adds or renames a field, only
that file and the component reading the field need to change.

The UI never invents a value the backend didn't return. Where the backend
marks something `UNAVAILABLE`, `DEMO_CONTEXT`, or `OSM_CONTEXT_PROXY`, the UI
surfaces that status verbatim via colored badges rather than pretending the
data is live.
