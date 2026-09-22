import React from "react";

const FEATURE_LABELS = {
  rainfall_mm: "Rainfall",
  traffic_density: "Traffic Density",
  drainage_capacity: "Drainage Capacity",
  road_condition: "Road Condition",
  historical_incidents: "Historical Incidents",
  population_density: "Population Density"
};

export default function Explainability({ explanation = [] }) {
  const maxAbs = Math.max(
    0.01,
    ...explanation.map((e) => Math.abs(e.shap_value))
  );

  return (
    <div className="card">
      <div className="card-title">Explainable AI (SHAP)</div>

      {explanation.length === 0 && (
        <div className="empty-state">
          No explanation available for this prediction yet.
        </div>
      )}

      {explanation.map((item) => {
        const widthPct = (Math.abs(item.shap_value) / maxAbs) * 100;
        const increasing = item.shap_value > 0;
        return (
          <div className="shap-row" key={item.feature}>
            <div>{FEATURE_LABELS[item.feature] || item.feature}</div>
            <div className="shap-bar-track">
              <div
                className={`shap-bar-fill ${increasing ? "shap-increase" : "shap-decrease"}`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <div style={{ textAlign: "right", color: increasing ? "var(--risk-high)" : "var(--accent)" }}>
              {item.shap_value > 0 ? "+" : ""}
              {item.shap_value}
            </div>
          </div>
        );
      })}

      {explanation.length > 0 && (
        <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 10 }}>
          Bars sorted by contribution magnitude. Orange increases predicted
          risk; cyan reduces it. Generated with SHAP TreeExplainer over the
          Random Forest model — this explains why the model produced its
          prediction, not a separate opinion.
        </div>
      )}
    </div>
  );
}
