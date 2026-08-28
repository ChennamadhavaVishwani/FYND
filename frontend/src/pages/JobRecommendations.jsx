import { useState, useEffect } from "react";
import { Briefcase, ArrowUpRight, Sparkles, AlertCircle, Check, HelpCircle, Target } from "lucide-react";
import { getProfile } from "../api/career";
import { matchAllJobs, matchJob } from "../api/match";
import { listApplications, createApplication } from "../api/applications";

export default function JobRecommendations() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [detailedMatch, setDetailedMatch] = useState({});
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [trackedJobIds, setTrackedJobIds] = useState(new Set());

  useEffect(() => {
    async function loadData() {
      try {
        const prof = await getProfile();
        setProfile(prof);
        
        // Fetch real ranked jobs from match/jobs
        const matchData = await matchAllJobs({ limit: 20 });
        setRecommendedJobs(matchData.matches || []);

        try {
          const trackedApps = await listApplications();
          const trackedIds = new Set(trackedApps.map(app => app.job_id));
          setTrackedJobIds(trackedIds);
        } catch (err) {
          console.error("Failed to load tracked apps", err);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleTrackJob(jobId) {
    try {
      await createApplication(jobId, "saved");
      setTrackedJobIds(prev => {
        const next = new Set(prev);
        next.add(jobId);
        return next;
      });
      alert("Job added to Application Tracker!");
    } catch (err) {
      alert(err.message || "Failed to track job.");
    }
  }

  async function handleToggleExpand(jobId) {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
      return;
    }

    setExpandedJobId(jobId);
    if (detailedMatch[jobId]) return;

    setDetailsLoading(true);
    try {
      const details = await matchJob(jobId);
      setDetailedMatch(prev => ({
        ...prev,
        [jobId]: details
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  }

  const userSkills = profile?.skills?.map(s => s.skill_name.toLowerCase()) || [];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "2.3rem", color: "#ffffff", fontWeight: 800, display: "flex", alignItems: "center", gap: "10px" }}>
          <Target size={30} style={{ color: "#3b82f6" }} />
          <span>Job Recommendations</span>
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Tailored roles matched dynamically against your verified skills, experience level, and project accomplishments.
        </p>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
          <p style={{ color: "var(--text-secondary)" }}>Analyzing your career profile...</p>
        </div>
      ) : (
        <div>
          {userSkills.length === 0 && (
            <div className="card accent-glow" style={{ marginBottom: "30px", padding: "20px" }}>
              <p style={{ color: "var(--text-primary)", fontWeight: "600", marginBottom: "8px" }}>
                Pro Tip: Add skills to your Career Profile!
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                AI Recommendations work best when you list your skills in the profile dashboard. Go to the profile page to add some.
              </p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {recommendedJobs.length === 0 ? (
              <div className="card" style={{ padding: "40px", textAlign: "center" }}>
                <p style={{ color: "var(--text-secondary)" }}>No jobs found in the catalog. Search for jobs on the Dashboard first to ingest listings!</p>
              </div>
            ) : (
              recommendedJobs.map((job) => {
                const requiredSkills = job.required_skills || [];
                return (
                  <div key={job.job_id} className="card secondary-glow" style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
                      <div style={{ flex: "1", minWidth: "280px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                          <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>{job.job_title}</h3>
                          <span className="badge" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#34d399", borderColor: "rgba(16, 185, 129, 0.2)", fontSize: "0.75rem" }}>
                            {job.match_score}% Match
                          </span>
                        </div>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "12px" }}>
                          {job.company} · <span style={{ color: "var(--text-muted)" }}>{job.location || "Remote"}</span>
                        </p>

                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {requiredSkills.slice(0, 5).map((skill, idx) => {
                            const isMatched = userSkills.includes(skill.toLowerCase());
                            return (
                              <span 
                                key={idx} 
                                className="badge" 
                                style={{ 
                                  background: isMatched ? "rgba(16, 185, 129, 0.1)" : "rgba(255, 255, 255, 0.03)", 
                                  color: isMatched ? "#34d399" : "var(--text-secondary)",
                                  borderColor: isMatched ? "rgba(16, 185, 129, 0.2)" : "var(--border-color)",
                                  fontSize: "0.75rem"
                                }}
                              >
                                {isMatched && "✓ "}
                                {skill}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <button
                          className="outline"
                          onClick={() => handleTrackJob(job.job_id)}
                          disabled={trackedJobIds.has(job.job_id)}
                          style={{ 
                            padding: "10px 16px", 
                            fontSize: "0.85rem", 
                            borderColor: trackedJobIds.has(job.job_id) ? "transparent" : "var(--border-color)", 
                            color: trackedJobIds.has(job.job_id) ? "var(--text-muted)" : "white" 
                          }}
                        >
                          {trackedJobIds.has(job.job_id) ? "Tracked ✓" : "Track Job"}
                        </button>

                        <button 
                          className="outline" 
                          onClick={() => handleToggleExpand(job.job_id)}
                          style={{ padding: "10px 16px", fontSize: "0.85rem" }}
                        >
                          {expandedJobId === job.job_id ? "Hide Details" : "Match Details"}
                        </button>

                        {job.apply_url && (
                          <a 
                            href={job.apply_url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn primary"
                            style={{ textDecoration: "none", fontSize: "0.85rem", padding: "10px 20px" }}
                          >
                            <span>Apply Role</span>
                            <ArrowUpRight size={14} />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Match Details Section */}
                    {expandedJobId === job.job_id && (
                      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginTop: "4px" }}>
                        {detailsLoading && !detailedMatch[job.job_id] ? (
                          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", fontFamily: "monospace" }}>Loading AI match analysis...</p>
                        ) : detailedMatch[job.job_id] ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            <div>
                              <strong style={{ color: "white", fontSize: "0.95rem", display: "block", marginBottom: "6px" }}>AI Match Verdict:</strong>
                              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.5" }}>
                                {detailedMatch[job.job_id].explanation}
                              </p>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
                              <div>
                                <strong style={{ color: "#34d399", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                                  <Check size={16} />
                                  <span>Candidate Strengths</span>
                                </strong>
                                {detailedMatch[job.job_id].strengths?.length === 0 ? (
                                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>None identified.</p>
                                ) : (
                                  <ul style={{ paddingLeft: "16px", margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                                    {detailedMatch[job.job_id].strengths?.map((s, i) => (
                                      <li key={i} style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{s}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>

                              <div>
                                <strong style={{ color: "#fbbf24", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                                  <AlertCircle size={16} />
                                  <span>Skill Gaps / Missing</span>
                                </strong>
                                {detailedMatch[job.job_id].missing_skills?.length === 0 ? (
                                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Perfect match! No key missing skills.</p>
                                ) : (
                                  <ul style={{ paddingLeft: "16px", margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                                    {detailedMatch[job.job_id].missing_skills?.map((s, i) => (
                                      <li key={i} style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{s}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                            
                            {/* Score Breakdown Bars */}
                            <div style={{ background: "#0f1016", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                              <strong style={{ color: "white", fontSize: "0.85rem", display: "block", marginBottom: "12px" }}>Score Breakdown:</strong>
                              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <div>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                                    <span>Required Skill Overlap (50% weight)</span>
                                    <span>{detailedMatch[job.job_id].skill_score}%</span>
                                  </div>
                                  <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
                                    <div style={{ width: `${detailedMatch[job.job_id].skill_score}%`, height: "100%", background: "var(--grad-primary)", borderRadius: "2px" }} />
                                  </div>
                                </div>
                                <div>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                                    <span>Semantic Profile Match (30% weight)</span>
                                    <span>{detailedMatch[job.job_id].semantic_score}%</span>
                                  </div>
                                  <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
                                    <div style={{ width: `${detailedMatch[job.job_id].semantic_score}%`, height: "100%", background: "#06b6d4", borderRadius: "2px" }} />
                                  </div>
                                </div>
                                <div>
                                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                                    <span>Experience Years Match (20% weight)</span>
                                    <span>{detailedMatch[job.job_id].experience_score}%</span>
                                  </div>
                                  <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px" }}>
                                    <div style={{ width: `${detailedMatch[job.job_id].experience_score}%`, height: "100%", background: "#a78bfa", borderRadius: "2px" }} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p style={{ color: "#f87171", fontSize: "0.9rem" }}>Failed to load match analysis.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}