import React from "react";

export default function MetricsCard({ label, value, hint, accent }) {
  return (
    <div className="card">
      <div
        className="metric-value"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      <div className="metric-label">{label}</div>
      {hint && (
        <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 6 }}>
          {hint}
        </div>
      )}
    </div>
  );
}
