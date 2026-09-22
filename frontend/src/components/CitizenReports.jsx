import React, { useEffect, useState } from "react";
import { postCitizenReport, getCitizenReports } from "../services/api.js";

const CATEGORIES = [
  "Pothole",
  "Flooding",
  "Road Obstruction",
  "Infrastructure Damage",
  "Drainage Problem",
  "Traffic Incident",
  "Other"
];

const SEVERITIES = ["Low", "Medium", "High"];

export default function CitizenReports({ selectedLocation }) {
  const [form, setForm] = useState({
    report_type: "Pothole",
    description: "",
    severity: "Medium",
    image_url: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [reports, setReports] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoadingList(true);
    try {
      const data = await getCitizenReports(50);
      setReports(Array.isArray(data) ? data : []);
    } catch {
      setReports([]);
    } finally {
      setLoadingList(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedLocation) {
      setFeedback({ ok: false, message: "Select a location on the map first." });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await postCitizenReport({
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        report_type: form.report_type,
        description: form.description,
        severity: form.severity,
        image_url: form.image_url || null
      });
      setFeedback({
        ok: res.saved,
        message: res.saved
          ? "Report submitted and saved."
          : "Report received, but the database is currently unavailable so it was not persisted."
      });
      setForm({ ...form, description: "", image_url: "" });
      loadReports();
    } catch (err) {
      setFeedback({ ok: false, message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-2">
      <div className="card">
        <div className="card-title">Report an Urban Issue</div>

        {!selectedLocation && (
          <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 10 }}>
            Select a location on the map to attach coordinates to your report.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 10 }}>
            <div className="metric-label" style={{ marginBottom: 4 }}>Category</div>
            <select
              value={form.report_type}
              onChange={(e) => setForm({ ...form, report_type: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div className="metric-label" style={{ marginBottom: 4 }}>Severity</div>
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div className="metric-label" style={{ marginBottom: 4 }}>Description</div>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe what you observed…"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div className="metric-label" style={{ marginBottom: 4 }}>Image URL (optional)</div>
            <input
              type="text"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://…"
            />
          </div>

          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Report"}
          </button>
        </form>

        {feedback && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: feedback.ok ? "var(--risk-low)" : "var(--risk-moderate)"
            }}
          >
            {feedback.message}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Recent Reports</div>
        {loadingList && <div className="empty-state">Loading…</div>}
        {!loadingList && reports.length === 0 && (
          <div className="empty-state">No citizen reports yet.</div>
        )}
        {reports.map((r, i) => (
          <div key={r.id ?? i} className="list-item">
            <div className="flex-between">
              <strong style={{ fontSize: 13 }}>{r.report_type}</strong>
              <span className="tag">{r.severity}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-1)", marginTop: 2 }}>
              {r.description}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>
              {r.latitude?.toFixed?.(4)}, {r.longitude?.toFixed?.(4)} · {r.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
