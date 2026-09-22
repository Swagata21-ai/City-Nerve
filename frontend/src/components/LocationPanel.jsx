import React, { useState } from "react";
import { searchLocation } from "../services/api.js";
import { statusBadgeClass } from "../services/uiHelpers.js";

function StatusBadge({ label, status }) {
  if (!status) return null;
  return (
    <span className={`badge ${statusBadgeClass(status)}`}>
      <span className="badge-dot" />
      {label}: {status}
    </span>
  );
}

export default function LocationPanel({ analysis, onSelectCoords, loading }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await searchLocation(query.trim());
      setResults(res.results || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handleMyLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSelectCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => alert("Unable to retrieve your location.")
    );
  }

  const location = analysis?.location;
  const weather = analysis?.weather;
  const sources = analysis?.data_sources;
  const persistence = analysis?.persistence;

  return (
    <div className="card">
      <div className="card-title">Location Intelligence</div>

      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          type="search"
          placeholder="Search a location…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn" type="submit" disabled={searching}>
          {searching ? "…" : "Search"}
        </button>
      </form>

      <button className="btn-ghost" style={{ width: "100%", marginBottom: 10 }} onClick={handleMyLocation}>
        📍 Use My Location
      </button>

      {results.length > 0 && (
        <div style={{ marginBottom: 12, maxHeight: 140, overflowY: "auto" }}>
          {results.map((r, i) => (
            <div
              key={i}
              className="list-item"
              style={{ cursor: "pointer" }}
              onClick={() => {
                onSelectCoords(r.latitude, r.longitude);
                setResults([]);
                setQuery(r.name);
              }}
            >
              {r.name}
            </div>
          ))}
        </div>
      )}

      {loading && <div className="empty-state">Analyzing location…</div>}

      {!loading && !analysis && (
        <div className="empty-state">
          Click the map, search, or use My Location to run an analysis.
        </div>
      )}

      {!loading && analysis && (
        <div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>
            <strong>{location?.name}</strong>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 10 }}>
            Lat {location?.latitude?.toFixed(5)} · Lng {location?.longitude?.toFixed(5)}
          </div>

          {weather?.available && (
            <div style={{ fontSize: 12, marginBottom: 10 }}>
              🌡️ {weather.temperature_c}°C · 💧 {weather.humidity_percent}% humidity ·{" "}
              🌧️ {weather.rainfall_next_24h_mm}mm rain (24h) · 💨{" "}
              {weather.wind_speed_kmh} km/h
            </div>
          )}
          {weather && !weather.available && (
            <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 10 }}>
              Weather data unavailable.
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            <StatusBadge label="Weather" status={sources?.weather?.status} />
            <StatusBadge label="Geocoding" status={sources?.geocoding?.status} />
            <StatusBadge label="Infra" status={sources?.infrastructure?.status} />
            <StatusBadge label="Traffic" status={sources?.traffic?.status} />
            <StatusBadge label="ML" status={sources?.ml?.status} />
            <StatusBadge label="SHAP" status={sources?.explainability?.status} />
          </div>

          <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 8 }}>
            <strong>Database Status:</strong>{" "}
            {persistence?.database_available ? "Connected to Supabase" : "Unavailable"}
          </div>

          {persistence?.database_available && (
            <div style={{ fontSize: 11, color: "var(--text-2)" }}>
              <div>
                ✓ Prediction saved: {persistence.prediction_saved ? "Yes" : "No"}
              </div>
              <div>
                ✓ AI explanation saved: {persistence.ai_explanation_saved ? "Yes" : "No"}
              </div>
              <div>
                ✓ Preventive actions saved: {persistence.preventive_actions_saved ? "Yes" : "No"}
              </div>
              <div>
                ✓ Location analysis saved: {persistence.location_analysis_saved ? "Yes" : "No"}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
