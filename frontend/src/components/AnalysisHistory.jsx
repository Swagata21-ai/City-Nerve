import React, { useEffect, useState } from "react";
import { getLocationAnalysisHistory, getAiExplanations, getPreventiveActions, getSimulationHistory } from "../services/api.js";
import { riskLevelClass } from "../services/uiHelpers.js";

export default function AnalysisHistory({ onReanalyze, onLoadSimulation }) {
  const [activeTab, setActiveTab] = useState("analyses");
  const [analyses, setAnalyses] = useState([]);
  const [explanations, setExplanations] = useState([]);
  const [actions, setActions] = useState([]);
  const [simulations, setSimulations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === "analyses") {
        const data = await getLocationAnalysisHistory(50);
        setAnalyses(Array.isArray(data) ? data : []);
      } else if (activeTab === "explanations") {
        const data = await getAiExplanations(50);
        setExplanations(Array.isArray(data) ? data : []);
      } else if (activeTab === "actions") {
        const data = await getPreventiveActions(50);
        setActions(Array.isArray(data) ? data : []);
      } else if (activeTab === "simulations") {
        const data = await getSimulationHistory(50);
        setSimulations(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleReanalyze(item) {
    if (onReanalyze && item.latitude && item.longitude) {
      onReanalyze(item.latitude, item.longitude);
    }
  }

  function handleLoadSimulation(item) {
    if (onLoadSimulation && item.inputs) {
      onLoadSimulation(item.inputs);
    }
  }

  const TABS = [
    { id: "analyses", label: "Location Analyses", count: analyses.length },
    { id: "explanations", label: "AI Explanations", count: explanations.length },
    { id: "actions", label: "Preventive Actions", count: actions.length },
    { id: "simulations", label: "Simulation History", count: simulations.length }
  ];

  return (
    <div className="card">
      <div className="card-title">Analysis History (Supabase)</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`btn-ghost ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            style={{ fontSize: 12 }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {loading && <div className="empty-state">Loading from Supabase…</div>}

      {!loading && activeTab === "analyses" && (
        <div>
          {analyses.length === 0 && <div className="empty-state">No location analyses saved yet.</div>}
          {analyses.map((item, i) => (
            <div key={item.id || i} className="list-item">
              <div className="flex-between">
                <strong style={{ fontSize: 13 }}>{item.location_name || "Unknown location"}</strong>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className={`risk-pill ${riskLevelClass(item.risk_level)}`} style={{ fontSize: 11 }}>
                    {item.risk_level}
                  </span>
                  {onReanalyze && (
                    <button
                      className="btn-ghost"
                      onClick={() => handleReanalyze(item)}
                      style={{ fontSize: 11, padding: "4px 8px" }}
                    >
                      Re-analyze
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 4 }}>
                {item.latitude?.toFixed?.(4)}, {item.longitude?.toFixed?.(4)} · Risk: {item.risk_probability ? (item.risk_probability * 100).toFixed(1) : item.risk_percentage?.toFixed?.(1)}%
              </div>
              <div style={{ fontSize: 11, color: "var(--text-2)" }}>
                Primary risk: {item.primary_risk}
              </div>
              {item.weather_temperature !== undefined && (
                <div style={{ fontSize: 10, color: "var(--text-2)", marginTop: 2 }}>
                  🌡️ {item.weather_temperature}°C · 💧 {item.weather_humidity}% · 🌧️ {item.weather_rainfall}mm
                </div>
              )}
              {item.analysis_timestamp && (
                <div style={{ fontSize: 10, color: "var(--text-2)" }}>
                  Analyzed: {new Date(item.analysis_timestamp).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && activeTab === "explanations" && (
        <div>
          {explanations.length === 0 && <div className="empty-state">No AI explanations saved yet.</div>}
          {explanations.map((item, i) => (
            <div key={item.id || i} className="list-item">
              <div className="flex-between">
                <div style={{ fontSize: 11, color: "var(--text-2)" }}>
                  {item.latitude?.toFixed?.(4)}, {item.longitude?.toFixed?.(4)}
                </div>
                {onReanalyze && (
                  <button
                    className="btn-ghost"
                    onClick={() => handleReanalyze(item)}
                    style={{ fontSize: 11, padding: "4px 8px" }}
                  >
                    Re-analyze
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12 }}>
                {Array.isArray(item.explanation) ? (
                  item.explanation.slice(0, 3).map((exp, j) => (
                    <div key={j} style={{ fontSize: 11, color: "var(--text-1)" }}>
                      {exp.feature}: {exp.shap_value > 0 ? "+" : ""}{exp.shap_value}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 11, color: "var(--text-2)" }}>Explanation data unavailable</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && activeTab === "actions" && (
        <div>
          {actions.length === 0 && <div className="empty-state">No preventive actions saved yet.</div>}
          {actions.map((item, i) => (
            <div key={item.id || i} className="list-item">
              <div className="flex-between">
                <div style={{ fontSize: 11, color: "var(--text-2)" }}>
                  {item.latitude?.toFixed?.(4)}, {item.longitude?.toFixed?.(4)} · Status: {item.status}
                </div>
                {onReanalyze && (
                  <button
                    className="btn-ghost"
                    onClick={() => handleReanalyze(item)}
                    style={{ fontSize: 11, padding: "4px 8px" }}
                  >
                    Re-analyze
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12 }}>
                {Array.isArray(item.actions) ? (
                  item.actions.slice(0, 2).map((action, j) => (
                    <div key={j} style={{ fontSize: 11, color: "var(--text-1)" }}>
                      <strong>{action.priority}</strong>: {action.action}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 11, color: "var(--text-2)" }}>Actions data unavailable</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && activeTab === "simulations" && (
        <div>
          {simulations.length === 0 && <div className="empty-state">No simulation history saved yet.</div>}
          {simulations.map((item, i) => (
            <div key={item.id || i} className="list-item">
              <div className="flex-between">
                <div>
                  <span className={`risk-pill ${riskLevelClass(item.risk_level)}`} style={{ fontSize: 11 }}>
                    {item.risk_level}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-2)", marginLeft: 8 }}>
                    {item.risk_percentage?.toFixed?.(1)}%
                  </span>
                </div>
                {onLoadSimulation && item.inputs && (
                  <button
                    className="btn-ghost"
                    onClick={() => handleLoadSimulation(item)}
                    style={{ fontSize: 11, padding: "4px 8px" }}
                  >
                    Load to Simulator
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 4 }}>
                {item.predicted_disruption} · {item.emergency_corridor}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-2)" }}>
                {item.timestamp}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 16 }}>
        All data persisted to Supabase PostgreSQL database. Requires database connection.
      </div>
    </div>
  );
}
