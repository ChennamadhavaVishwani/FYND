import { useState } from "react";
import { ArrowRight, Compass, Target, ExternalLink } from "lucide-react";
import { matchJob } from "../api/match";
import { getSkillGapForJob } from "../api/skillGap";
import { createApplication } from "../api/applications";

export default function JobCard({ job }) {
  const [match, setMatch] = useState(null);
  const [gap, setGap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState(null); // "match" | "gap" | null
  const [tracked, setTracked] = useState(false);

  async function handleTrack() {
    setLoading(true);
    setError(null);
    try {
      await createApplication(job.id, "saved");
      setTracked(true);
      alert("Job added to Application Tracker!");
    } catch (err) {
      setError(err.message || "Failed to track job.");
    } finally {
      setLoading(false);
    }
  }

  async function handleShowMatch() {
    setError(null);
    if (match) {
      setView(view === "match" ? null : "match");
      return;
    }
    setLoading(true);
    try {
      const result = await matchJob(job.id);
      setMatch(result);
      setView("match");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleShowGap() {
    setError(null);
    if (gap) {
      setView(view === "gap" ? null : "gap");
      return;
    }
    setLoading(true);
    try {
      const result = await getSkillGapForJob(job.id);
      setGap(result);
      setView("gap");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="card primary-glow" style={{ listStyle: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h3 style={{ fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "4px" }}>
            {job.title}
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            {job.company} <span style={{ color: "var(--text-muted)" }}>• {job.location}</span>
            {job.remote && (
              <span className="badge" style={{ marginLeft: "8px", background: "rgba(6, 182, 212, 0.1)", color: "#22d3ee", borderColor: "rgba(6, 182, 212, 0.2)" }}>
                Remote
              </span>
            )}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={handleTrack}
            disabled={loading || tracked}
            className="btn btn-outline"
            style={{ fontSize: "0.85rem", padding: "8px 14px", color: tracked ? "var(--text-muted)" : "white", borderColor: tracked ? "transparent" : "var(--border-color)" }}
          >
            <span>{tracked ? "Tracked ✓" : "Track"}</span>
          </button>

          {job.apply_url && (
            <a 
              href={job.apply_url} 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-outline"
              style={{ textDecoration: "none", fontSize: "0.85rem", padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <span>Apply</span>
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button 
          onClick={handleShowMatch} 
          disabled={loading}
          className={view === "match" ? "primary" : "outline"}
          style={{ padding: "8px 16px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Target size={14} className="icon-shadow" />
          <span>{match ? `Match: ${match.match_score}%` : "Check Match"}</span>
          <span className="arrow-icon">→</span>
        </button>

        <button 
          onClick={handleShowGap} 
          disabled={loading}
          className={view === "gap" ? "secondary" : "outline"}
          style={{ padding: "8px 16px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <Compass size={14} className="icon-shadow" />
          <span>{gap ? `Skill Gap (${gap.coverage_percent}% covered)` : "Find Skill Gap"}</span>
          <span className="arrow-icon">→</span>
        </button>
      </div>

      {error && (
        <p style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: "12px", background: "rgba(239, 68, 68, 0.1)", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
          {error}
        </p>
      )}

      {view === "match" && match && (
        <div className="details-box" style={{ borderLeftColor: "#3b82f6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#3b82f6", fontFamily: "'Space Grotesk', sans-serif" }}>
              {match.match_score}% Match Score
            </span>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "12px" }}>
            {match.explanation}
          </p>
          {match.strengths?.length > 0 && (
            <div>
              <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Your Strengths:</strong>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                {match.strengths.map((str, idx) => (
                  <span key={idx} className="badge" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#34d399", borderColor: "rgba(16, 185, 129, 0.2)" }}>
                    {str}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {view === "gap" && gap && (
        <div className="details-box" style={{ borderLeftColor: "#0ea5e9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0ea5e9", fontFamily: "'Space Grotesk', sans-serif" }}>
              {gap.coverage_percent}% Skill Coverage
            </span>
          </div>
          
          {gap.matched_skills?.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Skills Met:</strong>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
                {gap.matched_skills.map((skill, idx) => (
                  <span key={idx} className="badge" style={{ background: "rgba(6, 182, 212, 0.1)", color: "#22d3ee", borderColor: "rgba(6, 182, 212, 0.2)" }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {gap.missing_skills?.length === 0 ? (
            <p style={{ color: "#34d399", fontSize: "0.95rem", fontWeight: "500" }}>
              ✓ No skill gaps — you meet all requirements for this role!
            </p>
          ) : (
            <div>
              <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Missing Skills & Recommended Prep:</strong>
              <table>
                <thead>
                  <tr>
                    <th>Missing Skill</th>
                    <th>Priority</th>
                    <th>Recommended Prep</th>
                  </tr>
                </thead>
                <tbody>
                  {gap.missing_skills.map((s) => (
                    <tr key={s.skill}>
                      <td style={{ fontWeight: "600", color: "#f87171" }}>{s.skill}</td>
                      <td>
                        <span className="badge" style={{ 
                          background: s.priority === "High" ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)", 
                          color: s.priority === "High" ? "#f87171" : "#fbbf24",
                          borderColor: s.priority === "High" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)"
                        }}>
                          {s.priority}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{s.recommended_prep}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </li>
  );
}