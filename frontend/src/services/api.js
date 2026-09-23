// =========================================================
// CITY NERVE — Centralized API Service
// ---------------------------------------------------------
// Every call the frontend makes to the FastAPI backend goes
// through this file. Components never call fetch() directly.
//
// This file does not invent data. If the backend marks a
// field UNAVAILABLE / DEMO_CONTEXT / OSM_CONTEXT_PROXY, that
// status is passed straight through to the UI unchanged.
// =========================================================

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
  "https://city-nerve-backend.vercel.app";

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;

  let response;
  try {
    response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
  } catch (networkError) {
    // The backend is unreachable. Surface this honestly rather
    // than pretending the request succeeded.
    throw new ApiError(
      `CITY NERVE API is unreachable at ${BASE_URL}. ${networkError.message}`,
      0,
      null
    );
  }

  let body = null;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const detail =
      (body && (body.detail || body.message)) || response.statusText;
    throw new ApiError(detail, response.status, body);
  }

  return body;
}

function get(path) {
  return request(path, { method: "GET" });
}

function post(path, data) {
  return request(path, {
    method: "POST",
    body: JSON.stringify(data ?? {})
  });
}

// ---------------------------------------------------------
// SYSTEM
// ---------------------------------------------------------

export const getRoot = () => get("/");
export const getHealth = () => get("/health");
export const getSupabaseTest = () => get("/supabase-test");

// ---------------------------------------------------------
// ZONES / INCIDENTS
// ---------------------------------------------------------

export const getZones = () => get("/zones");
export const getIncidents = () => get("/incidents");

// ---------------------------------------------------------
// LOCATION INTELLIGENCE
// ---------------------------------------------------------
// This is the primary SENSE step of the intelligence loop.
// It reverse-geocodes, pulls weather, matches a zone (or
// falls back to OSM context), and runs the full prediction.

export const postLocationAnalysis = ({ latitude, longitude, zone_id = null }) =>
  post("/location-analysis", { latitude, longitude, zone_id });

export const getLocationAnalysisHistory = (limit = 50) =>
  get(`/location-analysis?limit=${limit}`);

export const searchLocation = (q) =>
  get(`/geocode?q=${encodeURIComponent(q)}`);

// ---------------------------------------------------------
// PREDICT / EXPLAIN / SIMULATE / ACT
// ---------------------------------------------------------
// All four take the same six ML inputs:
//   rainfall_mm, traffic_density, drainage_capacity,
//   road_condition, historical_incidents, population_density

export const postPredict = (inputs) => post("/predict", inputs);
export const postExplain = (inputs) => post("/explain", inputs);
export const postSimulate = (inputs) => post("/simulate", inputs);
export const postActions = (inputs) => post("/actions", inputs);

// ---------------------------------------------------------
// CITIZEN REPORTING (LEARN input)
// ---------------------------------------------------------

export const postCitizenReport = (report) => post("/citizen-reports", report);
export const getCitizenReports = (limit = 100) =>
  get(`/citizen-reports?limit=${limit}`);
export const getCitizenReportsByZone = (zoneId) =>
  get(`/citizen-reports/zone/${zoneId}`);

// ---------------------------------------------------------
// LEARN — HISTORICAL / AUDIT DATA
// ---------------------------------------------------------

export const getSimulationHistory = (limit = 50) =>
  get(`/simulation-history?limit=${limit}`);
export const getAiExplanations = (limit = 50) =>
  get(`/ai-explanations?limit=${limit}`);
export const getPreventiveActions = (limit = 50) =>
  get(`/preventive-actions?limit=${limit}`);
export const getRiskSummary = () => get("/risk-summary");

// ---------------------------------------------------------
// DEFAULT ML INPUT SHAPE
// ---------------------------------------------------------
// Used to seed the What-If Simulator and any manual /predict
// form before a real location analysis has been run.

export const DEFAULT_ML_INPUTS = {
  rainfall_mm: 20,
  traffic_density: 50,
  drainage_capacity: 50,
  road_condition: 50,
  historical_incidents: 0,
  population_density: 3000
};

export { ApiError, BASE_URL };
