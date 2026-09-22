import React, { useEffect, useState } from "react";
import { postSimulate } from "../services/api.js";
import { riskLevelClass, corridorClass } from "../services/uiHelpers.js";

const SLIDERS = [
  { key: "rainfall_mm", label: "Rainfall (mm)", min: 0, max: 200, step: 1 },
  { key: "traffic_density", label: "Traffic Density", min: 0, max: 100, step: 1 },
  { key: "drainage_capacity", label: "Drainage Capacity", min: 0, max: 100, step: 1 },
  { key: "road_condition", label: "Road Condition", min: 0, max: 100, step: 1 },
  { key: "historical_incidents", label: "Historical Incidents", min: 0, max: 20, step: 1 },
  { key: "population_density", label: "Population Density", min: 0, max: 10000, step: 50 }
];

export default function WhatIfSimulator({ baseline, externalInputs }) {
  const [inputs, setInputs] = useState(baseline);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (baseline) setInputs(baseline);
  }, [baseline]);

  useEffect(() => {
    if (externalInputs) {
      setInputs(externalInputs);
      setResult(null); // Clear previous result when loading new inputs
    }
  }, [externalInputs]);

  function update(key, value) {
    setInputs((prev) => ({ ...prev, [key]: Number(value) }));
  }

  async function runSimulation() {
    setLoading(true);
    setError(null);
    try {
      const res = await postSimulate(inputs);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!inputs) {
    return (
      <div className="card">
        <div className="card-title">What-If Simulator</div>
        <div className="empty-state">
          Run a location analysis first to seed the simulator with real inputs.
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-2">
      <div className="card">
        <div className="card-title">Scenario Variables</div>
        {SLIDERS.map((s) => (
          <div key={s.key} style={{ marginBottom: 14 }}>
            <div className="flex-between" style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 12 }}>{s.label}</span>
              <span style={{ fontSize: 12, color: "var(--accent)" }}>
                {inputs[s.key]}
              </span>
            </div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={inputs[s.key] ?? 0}
              onChange={(e) => update(s.key, e.target.value)}
            />
          </div>
        ))}
        <button className="btn" onClick={runSimulation} disabled={loading}>
          {loading ? "Running…" : "Run Simulation"}
        </button>
        {error && (
          <div style={{ color: "var(--risk-critical)", fontSize: 12, marginTop: 8 }}>
            {error}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Simulated Outcome</div>
        {!result && (
          <div className="empty-state">
            Adjust variables and run the simulation to see the predicted
            outcome.
          </div>
        )}
        {result && (
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
              <div className="metric-value">
                {result.simulation.risk_percentage}%
              </div>
              <span className={`risk-pill ${riskLevelClass(result.simulation.risk_level)}`}>
                {result.simulation.risk_level}
              </span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <div className="metric-label">Predicted disruption</div>
                <div>{result.simulation.predicted_disruption}</div>
              </div>
              <div>
                <div className="metric-label">Emergency corridor</div>
                <div className={corridorClass(result.simulation.emergency_corridor)} style={{ fontWeight: 700 }}>
                  {result.simulation.emergency_corridor}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 14 }}>
              {result.persistence?.database_available
                ? result.persistence.simulation_history_saved
                  ? "Scenario saved to simulation history."
                  : "Database connected, but this scenario could not be saved."
                : "Database unavailable — scenario was not persisted."}
            </div>
            <div className="disclaimer">{result.disclaimer}</div>
          </div>
        )}
      </div>
    </div>
  );
}
