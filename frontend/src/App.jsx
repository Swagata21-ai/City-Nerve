import React, { useEffect, useState, useCallback } from "react";
import Header from "./components/Header.jsx";
import Sidebar from "./components/Sidebar.jsx";
import MetricsCard from "./components/MetricsCard.jsx";
import RiskMap from "./components/RiskMap.jsx";
import LocationPanel from "./components/LocationPanel.jsx";
import PredictiveRisk from "./components/PredictiveRisk.jsx";
import Explainability from "./components/Explainability.jsx";
import WhatIfSimulator from "./components/WhatIfSimulator.jsx";
import ActionEngine from "./components/ActionEngine.jsx";
import Infrastructure from "./components/Infrastructure.jsx";
import EmergencyResponse from "./components/EmergencyResponse.jsx";
import CitizenReports from "./components/CitizenReports.jsx";
import AnalysisHistory from "./components/AnalysisHistory.jsx";
import SystemStatus from "./components/SystemStatus.jsx";

import {
  getZones,
  getIncidents,
  postLocationAnalysis,
  ApiError
} from "./services/api.js";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");

  const [zones, setZones] = useState([]);
  const [incidents, setIncidents] = useState([]);

  const [selectedLocation, setSelectedLocation] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const [externalSimulationInputs, setExternalSimulationInputs] = useState(null);

  // -------------------------------------------------------
  // Load monitored zones + incidents for the Overview map
  // and metrics. These never claim to be live sensor feeds —
  // they are whatever CITY NERVE's own database holds.
  // -------------------------------------------------------
  useEffect(() => {
    getZones().then(setZones).catch(() => setZones([]));
    getIncidents().then(setIncidents).catch(() => setIncidents([]));
  }, []);

  // -------------------------------------------------------
  // SENSE → PREDICT → EXPLAIN → ACT, triggered by any of the
  // three location-selection methods (map click, search,
  // My Location). This is the single source of truth for
  // "what is happening at this location right now".
  // -------------------------------------------------------
  const analyzeLocation = useCallback(async (lat, lng, zoneId = null) => {
    setSelectedLocation({ lat, lng });
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const result = await postLocationAnalysis({
        latitude: lat,
        longitude: lng,
        zone_id: zoneId
      });
      setAnalysis(result);
      setActiveTab((tab) => (tab === "overview" ? "risk" : tab));
    } catch (err) {
      setAnalysisError(err instanceof ApiError ? err.message : String(err));
      setAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  function handleMapClick(lat, lng) {
    analyzeLocation(lat, lng);
  }

  function handleZoneSelect(zone) {
    analyzeLocation(zone.latitude, zone.longitude, zone.id);
  }

  function handleLoadSimulation(inputs) {
    setExternalSimulationInputs(inputs);
    setActiveTab("simulate");
  }

  const prediction = analysis?.prediction || null;
  const urbanContext = analysis?.urban_context || null;

  const highRiskZones = zones.filter((z) =>
    ["High", "Critical"].includes(z.risk_level)
  ).length;

  const corridorsAtRisk = prediction
    ? ["AT RISK", "BLOCKED"].includes(prediction.emergency_corridor)
      ? 1
      : 0
    : 0;

  const simulatorBaseline = urbanContext
    ? {
        rainfall_mm: analysis?.weather?.rainfall_next_24h_mm ?? 0,
        traffic_density: urbanContext.traffic_density ?? 50,
        drainage_capacity: urbanContext.drainage_capacity ?? 50,
        road_condition: urbanContext.road_condition ?? 50,
        historical_incidents: urbanContext.historical_incidents ?? 0,
        population_density: urbanContext.population_density ?? 0
      }
    : null;

  return (
    <div className="app-shell">
      <Header locationName={analysis?.location?.name} prediction={prediction} />
      <Sidebar activeTab={activeTab} onSelect={setActiveTab} />

      <main className="app-main">
        {analysisError && (
          <div
            className="card"
            style={{ borderColor: "var(--risk-critical)", marginBottom: 16 }}
          >
            <strong style={{ color: "var(--risk-critical)" }}>
              Analysis failed:
            </strong>{" "}
            {analysisError}
          </div>
        )}

        {activeTab === "overview" && (
          <>
            <div className="section-title">Overview</div>
            <div className="grid grid-4" style={{ marginBottom: 16 }}>
              <MetricsCard label="Monitored zones" value={zones.length} />
              <MetricsCard
                label="High-risk zones"
                value={highRiskZones}
                accent="var(--risk-high)"
              />
              <MetricsCard
                label="Emergency corridors at risk"
                value={corridorsAtRisk}
                accent="var(--risk-critical)"
              />
              <MetricsCard label="Active incidents" value={incidents.length} />
            </div>

            <div className="grid grid-2">
              <RiskMap
                zones={zones}
                selectedLocation={selectedLocation}
                selectedRiskLevel={prediction?.risk_level}
                onMapClick={handleMapClick}
                onZoneSelect={handleZoneSelect}
              />
              <LocationPanel
                analysis={analysis}
                onSelectCoords={analyzeLocation}
                loading={analysisLoading}
              />
            </div>
          </>
        )}

        {activeTab === "risk" && (
          <>
            <div className="section-title">Predictive Risk</div>
            <div className="grid grid-2">
              <PredictiveRisk prediction={prediction} />
              <LocationPanel
                analysis={analysis}
                onSelectCoords={analyzeLocation}
                loading={analysisLoading}
              />
            </div>
          </>
        )}

        {activeTab === "explain" && (
          <>
            <div className="section-title">Explainable AI</div>
            <Explainability explanation={prediction?.explanation} />
          </>
        )}

        {activeTab === "simulate" && (
          <>
            <div className="section-title">What-If Simulator</div>
            <WhatIfSimulator baseline={simulatorBaseline} externalInputs={externalSimulationInputs} />
          </>
        )}

        {activeTab === "infrastructure" && (
          <>
            <div className="section-title">Infrastructure Intelligence</div>
            <Infrastructure urbanContext={urbanContext} />
          </>
        )}

        {activeTab === "emergency" && (
          <>
            <div className="section-title">Emergency Response</div>
            <EmergencyResponse prediction={prediction} />
          </>
        )}

        {activeTab === "actions" && (
          <>
            <div className="section-title">Preventive Action Engine</div>
            <ActionEngine recommendations={prediction?.recommendations} />
          </>
        )}

        {activeTab === "reports" && (
          <>
            <div className="section-title">Citizen Reporting</div>
            <CitizenReports selectedLocation={selectedLocation} />
          </>
        )}

        {activeTab === "history" && (
          <>
            <div className="section-title">Analysis History</div>
            <AnalysisHistory onReanalyze={analyzeLocation} onLoadSimulation={handleLoadSimulation} />
          </>
        )}

        {activeTab === "status" && (
          <>
            <div className="section-title">System Status</div>
            <SystemStatus />
          </>
        )}
      </main>
    </div>
  );
}
