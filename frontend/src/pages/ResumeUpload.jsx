import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { getLatestResume } from "../api/career";
import {
  UploadCloud, FileText, CheckCircle2, ShieldAlert,
  Award, FolderGit, RefreshCw, ExternalLink, Loader2,
  CalendarClock, Code, Cpu, Star, AlertTriangle, XCircle,
  ChevronDown, ChevronUp, Zap, TrendingUp, ShieldCheck
} from "lucide-react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/+$/, "");

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    year: "numeric", month: "short", day: "numeric"
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Score Ring SVG component
// ─────────────────────────────────────────────────────────────────────────────

function ScoreRing({ score, label, size = 110 }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const color = progress >= 75 ? "#10b981"
    : progress >= 50 ? "#f59e0b"
    : "#ef4444";

  const grade = progress >= 75 ? "Good" : progress >= 50 ? "Fair" : "Poor";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease", filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
        {/* Score text — counter-rotate to stay upright */}
        <text
          x="50%" y="44%" textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize="18" fontWeight="700" fontFamily="Space Grotesk, sans-serif"
          style={{ transform: `rotate(90deg)`, transformOrigin: "50% 50%", transformBox: "fill-box" }}
        >
          {score}
        </text>
        <text
          x="50%" y="64%" textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize="9" fontWeight="600" fontFamily="Space Grotesk, sans-serif"
          style={{ transform: `rotate(90deg)`, transformOrigin: "50% 50%", transformBox: "fill-box" }}
        >
          {grade}
        </text>
      </svg>
      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", textAlign: "center" }}>
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status icon helper
// ─────────────────────────────────────────────────────────────────────────────

function StatusIcon({ status }) {
  if (status === "pass") return <CheckCircle2 size={15} style={{ color: "#10b981", flexShrink: 0 }} />;
  if (status === "warn") return <AlertTriangle size={15} style={{ color: "#f59e0b", flexShrink: 0 }} />;
  return <XCircle size={15} style={{ color: "#ef4444", flexShrink: 0 }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// ATS Result Card
// ─────────────────────────────────────────────────────────────────────────────

function ATSResultCard({ result }) {
  const [showATS, setShowATS] = useState(true);
  const [showQuality, setShowQuality] = useState(true);

  return (
    <div className="card" style={{ marginTop: "24px", padding: "32px", border: "1px solid rgba(139,92,246,0.25)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
        <div style={{
          width: "42px", height: "42px", borderRadius: "10px",
          background: "#8b5cf6",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, boxShadow: "var(--shadow-primary)",
        }}>
          <Cpu size={20} style={{ color: "white" }} />
        </div>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "white" }}>Resume Analysis</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.83rem", marginTop: "2px" }}>
            AI-powered ATS compatibility + quality scoring
          </p>
        </div>
      </div>

      {/* Dual score rings */}
      <div style={{
        display: "flex", justifyContent: "center", gap: "60px",
        background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)",
        borderRadius: "12px", padding: "28px", marginBottom: "28px",
      }}>
        <ScoreRing score={result.ats_score} label="ATS Compatibility" />
        <div style={{ width: "1px", background: "var(--border-color)" }} />
        <ScoreRing score={result.quality_score} label="Resume Quality" />
      </div>

      {/* ATS Breakdown */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => setShowATS(v => !v)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", background: "transparent", border: "none",
            cursor: "pointer", padding: "0", marginBottom: showATS ? "12px" : "0",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "7px", color: "#06b6d4", fontWeight: 700, fontSize: "0.88rem", fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <Zap size={13} />
            ATS Compatibility Breakdown
          </span>
          {showATS ? <ChevronUp size={15} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={15} style={{ color: "var(--text-muted)" }} />}
        </button>
        {showATS && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {result.ats_breakdown.map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: "10px",
                background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)",
                borderRadius: "8px", padding: "12px 14px",
              }}>
                <StatusIcon status={item.status} />
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "white", display: "block" }}>
                    {item.category}
                  </span>
                  <span style={{ fontSize: "0.79rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                    {item.tip}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quality Breakdown */}
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={() => setShowQuality(v => !v)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", background: "transparent", border: "none",
            cursor: "pointer", padding: "0", marginBottom: showQuality ? "12px" : "0",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "7px", color: "#a78bfa", fontWeight: 700, fontSize: "0.88rem", fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            <TrendingUp size={13} />
            Resume Quality Breakdown
          </span>
          {showQuality ? <ChevronUp size={15} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={15} style={{ color: "var(--text-muted)" }} />}
        </button>
        {showQuality && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {result.quality_breakdown.map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: "10px",
                background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)",
                borderRadius: "8px", padding: "12px 14px",
              }}>
                <StatusIcon status={item.status} />
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "white", display: "block" }}>
                    {item.category}
                  </span>
                  <span style={{ fontSize: "0.79rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                    {item.tip}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top 3 Fixes */}
      {result.top_fixes?.length > 0 && (
        <div style={{
          background: "rgba(245,158,11,0.07)",
          border: "1px solid rgba(245,158,11,0.22)",
          borderRadius: "10px", padding: "18px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "12px" }}>
            <Star size={14} style={{ color: "#f59e0b" }} />
            <span style={{ fontSize: "0.83rem", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "'Space Grotesk', sans-serif" }}>
              Top 3 Fixes to Boost Your Score
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {result.top_fixes.map((fix, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{
                  width: "20px", height: "20px", borderRadius: "50%",
                  background: "rgba(245,158,11,0.18)", color: "#f59e0b",
                  fontSize: "0.72rem", fontWeight: 700, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>{i + 1}</span>
                <span style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                  {fix}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ResumeUpload page
// ─────────────────────────────────────────────────────────────────────────────

export default function ResumeUpload() {
  const [existing, setExisting] = useState(null);
  const [checkLoading, setCheckLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  // ATS scan state
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsResult, setAtsResult] = useState(null);
  const [atsError, setAtsError] = useState(null);

  useEffect(() => {
    async function checkExisting() {
      try {
        const data = await getLatestResume();
        setExisting(data);
        setShowUploader(!data);
      } catch {
        setShowUploader(true);
      } finally {
        setCheckLoading(false);
      }
    }
    checkExisting();
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setProfile(null);
    setAtsResult(null);
    setAtsError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("You must be signed in to upload a resume.");

      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch(`${API_BASE_URL}/resume/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const body = await uploadResponse.json().catch(() => ({}));
        throw new Error(body.detail || `Upload failed with status ${uploadResponse.status}`);
      }

      const uploadData = await uploadResponse.json();

      const profileResponse = await fetch(
        `${API_BASE_URL}/resume/profile/${uploadData.profile_id}`,
        { method: "GET", headers: { Authorization: `Bearer ${session.access_token}` } }
      );

      if (!profileResponse.ok) {
        const body = await profileResponse.json().catch(() => ({}));
        throw new Error(body.detail || `Fetching profile failed: ${profileResponse.status}`);
      }

      const profileData = await profileResponse.json();
      setProfile(profileData);

      // Refresh "on file" banner
      const fresh = await getLatestResume();
      setExisting(fresh);
      setShowUploader(false);

      // Kick off ATS scan automatically
      runAtsScan(uploadData.profile_id, session.access_token);

    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const runAtsScan = async (profileId, token) => {
    setAtsLoading(true);
    setAtsError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = token || session?.access_token;
      if (!accessToken) throw new Error("Not authenticated.");

      const res = await fetch(`${API_BASE_URL}/resume/ats-scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ profile_id: profileId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "ATS scan failed.");
      }

      const data = await res.json();
      setAtsResult(data);
    } catch (err) {
      setAtsError(err.message || "ATS analysis failed.");
    } finally {
      setAtsLoading(false);
    }
  };

  // Allow re-scanning existing resume
  const handleRescanExisting = async () => {
    if (!existing?.profile_id) return;
    setAtsResult(null);
    await runAtsScan(existing.profile_id);
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "2.3rem", color: "#ffffff", fontWeight: 800 }}>
          AI Resume Extractor
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Upload your resume in PDF format. Extract contact details, summary, experience, skills, and projects — then run a deep ATS audit.
        </p>
      </div>

      {/* On-file banner */}
      {checkLoading ? (
        <div className="card" style={{ padding: "30px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <Loader2 size={20} style={{ color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
          <span style={{ color: "var(--text-secondary)" }}>Checking for existing resume...</span>
        </div>
      ) : existing ? (
        <div className="card secondary-glow" style={{ padding: "24px", marginBottom: "24px", borderLeft: "3px solid #10b981" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <div style={{
                width: "46px", height: "46px", borderRadius: "10px",
                background: "#10b981",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
              }}>
                <FileText size={22} color="white" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                  <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Resume on File
                  </span>
                </div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "white", marginBottom: "4px" }}>
                  {existing.file_name}
                </h3>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <CalendarClock size={12} /> {formatDate(existing.uploaded_at)}
                  </span>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Code size={12} /> {existing.skill_count} skills extracted
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", flexShrink: 0, flexWrap: "wrap" }}>
              {existing.file_url && (
                <a
                  href={existing.file_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "8px 14px", borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-secondary)", fontSize: "0.82rem", textDecoration: "none",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#22d3ee"; e.currentTarget.style.color = "#22d3ee"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                >
                  <ExternalLink size={12} /> View PDF
                </a>
              )}
              <Link
                to="/ats-scanner"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "8px 14px", borderRadius: "8px",
                  background: "rgba(139, 92, 246, 0.15)",
                  border: "1px solid rgba(139, 92, 246, 0.4)",
                  color: "#8b5cf6", fontSize: "0.82rem", textDecoration: "none",
                  fontWeight: 600, transition: "all 0.2s"
                }}
              >
                <ShieldCheck size={14} /> Full ATS Scanner
              </Link>
              <button
                className="outline"
                onClick={() => setShowUploader(v => !v)}
                style={{ padding: "8px 14px", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <RefreshCw size={12} />
                {showUploader ? "Cancel" : "Upload New Version"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Upload panel */}
      {showUploader && (
        <div className="card primary-glow" style={{ padding: "40px", textAlign: "center" }}>
          <div
            style={{
              border: "2px dashed var(--border-color)", borderRadius: "8px",
              padding: "40px 20px", background: "#0f1016", cursor: "pointer",
              transition: "all 0.2s ease", marginBottom: "20px"
            }}
            onClick={() => document.getElementById("resume-input").click()}
            onMouseOver={e => e.currentTarget.style.borderColor = "#8b5cf6"}
            onMouseOut={e => e.currentTarget.style.borderColor = "var(--border-color)"}
          >
            <input
              id="resume-input"
              type="file"
              accept="application/pdf"
              onChange={e => setFile(e.target.files[0])}
              style={{ display: "none" }}
            />
            <UploadCloud size={48} style={{ color: "var(--text-secondary)", marginBottom: "16px" }} />
            {file ? (
              <div>
                <p style={{ fontSize: "1.1rem", color: "white", fontWeight: "600", marginBottom: "4px" }}>{file.name}</p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{(file.size / 1024 / 1024).toFixed(2)} MB · Ready to upload</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "1.1rem", color: "white", fontWeight: "600", marginBottom: "4px" }}>Click to browse resume</p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Supports PDF files (Max 5MB)</p>
              </div>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="primary"
            style={{ padding: "12px 30px", width: "100%", maxWidth: "260px" }}
          >
            {loading ? (
              <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /><span>Parsing &amp; Structuring...</span></>
            ) : (
              <><span>Upload &amp; Extract</span><span className="arrow-icon">→</span></>
            )}
          </button>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", padding: "12px 16px", borderRadius: "8px", marginTop: "20px", textAlign: "left" }}>
              <ShieldAlert size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Extracted results */}
      {profile && (
        <div className="card secondary-glow" style={{ marginTop: "30px", padding: "30px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#10b981", marginBottom: "20px" }}>
            <CheckCircle2 size={24} />
            <h2 style={{ fontSize: "1.5rem", color: "white" }}>Successfully Extracted Profile!</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: "700" }}>{profile.full_name}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                {profile.email} {profile.phone ? `· ${profile.phone}` : ""}
              </p>
            </div>
            <hr style={{ borderColor: "var(--border-color)" }} />
            <div>
              <h4 style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "8px" }}>Professional Summary</h4>
              <p style={{ color: "var(--text-secondary)", lineHeight: "1.6" }}>{profile.summary}</p>
            </div>
            <hr style={{ borderColor: "var(--border-color)" }} />
            <div>
              <h4 style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Award size={18} style={{ color: "#a78bfa" }} /><span>Extracted Skills</span>
              </h4>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {profile.skills?.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No skills parsed.</p>
                ) : (
                  profile.skills.map(s => (
                    <span key={s.id} className="badge">{s.skill_name} ({s.category || "General"})</span>
                  ))
                )}
              </div>
            </div>
            <hr style={{ borderColor: "var(--border-color)" }} />
            <div>
              <h4 style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <FolderGit size={18} style={{ color: "#22d3ee" }} /><span>Extracted Projects</span>
              </h4>
              {profile.projects?.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No projects parsed.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {profile.projects.map(p => (
                    <div key={p.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", padding: "14px", borderRadius: "8px" }}>
                      <strong style={{ display: "block", color: "white", fontSize: "1rem", marginBottom: "4px" }}>{p.title}</strong>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{p.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ATS Scan loading */}
      {atsLoading && (
        <div className="card" style={{ marginTop: "24px", padding: "30px", display: "flex", alignItems: "center", gap: "14px" }}>
          <Loader2 size={22} style={{ color: "#8b5cf6", animation: "spin 1s linear infinite", flexShrink: 0 }} />
          <div>
            <p style={{ color: "white", fontWeight: 600 }}>Scanning resume with AI...</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.83rem", marginTop: "2px" }}>
              Gemini is evaluating ATS compatibility and overall quality. This takes ~10 seconds.
            </p>
          </div>
        </div>
      )}

      {/* ATS error */}
      {atsError && !atsLoading && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", padding: "14px 16px", borderRadius: "8px", marginTop: "20px" }}>
          <ShieldAlert size={18} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: "0.88rem" }}>ATS scan failed: {atsError}</span>
        </div>
      )}

      {/* ATS Result */}
      {atsResult && !atsLoading && <ATSResultCard result={atsResult} />}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}