import { useState, useEffect } from "react";
import { Compass, ShieldAlert, Award, PlayCircle, BookOpen, AlertTriangle } from "lucide-react";
import { getSkillGapOverview } from "../api/skillGap";

export default function SkillGap() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadGapData() {
      try {
        const data = await getSkillGapOverview();
        setOverview(data);
      } catch (err) {
        setError(err.message || "Failed to load skill gap analytics.");
      } finally {
        setLoading(false);
      }
    }
    loadGapData();
  }, []);

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "2.5rem", background: "var(--grad-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "flex", alignItems: "center", gap: "10px" }}>
          <Compass size={32} style={{ color: "#8b5cf6" }} />
          <span>Skill Gap & Roadmaps</span>
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Analysis of missing capabilities aggregated across local job market demands, matched with recommended action roadmaps.
        </p>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "16px", borderRadius: "8px", marginBottom: "30px" }}>
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
          <p style={{ color: "var(--text-secondary)" }}>Analyzing catalog discrepancies...</p>
        </div>
      ) : (
        <div>
          {overview && (
            <div className="card primary-glow" style={{ padding: "30px", marginBottom: "30px" }}>
              <h2 style={{ fontSize: "1.3rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Award size={20} style={{ color: "#a78bfa" }} />
                <span>Market Intake Summary</span>
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: "1.6" }}>
                We scanned your stored portfolio against the requirements of <strong style={{ color: "white" }}>{overview.jobs_analyzed} stored jobs</strong>. The system has identified key capabilities currently sought by employers that are not yet verified in your career details.
              </p>
            </div>
          )}

          <h2 style={{ fontSize: "1.5rem", marginBottom: "20px" }}>Priority Roadmap Items</h2>

          {!overview || overview.missing_skills?.length === 0 ? (
            <div className="card" style={{ padding: "40px", textAlignment: "center" }}>
              <p style={{ color: "var(--text-secondary)" }}>No recurring skill gaps found. Check that you have job search items and a parsed resume in the database.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
              {overview.missing_skills.map((s, idx) => (
                <div key={idx} className="card secondary-glow" style={{ borderLeft: s.priority === "High" ? "4px solid #ef4444" : "4px solid #f59e0b" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
                    <div>
                      <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>{s.skill}</h3>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        Appears in {s.appears_in_jobs} jobs in your discovery area
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <span className="badge" style={{ 
                        background: s.priority === "High" ? "rgba(239, 68, 68, 0.1)" : "rgba(245, 158, 11, 0.1)", 
                        color: s.priority === "High" ? "#f87171" : "#fbbf24",
                        borderColor: s.priority === "High" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)"
                      }}>
                        {s.priority} Priority
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", background: "#0f1016", padding: "16px", borderRadius: "8px" }}>
                    <BookOpen size={18} style={{ color: "#a78bfa", marginTop: "2px", flexShrink: 0 }} />
                    <div>
                      <strong style={{ fontSize: "0.9rem", color: "white", display: "block", marginBottom: "4px" }}>Recommended Action Plan:</strong>
                      <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>{s.recommended_prep}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}