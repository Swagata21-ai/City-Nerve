import React from "react";

const NAV_ITEMS = [
  { id: "overview", label: "Overview" },
  { id: "risk", label: "Predictive Risk" },
  { id: "explain", label: "Explainable AI" },
  { id: "simulate", label: "What-If Simulator" },
  { id: "infrastructure", label: "Infrastructure Intel" },
  { id: "emergency", label: "Emergency Response" },
  { id: "actions", label: "Preventive Actions" },
  { id: "reports", label: "Citizen Reports" },
  { id: "history", label: "Analysis History" },
  { id: "status", label: "System Status" }
];

export default function Sidebar({ activeTab, onSelect }) {
  return (
    <nav className="app-sidebar">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${activeTab === item.id ? "active" : ""}`}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
