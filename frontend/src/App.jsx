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
  ApiError,
} from "./services/api.js";

export default function App() {
  // =========================================================
  // GLOBAL APP STATE
  // =========================================================

  const [activeTab, setActiveTab] = useState("overview");

  const [zones, setZones] = useState([]);
  const [incidents, setIncidents] = useState([]);

  const [selectedLocation, setSelectedLocation] = useState(null);

  // Single source of truth for the currently selected location
  // and its CITY NERVE analysis.
  const [analysis, setAnalysis] = useState(null);

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // Used when Analysis History loads a previous simulation.
  const [externalSimulationInputs, setExternalSimulationInputs] =
    useState(null);

  // =========================================================
  // INITIAL DATA
  // =========================================================

  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      try {
        const [zoneData, incidentData] = await Promise.all([
          getZones(),
          getIncidents(),
        ]);

        if (!mounted) return;

        setZones(Array.isArray(zoneData) ? zoneData : []);
        setIncidents(Array.isArray(incidentData) ? incidentData : []);
      } catch (error) {
        if (!mounted) return;

        console.error("Initial CITY NERVE data load failed:", error);

        setZones([]);
        setIncidents([]);
      }
    }

    loadInitialData();

    return () => {
      mounted = false;
    };
  }, []);

  // =========================================================
  // NORMALIZE LOCATION ANALYSIS RESPONSE
  // =========================================================
  //
  // Backend currently returns:
  //
  // {
  //   location: {...},
  //   weather: {...},
  //   urban_context: {...},
  //   prediction: {...},
  //   data_sources: {...}
  // }
  //
  // We keep the response intact but make sure missing objects
  // don't break the frontend.
  // =========================================================

  const normalizeAnalysis = useCallback((result) => {
    if (!result || typeof result !== "object") {
      return null;
    }

    return {
      ...result,

      location: result.location || null,

      weather: result.weather || {},

      urban_context: result.urban_context || {},

      prediction: result.prediction
        ? {
            ...result.prediction,

            recommendations: Array.isArray(
              result.prediction.recommendations
            )
              ? result.prediction.recommendations
              : [],

            explanation: Array.isArray(result.prediction.explanation)
              ? result.prediction.explanation
              : [],
          }
        : null,

      data_sources: result.data_sources || {},
    };
  }, []);

  // =========================================================
  // LOCATION ANALYSIS
  // =========================================================
  //
  // MAP CLICK
  // SEARCH
  // MY LOCATION
  // ZONE SELECTION
  //
  // All of them eventually call this function.
  //
  // SENSE
  //   ↓
  // WEATHER + INFRASTRUCTURE
  //   ↓
  // PREDICT
  //   ↓
  // EXPLAIN
  //   ↓
  // ACTION
  // =========================================================

  const analyzeLocation = useCallback(
    async (lat, lng, zoneId = null) => {
      // Basic coordinate validation.
      const latitude = Number(lat);
      const longitude = Number(lng);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        setAnalysisError("Invalid latitude or longitude.");
        return;
      }

      // Update selected location immediately so the map responds.
      setSelectedLocation({
        lat: latitude,
        lng: longitude,
      });

      setAnalysisLoading(true);
      setAnalysisError(null);

      // Prevent an old simulation from being shown for a new location.
      setExternalSimulationInputs(null);

      try {
        const result = await postLocationAnalysis({
          latitude,
          longitude,
          zone_id: zoneId,
        });

        const normalized = normalizeAnalysis(result);

        if (!normalized) {
          throw new Error(
            "CITY NERVE returned an empty analysis response."
          );
        }

        setAnalysis(normalized);

        // If user is still on Overview, automatically move them
        // to Predictive Risk after a successful analysis.
        setActiveTab((currentTab) =>
          currentTab === "overview" ? "risk" : currentTab
        );
      } catch (err) {
        console.error("CITY NERVE location analysis failed:", err);

        const message =
          err instanceof ApiError
            ? err.message
            : err?.message || String(err);

        setAnalysisError(message);
        setAnalysis(null);
      } finally {
        setAnalysisLoading(false);
      }
    },
    [normalizeAnalysis]
  );

  // =========================================================
  // MAP CLICK
  // =========================================================

  function handleMapClick(lat, lng) {
    analyzeLocation(lat, lng);
  }

  // =========================================================
  // ZONE SELECTION
  // =========================================================

  function handleZoneSelect(zone) {
    if (!zone) return;

    const latitude = Number(zone.latitude);
    const longitude = Number(zone.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setAnalysisError("Selected zone has invalid coordinates.");
      return;
    }

    analyzeLocation(latitude, longitude, zone.id ?? null);
  }

  // =========================================================
  // LOAD SIMULATION FROM HISTORY
  // =========================================================

  function handleLoadSimulation(inputs) {
    if (!inputs || typeof inputs !== "object") {
      return;
    }

    setExternalSimulationInputs(inputs);
    setActiveTab("simulate");
  }

  // =========================================================
  // DERIVED DATA
  // =========================================================

  const prediction = analysis?.prediction || null;

  const urbanContext = analysis?.urban_context || null;

  // =========================================================
  // OVERVIEW METRICS
  // =========================================================

  const highRiskZones = zones.filter((zone) =>
    ["High", "Critical"].includes(zone?.risk_level)
  ).length;

  const corridorsAtRisk = prediction
    ? ["AT RISK", "BLOCKED"].includes(
        String(prediction.emergency_corridor || "").toUpperCase()
      )
      ? 1
      : 0
    : 0;

  // =========================================================
  // WHAT-IF SIMULATOR BASELINE
  // =========================================================
  //
  // Uses the exact values from the current location analysis.
  //
  // rainfall
  // traffic
  // drainage
  // road condition
  // historical incidents
  // population density
  // =========================================================

  const simulatorBaseline = urbanContext
    ? {
        rainfall_mm:
          Number(analysis?.weather?.rainfall_next_24h_mm) || 0,

        traffic_density:
          Number(urbanContext.traffic_density) || 50,

        drainage_capacity:
          Number(urbanContext.drainage_capacity) || 50,

        road_condition:
          Number(urbanContext.road_condition) || 50,

        historical_incidents:
          Number(urbanContext.historical_incidents) || 0,

        population_density:
          Number(urbanContext.population_density) || 0,
      }
    : null;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="app-shell">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <Header
        locationName={analysis?.location?.name}
        prediction={prediction}
      />

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <Sidebar
        activeTab={activeTab}
        onSelect={setActiveTab}
      />

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="app-main">

        {/* ===================================================
            GLOBAL ANALYSIS ERROR
        =================================================== */}

        {analysisError && (
          <div
            className="card"
            style={{
              borderColor: "var(--risk-critical)",
              marginBottom: 16,
            }}
          >
            <strong
              style={{
                color: "var(--risk-critical)",
              }}
            >
              Analysis failed:
            </strong>{" "}
            {analysisError}
          </div>
        )}

        {/* ===================================================
            GLOBAL ANALYSIS LOADING
        =================================================== */}

        {analysisLoading && (
          <div
            className="card"
            style={{
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span className="status-dot status-dot-warning" />

            <div>
              <strong>CITY NERVE is analyzing this location...</strong>

              <div
                style={{
                  marginTop: 4,
                  opacity: 0.7,
                  fontSize: 13,
                }}
              >
                Collecting environmental and infrastructure context,
                running the risk model, and generating explanations.
              </div>
            </div>
          </div>
        )}

        {/* ===================================================
            OVERVIEW
        =================================================== */}

        {activeTab === "overview" && (
          <>
            <div className="section-title">
              Overview
            </div>

            <div
              className="grid grid-4"
              style={{
                marginBottom: 16,
              }}
            >
              <MetricsCard
                label="Monitored zones"
                value={zones.length}
              />

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

              <MetricsCard
                label="Active incidents"
                value={incidents.length}
              />
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

        {/* ===================================================
            PREDICTIVE RISK
        =================================================== */}

        {activeTab === "risk" && (
          <>
            <div className="section-title">
              Predictive Risk
            </div>

            <div className="grid grid-2">
              <PredictiveRisk
                prediction={prediction}
              />

              <LocationPanel
                analysis={analysis}
                onSelectCoords={analyzeLocation}
                loading={analysisLoading}
              />
            </div>
          </>
        )}

        {/* ===================================================
            EXPLAINABLE AI
        =================================================== */}

        {activeTab === "explain" && (
          <>
            <div className="section-title">
              Explainable AI
            </div>

            <Explainability
              explanation={prediction?.explanation || []}
            />
          </>
        )}

        {/* ===================================================
            WHAT-IF SIMULATOR
        =================================================== */}

        {activeTab === "simulate" && (
          <>
            <div className="section-title">
              What-If Simulator
            </div>

            <WhatIfSimulator
              baseline={simulatorBaseline}
              externalInputs={externalSimulationInputs}
            />
          </>
        )}

        {/* ===================================================
            INFRASTRUCTURE INTELLIGENCE
        =================================================== */}

        {activeTab === "infrastructure" && (
          <>
            <div className="section-title">
              Infrastructure Intelligence
            </div>

            <Infrastructure
              urbanContext={urbanContext}
            />
          </>
        )}

        {/* ===================================================
            EMERGENCY RESPONSE
        =================================================== */}

        {activeTab === "emergency" && (
          <>
            <div className="section-title">
              Emergency Response
            </div>

            <EmergencyResponse
              prediction={prediction}
            />
          </>
        )}

        {/* ===================================================
            PREVENTIVE ACTION ENGINE
        =================================================== */}

        {activeTab === "actions" && (
          <>
            <div className="section-title">
              Preventive Action Engine
            </div>

            <ActionEngine
              recommendations={
                prediction?.recommendations || []
              }
            />
          </>
        )}

        {/* ===================================================
            CITIZEN REPORTS
        =================================================== */}

        {activeTab === "reports" && (
          <>
            <div className="section-title">
              Citizen Reporting
            </div>

            <CitizenReports
              selectedLocation={selectedLocation}
            />
          </>
        )}

        {/* ===================================================
            ANALYSIS HISTORY
        =================================================== */}

        {activeTab === "history" && (
          <>
            <div className="section-title">
              Analysis History
            </div>

            <AnalysisHistory
              onReanalyze={analyzeLocation}
              onLoadSimulation={handleLoadSimulation}
            />
          </>
        )}

        {/* ===================================================
            SYSTEM STATUS
        =================================================== */}

        {activeTab === "status" && (
          <>
            <div className="section-title">
              System Status
            </div>

            <SystemStatus />
          </>
        )}
      </main>
    </div>
  );
}