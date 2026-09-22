import React from "react";
import { statusBadgeClass } from "../services/uiHelpers.js";

export default function Infrastructure({ urbanContext }) {
  if (!urbanContext) {
    return (
      <div className="card">
        <div className="card-title">Infrastructure Intelligence</div>
        <div className="empty-state">
          Select a location to load OpenStreetMap infrastructure context.
        </div>
      </div>
    );
  }

  const osm = urbanContext.osm || {};
  const roads = osm.roads || {};
  const waterways = osm.waterways || {};
  const buildings = osm.buildings || {};
  const amenities = osm.amenities || {};
  const emergencyFeatures = osm.emergency_features || {};
  const landuse = osm.landuse_features || {};
  const urbanDensity = osm.urban_density || {};

  return (
    <div className="grid grid-2">
      <div className="card">
        <div className="card-title">OpenStreetMap Infrastructure Context</div>

        <div style={{ marginBottom: 8 }}>
          <span className={`badge ${statusBadgeClass(osm.status)}`}>
            <span className="badge-dot" />
            {osm.status || "UNAVAILABLE"}
          </span>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 12 }}>
          <Stat label="Total road features" value={roads.total_features} />
          <Stat label="Major road features" value={roads.major_features} />
          <Stat label="Road density score" value={roads.road_density_score} />
          <Stat label="Major road score" value={roads.major_road_score} />
          <Stat label="Buildings" value={buildings.count} />
          <Stat label="Amenities" value={amenities.count} />
          <Stat label="Waterways" value={waterways.count} />
          <Stat label="Emergency features" value={emergencyFeatures.count} />
          <Stat label="Land-use features" value={landuse.count} />
          <Stat label="Urban density score" value={urbanDensity.score} />
        </div>

        <div className="disclaimer">
          These values are OpenStreetMap contextual/geographic proxies, not
          physical sensor measurements. Population figure is a density proxy
          ({urbanDensity.population_status || "UNAVAILABLE"}), not an official
          census count.
        </div>
      </div>

      <div className="card">
        <div className="card-title">Model Input Context</div>
        <Row
          label="Traffic density"
          value={urbanContext.traffic_density}
          status={urbanContext.traffic_data_status}
          message={urbanContext.traffic_data_message}
        />
        <Row
          label="Drainage capacity"
          value={urbanContext.drainage_capacity}
          status={urbanContext.drainage_status}
        />
        <Row
          label="Road condition"
          value={urbanContext.road_condition}
          status={urbanContext.road_condition_status}
        />
        <Row
          label="Population density"
          value={urbanContext.population_density}
          status={urbanContext.population_status}
        />
        <Row
          label="Historical incidents (10km)"
          value={urbanContext.historical_incidents}
        />
        <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 10 }}>
          {urbanContext.infrastructure_message}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="metric-label">{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700 }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function Row({ label, value, status, message }) {
  return (
    <div className="list-item">
      <div className="flex-between">
        <span style={{ fontSize: 12 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{value ?? "—"}</span>
      </div>
      {status && (
        <div className={`badge ${statusBadgeClass(status)}`} style={{ marginTop: 4 }}>
          <span className="badge-dot" />
          {status}
        </div>
      )}
      {message && (
        <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 4 }}>
          {message}
        </div>
      )}
    </div>
  );
}
