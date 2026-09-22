import React, { useEffect, useState } from "react";
import { getHealth } from "../services/api.js";
import { statusBadgeClass } from "../services/uiHelpers.js";

const ROWS = [
  { key: "ml_model", label: "Random Forest ML Model" },
  { key: "shap", label: "SHAP Explainability" },
  { key: "supabase", label: "Supabase Database" },
  { key: "weather", label: "Open-Meteo Weather" },
  { key: "geocoding", label: "OpenStreetMap Nominatim" },
  { key: "infrastructure", label: "OpenStreetMap / Overpass" },
  { key: "traffic", label: "Traffic Data Provider" }
];

export default function SystemStatus() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="card">
      <div className="card-title">System Status</div>

      {error && (
        <div style={{ color: "var(--risk-critical)", fontSize: 13, marginBottom: 12 }}>
          Could not reach CITY NERVE API: {error}
        </div>
      )}

      {!error && !health && <div className="empty-state">Checking system status…</div>}

      {health && (
        <>
          {ROWS.map((row) => (
            <div key={row.key} className="list-item flex-between">
              <span style={{ fontSize: 13 }}>{row.label}</span>
              <span className={`badge ${statusBadgeClass(health[row.key])}`}>
                <span className="badge-dot" />
                {String(health[row.key])}
              </span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 12 }}>
            API version {health.version} · Traffic has no live provider
            connected — displayed values are contextual proxies only, never
            presented as live traffic data.
          </div>
        </>
      )}
    </div>
  );
}
