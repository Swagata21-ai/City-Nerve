import React, { useState } from "react";

const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };

export default function ActionEngine({ recommendations = [] }) {
  const [approved, setApproved] = useState({});

  const sorted = [...recommendations].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3)
  );

  return (
    <div className="card">
      <div className="card-title">Preventive Action Engine</div>

      {sorted.length === 0 && (
        <div className="empty-state">No preventive actions generated.</div>
      )}

      {sorted.map((rec, i) => (
        <div key={i} className="list-item">
          <div className="flex-between">
            <strong style={{ fontSize: 13 }}>{rec.action}</strong>
            <span className="tag">{rec.priority}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-1)", margin: "4px 0" }}>
            {rec.reason}
          </div>
          <label style={{ fontSize: 11, color: "var(--text-2)", display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={!!approved[i]}
              onChange={(e) =>
                setApproved((prev) => ({ ...prev, [i]: e.target.checked }))
              }
            />
            Mark as reviewed by an authorized human operator
          </label>
        </div>
      ))}

      {sorted.length > 0 && (
        <div className="disclaimer">{sorted[0].disclaimer}</div>
      )}
    </div>
  );
}
