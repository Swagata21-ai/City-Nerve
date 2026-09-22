import React from "react";
import { riskLevelClass, corridorClass } from "../services/uiHelpers.js";

export default function PredictiveRisk({ prediction }) {
  if (!prediction) {
    return (
      <div className="card">
        <div className="card-title">Predictive Risk</div>
        <div className="empty-state">
          No prediction yet. Select a location to run the model.
        </div>
      </div>
    );
  }

  const {
    risk_probability,
    risk_percentage,
    risk_level,
    primary_risk,
    predicted_disruption,
    emergency_corridor,
    model,
    recommendations = []
  } = prediction;

  return (
    <div className="card">
      <div className="card-title">Predictive Risk</div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <div className="metric-value">{risk_percentage}%</div>
        <span className={`risk-pill ${riskLevelClass(risk_level)}`}>{risk_level}</span>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 14 }}>
        <div>
          <div className="metric-label">Risk probability</div>
          <div style={{ fontSize: 15 }}>{risk_probability}</div>
        </div>
        <div>
          <div className="metric-label">Primary risk</div>
          <div style={{ fontSize: 15 }}>{primary_risk}</div>
        </div>
        <div>
          <div className="metric-label">Predicted disruption</div>
          <div style={{ fontSize: 15 }}>{predicted_disruption}</div>
        </div>
        <div>
          <div className="metric-label">Emergency corridor</div>
          <div className={corridorClass(emergency_corridor)} style={{ fontWeight: 700 }}>
            {emergency_corridor}
          </div>
        </div>
      </div>

      <div className="card-title" style={{ marginTop: 4 }}>AI Recommendations</div>
      {recommendations.length === 0 && (
        <div className="empty-state">No recommendations generated.</div>
      )}
      {recommendations.map((rec, i) => (
        <div key={i} className="list-item">
          <div className="flex-between">
            <strong style={{ fontSize: 13 }}>{rec.action}</strong>
            <span className="tag">{rec.priority}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-1)", marginTop: 2 }}>
            {rec.reason}
          </div>
        </div>
      ))}
      {recommendations.length > 0 && (
        <div className="disclaimer">{recommendations[0]?.disclaimer}</div>
      )}

      <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 12 }}>
        Model: {model?.name} · Version {model?.version}
      </div>
    </div>
  );
}
