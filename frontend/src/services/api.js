const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const request = async (path, options = {}) => {
  const url = `${BASE_URL.replace(/\/$/, "")}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { detail: text };
  }

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.message ||
        `Request failed with status ${response.status}`
    );
  }

  return data;
};

export const getRoot = () =>
  request("/");

export const getHealth = () =>
  request("/health");

export const getModelStatus = () =>
  request("/model-status");

export const getZones = () =>
  request("/zones");

export const getIncidents = () =>
  request("/incidents");

export const getSupabaseTest = () =>
  request("/supabase-test");

export const searchLocation = (query) =>
  request(`/geocode?q=${encodeURIComponent(query)}`);

export const postLocationAnalysis = ({
  latitude,
  longitude,
  zone_id = null,
}) =>
  request("/location-analysis", {
    method: "POST",
    body: JSON.stringify({
      latitude,
      longitude,
      zone_id,
    }),
  });

export const postPredict = (inputs) =>
  request("/predict", {
    method: "POST",
    body: JSON.stringify(inputs),
  });

export const postExplain = (inputs) =>
  request("/explain", {
    method: "POST",
    body: JSON.stringify(inputs),
  });

export const postSimulate = (inputs) =>
  request("/simulate", {
    method: "POST",
    body: JSON.stringify(inputs),
  });

export const postActions = (inputs) =>
  request("/actions", {
    method: "POST",
    body: JSON.stringify(inputs),
  });

export const postCitizenReport = (report) =>
  request("/citizen-reports", {
    method: "POST",
    body: JSON.stringify(report),
  });

export const getCitizenReports = (limit = 100) =>
  request(`/citizen-reports?limit=${limit}`);

export const getCitizenReportsByZone = (zoneId) =>
  request(`/citizen-reports/zone/${zoneId}`);

export const getSimulationHistory = (limit = 50) =>
  request(`/simulation-history?limit=${limit}`);

export const getAiExplanations = (limit = 50) =>
  request(`/ai-explanations?limit=${limit}`);

export const getPreventiveActions = (limit = 50) =>
  request(`/preventive-actions?limit=${limit}`);

export const getLocationAnalysisHistory = (limit = 50) =>
  request(`/location-analysis?limit=${limit}`);

export const getRiskSummary = () =>
  request("/risk-summary");

export const DEFAULT_ML_INPUTS = {
  rainfall_mm: 20,
  traffic_density: 50,
  drainage_capacity: 50,
  road_condition: 50,
  historical_incidents: 0,
  population_density: 3000,
};