import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents
} from "react-leaflet";
import L from "leaflet";
import { riskLevelClass } from "../services/uiHelpers.js";

// Default Leaflet marker icons don't resolve correctly under Vite's
// bundler without this fix.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
});

const RISK_DOT_COLOR = {
  Low: "#34d399",
  Moderate: "#fbbf24",
  High: "#fb923c",
  Critical: "#f87171"
};

function zoneIcon(riskLevel) {
  const color = RISK_DOT_COLOR[riskLevel] || "#22d3ee";
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #0a0e14;box-shadow:0 0 0 2px ${color}55"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
}

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, Math.max(map.getZoom(), 13), { duration: 0.8 });
    }
  }, [position, map]);
  return null;
}

export default function RiskMap({
  zones = [],
  selectedLocation,
  selectedRiskLevel,
  onMapClick,
  onZoneSelect,
  center = [22.5726, 88.3639], // sensible default; overridden once a location loads
  zoom = 12
}) {
  return (
    <div className="map-wrap">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%", background: "#0f1520" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickHandler onMapClick={onMapClick} />

        {selectedLocation && (
          <>
            <Marker position={[selectedLocation.lat, selectedLocation.lng]}>
              <Popup>
                Selected location
                {selectedRiskLevel && (
                  <>
                    <br />
                    Risk: <strong>{selectedRiskLevel}</strong>
                  </>
                )}
              </Popup>
            </Marker>
            <FlyTo position={[selectedLocation.lat, selectedLocation.lng]} />
          </>
        )}

        {zones.map((zone) => (
          <Marker
            key={zone.id}
            position={[zone.latitude, zone.longitude]}
            icon={zoneIcon(zone.risk_level)}
            eventHandlers={{
              click: () => onZoneSelect && onZoneSelect(zone)
            }}
          >
            <Popup>
              <strong>{zone.name}</strong>
              <br />
              CITY NERVE monitored zone
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
