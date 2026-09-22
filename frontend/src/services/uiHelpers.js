// Presentation-only helpers. No business logic / no fake data —
// these only map backend-provided strings to CSS classes.

export function riskLevelClass(level) {
  switch ((level || "").toLowerCase()) {
    case "critical":
      return "risk-critical";
    case "high":
      return "risk-high";
    case "moderate":
      return "risk-moderate";
    default:
      return "risk-low";
  }
}

export function corridorClass(status) {
  switch ((status || "").toUpperCase()) {
    case "BLOCKED":
      return "corridor-blocked";
    case "AT RISK":
      return "corridor-at-risk";
    default:
      return "corridor-normal";
  }
}

// Maps a backend data-source status string to a badge style.
// LIVE / AVAILABLE / CONNECTED -> live (green)
// *_CONTEXT / *_PROXY / DEMO_* / CITY_NERVE_DATABASE -> proxy (amber)
// UNAVAILABLE / anything else -> off (grey)
export function statusBadgeClass(status) {
  const s = (status || "").toUpperCase();
  if (["LIVE", "AVAILABLE", "CONNECTED", "LIVE_MODEL", "ONLINE"].includes(s)) {
    return "badge-live";
  }
  if (
    s.includes("PROXY") ||
    s.includes("CONTEXT") ||
    s.includes("DEMO") ||
    s === "CITY_NERVE_DATABASE"
  ) {
    return "badge-proxy";
  }
  return "badge-off";
}

export function formatPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return `${Number(value).toFixed(digits)}%`;
}

export function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return Number(value).toFixed(digits);
}
