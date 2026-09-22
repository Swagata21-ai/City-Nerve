import React from "react";
import { corridorClass, riskLevelClass } from "../services/uiHelpers.js";

export default function EmergencyResponse({ prediction }) {
  if (!prediction) {
    return (
      <div className="card">
        <div className="card-title">Emergency Response</div>
        <div className="empty-state">
          No active analysis. Select a location to assess corridor status.
        </div>
      </div>
    );
  }

  const { emergency_corridor, primary_risk, risk_level, risk_probability, recommendations = [] } =
    prediction;

  return (
    <div className="card">
      <div className="card-title">Emergency Response</div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <div>
          <div className="metric-label">Corridor status</div>
          <div className={corridorClass(emergency_corridor)} style={{ fontSize: 20, fontWeight: 800 }}>
            {emergency_corridor}
          </div>
        </div>
        <div>
          <div className="metric-label">Primary risk</div>
          <div style={{ fontSize: 15 }}>{primary_risk}</div>
        </div>
        <div>
          <div className="metric-label">Risk level</div>
          <span className={`risk-pill ${riskLevelClass(risk_level)}`}>{risk_level}</span>
        </div>
        <div>
          <div className="metric-label">Risk probability</div>
          <div style={{ fontSize: 15 }}>{risk_probability}</div>
        </div>
      </div>

      <div className="card-title">Response Recommendations</div>
      {recommendations.map((rec, i) => (
        <div key={i} className="list-item">
          <div className="flex-between">
            <strong style={{ fontSize: 13 }}>{rec.action}</strong>
            <span className="tag">{rec.priority}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-1)" }}>{rec.reason}</div>
        </div>
      ))}

      <div className="disclaimer">
        CITY NERVE does not control traffic lights, emergency vehicles,
        roads, drainage systems, or any other infrastructure. All corridor
        recommendations require human review by emergency planning staff.
      </div>
    </div>
  );
}
