import React from "react";
import { riskLevelClass } from "../services/uiHelpers.js";

export default function Header({ locationName, prediction }) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark">CN</div>
        <div>
          <div>CITY NERVE</div>
          <div className="brand-tagline">The city that sees tomorrow</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {locationName && (
          <div style={{ color: "var(--text-1)", fontSize: 12 }}>
            {locationName}
          </div>
        )}
        {prediction && (
          <span className={`risk-pill ${riskLevelClass(prediction.risk_level)}`}>
            {prediction.risk_level} · {prediction.risk_percentage}%
          </span>
        )}
      </div>
    </header>
  );
}
