import { useState, useEffect } from "react";
import {
  Cpu, FileText, CheckCircle2, AlertTriangle, XCircle,
  Zap, TrendingUp, ShieldCheck, Target, Sparkles,
  ArrowRight, Copy, Check, RefreshCw, UploadCloud,
  Layers, BarChart2, Award, ListChecks, HelpCircle,
  ExternalLink, ChevronDown, ChevronUp, Loader2, Sparkle
} from "lucide-react";

import { getLatestResume } from "../api/career";
import { runAtsScan, runAtsJdMatch, optimizeBullet } from "../api/ats";
import { searchJobs } from "../api/jobs";

// ─────────────────────────────────────────────────────────────────────────────
// Score Circular Gauge Component
// ─────────────────────────────────────────────────────────────────────────────

function ScoreGauge({ score, label, subtext, size = 130, strokeWidth = 9 }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score || 0));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const color = progress >= 80 ? "#10b981"
    : progress >= 65 ? "#06b6d4"
    : progress >= 50 ? "#f59e0b"
    : "#ef4444";

  const glowColor = progress >= 80 ? "rgba(16, 185, 129, 0.4)"
    : progress >= 65 ? "rgba(6, 182, 212, 0.4)"
    : progress >= 50 ? "rgba(245, 158, 11, 0.4)"
    : "rgba(239, 68, 68, 0.4)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s ease",
              filter: `drop-shadow(0 0 8px ${glowColor})`
            }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
        }}>
          <span style={{ fontSize: "1.75rem", fontWeight: 800, color: "white", fontFamily: "'Space Grotesk', sans-serif" }}>
            {score ?? "--"}
          </span>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {progress >= 80 ? "Excellent" : progress >= 65 ? "Good" : progress >= 50 ? "Fair" : "Needs Work"}
          </span>
        </div>
      </div>
      <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "white", textAlign: "center" }}>
        {label}
      </span>
      {subtext && (
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "-4px" }}>
          {subtext}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status Icon Helper
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  if (status === "pass") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: "4px",
        background: "rgba(16,185,129,0.12)", color: "#10b981",
        border: "1px solid rgba(16,185,129,0.25)",
        padding: "3px 8px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600
      }}>
        <CheckCircle2 size={12} /> Pass
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: "4px",
        background: "rgba(245,158,11,0.12)", color: "#f59e0b",
        border: "1px solid rgba(245,158,11,0.25)",
        padding: "3px 8px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600
      }}>
        <AlertTriangle size={12} /> Needs Polish
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      background: "rgba(239,68,68,0.12)", color: "#ef4444",
      border: "1px solid rgba(239,68,68,0.25)",
      padding: "3px 8px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600
    }}>
      <XCircle size={12} /> Fix Required
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ATS Scanner Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AtsScanner() {
  const [activeTab, setActiveTab] = useState("audit"); // "audit" | "jd_match" | "bullet_optimizer"

  // Resume state
  const [resumeData, setResumeData] = useState(null);
  const [loadingResume, setLoadingResume] = useState(true);
  const [customText, setCustomText] = useState("");
  const [useCustomText, setUseCustomText] = useState(false);

  // Tab 1: Audit state
  const [scanning, setScanning] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [auditError, setAuditError] = useState(null);
  const [openSections, setOpenSections] = useState({ 0: true, 1: true });

  // Tab 2: JD Match state
  const [jdTitle, setJdTitle] = useState("");
  const [jdDescription, setJdDescription] = useState("");
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [matchingJd, setMatchingJd] = useState(false);
  const [jdResult, setJdResult] = useState(null);
  const [jdError, setJdError] = useState(null);

  // Tab 3: Bullet Optimizer state
  const [bulletInput, setBulletInput] = useState("");
  const [bulletRole, setBulletRole] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [bulletResult, setBulletResult] = useState(null);
  const [bulletError, setBulletError] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Fetch initial resume & run audit if available
  useEffect(() => {
    async function init() {
      try {
        const resume = await getLatestResume();
        setResumeData(resume);
        if (resume?.profile_id) {
          triggerAudit(resume.profile_id);
        }
      } catch (err) {
        console.error("Could not fetch latest resume:", err);
      } finally {
        setLoadingResume(false);
      }
    }
    init();
  }, []);

  // Fetch recommended jobs for selector in Tab 2
  useEffect(() => {
    async function fetchJobs() {
      setLoadingJobs(true);
      try {
        const res = await searchJobs({ limit: 6 });
        if (res?.jobs) setRecommendedJobs(res.jobs);
      } catch (err) {
        console.error("Could not fetch jobs for JD match selector:", err);
      } finally {
        setLoadingJobs(false);
      }
    }
    fetchJobs();
  }, []);

  // Run full ATS & Quality Audit
  const triggerAudit = async (profileId = null, text = null) => {
    setScanning(true);
    setAuditError(null);
    try {
      const payload = {};
      if (text) {
        payload.resume_text = text;
      } else if (profileId) {
        payload.profile_id = profileId;
      } else if (resumeData?.profile_id) {
        payload.profile_id = resumeData.profile_id;
      }
      const data = await runAtsScan(payload);
      setAuditResult(data);
    } catch (err) {
      setAuditError(err.message || "Failed to complete ATS scan.");
    } finally {
      setScanning(false);
    }
  };

  // Run JD match scan
  const handleJdMatch = async () => {
    if (!jdTitle.trim() || !jdDescription.trim()) {
      setJdError("Please enter both Job Title and Job Description.");
      return;
    }
    setMatchingJd(true);
    setJdError(null);
    try {
      const payload = {
        job_title: jdTitle,
        job_description: jdDescription,
      };
      if (useCustomText && customText.trim()) {
        payload.resume_text = customText.trim();
      } else if (resumeData?.profile_id) {
        payload.profile_id = resumeData.profile_id;
      }
      const data = await runAtsJdMatch(payload);
      setJdResult(data);
    } catch (err) {
      setJdError(err.message || "Job description match failed.");
    } finally {
      setMatchingJd(false);
    }
  };

  // Run Bullet point optimizer
  const handleOptimizeBullet = async () => {
    if (!bulletInput.trim()) {
      setBulletError("Please enter a bullet point to optimize.");
      return;
    }
    setOptimizing(true);
    setBulletError(null);
    try {
      const data = await optimizeBullet({
        bullet_text: bulletInput,
        target_role: bulletRole,
      });
      setBulletResult(data);
    } catch (err) {
      setBulletError(err.message || "Failed to optimize bullet point.");
    } finally {
      setOptimizing(false);
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleSection = (index) => {
    setOpenSections(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div style={{ maxWidth: "1050px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{
            background: "rgba(59, 130, 246, 0.12)", color: "#60a5fa",
            border: "1px solid rgba(59, 130, 246, 0.25)",
            padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", gap: "6px"
          }}>
            <ShieldCheck size={13} /> Resume Audit &amp; Scoring Engine
          </span>
        </div>
        <h1 style={{ fontSize: "2.3rem", color: "#ffffff", fontWeight: 800, letterSpacing: "-0.02em" }}>
          ATS Scanner &amp; Resume Scorer
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: "720px", marginTop: "6px" }}>
          Evaluate your resume against enterprise ATS algorithms, uncover keyword gaps, calculate your employability score, and optimize bullet points for maximum recruiter impact.
        </p>
      </div>

      {/* Resume Source Indicator / Selector Card */}
      <div className="card" style={{ padding: "18px 24px", marginBottom: "24px", border: "1px solid var(--border-color)", background: "rgba(18, 20, 32, 0.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "10px",
              background: resumeData ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
              color: resumeData ? "#10b981" : "#f59e0b",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", color: resumeData ? "#10b981" : "#f59e0b" }}>
                  {resumeData ? "Active Resume On File" : "No Resume Uploaded"}
                </span>
              </div>
              <p style={{ fontSize: "0.92rem", fontWeight: 600, color: "white", marginTop: "2px" }}>
                {resumeData ? resumeData.file_name : "Upload a PDF or paste text to begin analysis"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {resumeData && (
              <button
                className="outline"
                onClick={() => {
                  setUseCustomText(false);
                  triggerAudit(resumeData.profile_id);
                }}
                disabled={scanning}
                style={{ padding: "8px 14px", fontSize: "0.82rem" }}
              >
                <RefreshCw size={13} className={scanning ? "animate-spin" : ""} />
                {scanning ? "Auditing..." : "Re-Scan Resume"}
              </button>
            )}
            <button
              className="outline"
              onClick={() => setUseCustomText(v => !v)}
              style={{
                padding: "8px 14px", fontSize: "0.82rem",
                borderColor: useCustomText ? "#8b5cf6" : "var(--border-color)",
                color: useCustomText ? "#8b5cf6" : "var(--text-secondary)"
              }}
            >
              {useCustomText ? "Using Custom Text" : "Paste Raw Text"}
            </button>
            <a
              href="/resume"
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "8px 14px", borderRadius: "8px",
                border: "1px solid var(--border-color)",
                color: "var(--text-secondary)", fontSize: "0.82rem", textDecoration: "none"
              }}
            >
              <UploadCloud size={13} /> Upload New PDF
            </a>
          </div>
        </div>

        {/* Custom Text Area toggle */}
        {useCustomText && (
          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
            <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginBottom: "8px" }}>
              Paste your raw resume text below to scan without uploading a file:
            </p>
            <textarea
              rows={5}
              placeholder="Paste your full resume text here..."
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              style={{ fontSize: "0.85rem", lineHeight: "1.5" }}
            />
            <button
              className="primary"
              onClick={() => triggerAudit(null, customText)}
              disabled={scanning || customText.length < 50}
              style={{ padding: "8px 18px", fontSize: "0.85rem" }}
            >
              {scanning ? <><Loader2 size={14} className="animate-spin" /> Analyzing Text...</> : "Scan Pasted Text"}
            </button>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div style={{
        display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)",
        marginBottom: "28px", paddingBottom: "4px"
      }}>
        <button
          onClick={() => setActiveTab("audit")}
          style={{
            background: activeTab === "audit" ? "rgba(59,130,246,0.15)" : "transparent",
            color: activeTab === "audit" ? "#ffffff" : "var(--text-secondary)",
            border: activeTab === "audit" ? "1px solid #3b82f6" : "1px solid transparent",
            borderRadius: "8px", padding: "10px 18px", fontSize: "0.88rem", fontWeight: 600,
            display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", transition: "all 0.2s"
          }}
        >
          <ShieldCheck size={16} style={{ color: activeTab === "audit" ? "#3b82f6" : "inherit" }} />
          <span>Resume Audit &amp; Score</span>
        </button>

        <button
          onClick={() => setActiveTab("jd_match")}
          style={{
            background: activeTab === "jd_match" ? "rgba(14,165,233,0.15)" : "transparent",
            color: activeTab === "jd_match" ? "#ffffff" : "var(--text-secondary)",
            border: activeTab === "jd_match" ? "1px solid #0ea5e9" : "1px solid transparent",
            borderRadius: "8px", padding: "10px 18px", fontSize: "0.88rem", fontWeight: 600,
            display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", transition: "all 0.2s"
          }}
        >
          <Target size={16} style={{ color: activeTab === "jd_match" ? "#0ea5e9" : "inherit" }} />
          <span>Target Job Match Scanner</span>
        </button>

        <button
          onClick={() => setActiveTab("bullet_optimizer")}
          style={{
            background: activeTab === "bullet_optimizer" ? "rgba(245,158,11,0.15)" : "transparent",
            color: activeTab === "bullet_optimizer" ? "#ffffff" : "var(--text-secondary)",
            border: activeTab === "bullet_optimizer" ? "1px solid #f59e0b" : "1px solid transparent",
            borderRadius: "8px", padding: "10px 18px", fontSize: "0.88rem", fontWeight: 600,
            display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", transition: "all 0.2s"
          }}
        >
          <Sparkles size={16} style={{ color: activeTab === "bullet_optimizer" ? "#f59e0b" : "inherit" }} />
          <span>AI Bullet Point Optimizer</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: RESUME AUDIT & ATS SCORE                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "audit" && (
        <div>
          {scanning ? (
            <div className="card" style={{ padding: "60px 30px", textAlign: "center" }}>
              <Loader2 size={36} style={{ color: "#3b82f6", animation: "spin 1s linear infinite", margin: "0 auto 16px auto" }} />
              <h3 style={{ fontSize: "1.2rem", color: "white", marginBottom: "6px" }}>
                Analyzing ATS Parseability &amp; Impact...
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                Evaluating structure, section headers, metrics density, and formatting safety.
              </p>
            </div>
          ) : auditError ? (
            <div className="card" style={{ borderLeft: "3px solid #ef4444", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#ef4444", marginBottom: "8px" }}>
                <XCircle size={20} />
                <h4 style={{ fontSize: "1rem" }}>Scan Error</h4>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>{auditError}</p>
              <button
                className="outline"
                onClick={() => triggerAudit(resumeData?.profile_id)}
                style={{ marginTop: "16px", padding: "8px 16px", fontSize: "0.82rem" }}
              >
                Try Again
              </button>
            </div>
          ) : auditResult ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Score Headline Card */}
              <div className="card primary-glow" style={{ padding: "32px", border: "1px solid rgba(59,130,246,0.25)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px", marginBottom: "28px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                      <span style={{
                        background: "#3b82f6", color: "white", padding: "4px 12px", borderRadius: "6px",
                        fontWeight: 800, fontSize: "0.95rem", fontFamily: "'Space Grotesk', sans-serif"
                      }}>
                        Grade: {auditResult.overall_grade || "B+"}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        Comprehensive Resume Score
                      </span>
                    </div>
                    <h2 style={{ fontSize: "1.4rem", color: "white", fontWeight: 700, lineHeight: "1.3" }}>
                      {auditResult.summary_headline}
                    </h2>
                  </div>
                </div>

                {/* Triple Score Gauges */}
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "24px", background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-color)", borderRadius: "12px", padding: "28px"
                }}>
                  <ScoreGauge
                    score={auditResult.ats_score}
                    label="ATS Compatibility"
                    subtext="Parsing & Structure"
                  />
                  <ScoreGauge
                    score={auditResult.quality_score}
                    label="Resume Quality"
                    subtext="Impact & Language"
                  />
                  <ScoreGauge
                    score={auditResult.formatting_score || 80}
                    label="Format Safety"
                    subtext="Standard Layout"
                  />
                </div>

                {/* Metric Quick Stats */}
                {auditResult.metrics && (
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "12px", marginTop: "20px"
                  }}>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px 16px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>Quantified Bullets</span>
                      <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#10b981", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {auditResult.metrics.quantified_bullets_pct}%
                      </span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px 16px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>Action Verbs</span>
                      <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#06b6d4", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {auditResult.metrics.action_verbs_count} strong
                      </span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px 16px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>Word Count</span>
                      <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f59e0b", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {auditResult.metrics.word_count} words
                      </span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px 16px" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>Est. Reading Time</span>
                      <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#a78bfa", fontFamily: "'Space Grotesk', sans-serif" }}>
                        {auditResult.metrics.reading_time || "45 sec"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Top Priority Fixes */}
              {auditResult.top_fixes?.length > 0 && (
                <div className="card" style={{
                  background: "rgba(245, 158, 11, 0.05)",
                  border: "1px solid rgba(245, 158, 11, 0.25)", padding: "24px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <Zap size={18} style={{ color: "#f59e0b" }} />
                    <h3 style={{ fontSize: "1.05rem", color: "#f59e0b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Top 3 Fixes to Boost Your Score
                    </h3>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {auditResult.top_fixes.map((fix, idx) => (
                      <div key={idx} style={{
                        display: "flex", alignItems: "flex-start", gap: "12px",
                        background: "rgba(0,0,0,0.2)", padding: "12px 16px", borderRadius: "8px"
                      }}>
                        <span style={{
                          width: "22px", height: "22px", borderRadius: "50%",
                          background: "#f59e0b", color: "#000", fontSize: "0.75rem", fontWeight: 800,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                        }}>
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: "0.88rem", color: "white", lineHeight: "1.5" }}>
                          {fix}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section-by-Section Health Audit */}
              {auditResult.sections_audit && (
                <div className="card" style={{ padding: "28px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                    <ListChecks size={20} style={{ color: "#06b6d4" }} />
                    <h3 style={{ fontSize: "1.15rem", color: "white", fontWeight: 700 }}>
                      Section-by-Section Health Audit
                    </h3>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {auditResult.sections_audit.map((sec, idx) => {
                      const isOpen = !!openSections[idx];
                      return (
                        <div key={idx} style={{
                          border: "1px solid var(--border-color)", borderRadius: "8px",
                          background: "rgba(255,255,255,0.02)", overflow: "hidden"
                        }}>
                          <button
                            onClick={() => toggleSection(idx)}
                            style={{
                              width: "100%", padding: "14px 18px", display: "flex",
                              alignItems: "center", justifyContent: "space-between",
                              background: "transparent", border: "none", cursor: "pointer", textAlign: "left"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "white" }}>
                                {sec.section}
                              </span>
                              <StatusBadge status={sec.status} />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <span style={{
                                fontSize: "0.85rem", fontWeight: 700,
                                color: sec.score >= 80 ? "#10b981" : sec.score >= 60 ? "#f59e0b" : "#ef4444"
                              }}>
                                {sec.score}/100
                              </span>
                              {isOpen ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                            </div>
                          </button>

                          {isOpen && (
                            <div style={{
                              padding: "14px 18px", borderTop: "1px solid var(--border-color)",
                              background: "rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", gap: "8px"
                            }}>
                              <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)" }}>
                                <strong style={{ color: "white" }}>Observation:</strong> {sec.feedback}
                              </p>
                              {sec.tip && (
                                <p style={{ fontSize: "0.84rem", color: "#06b6d4", background: "rgba(6,182,212,0.08)", padding: "8px 12px", borderRadius: "6px" }}>
                                  💡 <strong>Tip:</strong> {sec.tip}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Skills & Action Verbs Cloud */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
                {/* Technical Skills Detected */}
                <div className="card" style={{ padding: "24px", marginBottom: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <Award size={18} style={{ color: "#8b5cf6" }} />
                    <h4 style={{ fontSize: "0.95rem", color: "white", fontWeight: 700 }}>Hard &amp; Technical Skills Detected</h4>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {auditResult.hard_skills?.length > 0 ? (
                      auditResult.hard_skills.map((skill, i) => (
                        <span key={i} className="badge" style={{ background: "rgba(139,92,246,0.15)", borderColor: "rgba(139,92,246,0.3)" }}>
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>None identified.</span>
                    )}
                  </div>
                </div>

                {/* Soft Skills & Action Verbs */}
                <div className="card" style={{ padding: "24px", marginBottom: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                    <Sparkle size={18} style={{ color: "#06b6d4" }} />
                    <h4 style={{ fontSize: "0.95rem", color: "white", fontWeight: 700 }}>Action Verbs &amp; Leadership Traits</h4>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {auditResult.metrics?.action_verbs_list?.map((verb, i) => (
                      <span key={i} className="badge" style={{ background: "rgba(6,182,212,0.12)", borderColor: "rgba(6,182,212,0.3)", color: "#06b6d4" }}>
                        ⚡ {verb}
                      </span>
                    ))}
                    {auditResult.soft_skills?.map((trait, i) => (
                      <span key={`soft-${i}`} className="badge" style={{ background: "rgba(255,255,255,0.05)" }}>
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: "50px 30px", textAlign: "center" }}>
              <Cpu size={40} style={{ color: "var(--text-muted)", margin: "0 auto 16px auto" }} />
              <h3 style={{ fontSize: "1.15rem", color: "white", marginBottom: "6px" }}>No Resume Scanned Yet</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "20px" }}>
                Upload your resume or paste your text to get an instant ATS score and breakdown.
              </p>
              <button className="primary" onClick={() => triggerAudit()}>
                Run Initial Scan
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: TARGET JOB DESCRIPTION MATCH SCANNER                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "jd_match" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <Target size={22} style={{ color: "#06b6d4" }} />
              <div>
                <h3 style={{ fontSize: "1.2rem", color: "white", fontWeight: 700 }}>
                  Compare Resume with a Specific Job Posting
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.84rem" }}>
                  Find out how well your resume matches a target job's keywords and ATS requirements before you apply.
                </p>
              </div>
            </div>

            {/* Quick Pick from Recommended Jobs */}
            {recommendedJobs.length > 0 && (
              <div style={{ marginBottom: "18px" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                  Quick Fill from Recommended Jobs:
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {recommendedJobs.map(job => (
                    <button
                      key={job.id}
                      type="button"
                      className="outline"
                      onClick={() => {
                        setJdTitle(job.title || "");
                        setJdDescription(job.description || `${job.title} at ${job.company}. Requirements: ${job.requirements_summary || ""}`);
                      }}
                      style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                    >
                      {job.title} ({job.company})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "white", marginBottom: "6px" }}>
                  Target Job Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Frontend Engineer, Full Stack Developer"
                  value={jdTitle}
                  onChange={e => setJdTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "white", marginBottom: "6px" }}>
                  Job Description / Requirements
                </label>
                <textarea
                  rows={6}
                  placeholder="Paste the job description, required skills, and responsibilities here..."
                  value={jdDescription}
                  onChange={e => setJdDescription(e.target.value)}
                  style={{ lineHeight: "1.5" }}
                />
              </div>

              <button
                className="secondary"
                onClick={handleJdMatch}
                disabled={matchingJd || !jdTitle.trim() || !jdDescription.trim()}
                style={{ alignSelf: "flex-start", padding: "12px 24px" }}
              >
                {matchingJd ? (
                  <><Loader2 size={16} className="animate-spin" /> Calculating Match...</>
                ) : (
                  <><Target size={16} /> Scan Against This Job</>
                )}
              </button>
            </div>

            {jdError && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ef4444", marginTop: "14px", fontSize: "0.88rem" }}>
                <XCircle size={16} />
                <span>{jdError}</span>
              </div>
            )}
          </div>

          {/* JD Match Results */}
          {jdResult && (
            <div className="card secondary-glow" style={{ padding: "32px", border: "1px solid rgba(6,182,212,0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px", marginBottom: "28px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{
                      background: "#06b6d4", color: "#000", padding: "4px 10px", borderRadius: "6px",
                      fontWeight: 800, fontSize: "0.85rem", fontFamily: "'Space Grotesk', sans-serif"
                    }}>
                      {jdResult.match_level || "Fit Analysis"}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                      Target: {jdTitle}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "1.3rem", color: "white", fontWeight: 700 }}>
                    {jdResult.summary}
                  </h3>
                </div>

                <div style={{ display: "flex", gap: "24px" }}>
                  <ScoreGauge
                    score={jdResult.match_score}
                    label="JD Match Rate"
                    size={110}
                  />
                  <ScoreGauge
                    score={jdResult.keyword_match_rate}
                    label="Keyword Overlap"
                    size={110}
                  />
                </div>
              </div>

              {/* Matched vs Missing Keywords */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "24px" }}>
                {/* Matched Keywords */}
                <div style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "8px", padding: "18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                    <h4 style={{ fontSize: "0.92rem", color: "#10b981", fontWeight: 700 }}>
                      Matched Keywords ({jdResult.matched_keywords?.length || 0})
                    </h4>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {jdResult.matched_keywords?.map((kw, i) => (
                      <span key={i} className="badge" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", borderColor: "rgba(16,185,129,0.3)" }}>
                        ✓ {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Missing Critical Keywords */}
                <div style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <AlertTriangle size={16} style={{ color: "#ef4444" }} />
                    <h4 style={{ fontSize: "0.92rem", color: "#ef4444", fontWeight: 700 }}>
                      Missing Critical Keywords ({jdResult.missing_critical_keywords?.length || 0})
                    </h4>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {jdResult.missing_critical_keywords?.map((kw, i) => (
                      <span key={i} className="badge" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}>
                        + Add: {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tailoring Recommendations */}
              {jdResult.tailoring_recommendations?.length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <Sparkles size={16} style={{ color: "#06b6d4" }} />
                    <h4 style={{ fontSize: "0.95rem", color: "white", fontWeight: 700 }}>
                      How to Tailor Your Resume for This Posting
                    </h4>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {jdResult.tailoring_recommendations.map((rec, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                        <ArrowRight size={14} style={{ color: "#06b6d4", marginTop: "3px", flexShrink: 0 }} />
                        <span style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
                          {rec}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: AI BULLET POINT OPTIMIZER                                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "bullet_optimizer" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <Sparkles size={22} style={{ color: "#f59e0b" }} />
              <div>
                <h3 style={{ fontSize: "1.2rem", color: "white", fontWeight: 700 }}>
                  AI Bullet Point Optimizer (Google XYZ Formula)
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.84rem" }}>
                  Turn passive, task-based bullet points into high-impact, quantified achievement statements.
                </p>
              </div>
            </div>

            {/* Quick example bullets */}
            <div style={{ marginBottom: "16px" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                Try an example weak bullet:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <button
                  type="button"
                  className="outline"
                  onClick={() => {
                    setBulletInput("Worked on the frontend of our React web application and fixed bugs.");
                    setBulletRole("Frontend Developer");
                  }}
                  style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                >
                  "Worked on React frontend and fixed bugs"
                </button>
                <button
                  type="button"
                  className="outline"
                  onClick={() => {
                    setBulletInput("Responsible for optimizing database queries and server speed.");
                    setBulletRole("Backend Engineer");
                  }}
                  style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                >
                  "Responsible for database optimization"
                </button>
                <button
                  type="button"
                  className="outline"
                  onClick={() => {
                    setBulletInput("Helped train new junior team members and wrote documentation.");
                    setBulletRole("Tech Lead / Senior Engineer");
                  }}
                  style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                >
                  "Helped train new juniors and wrote docs"
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "white", marginBottom: "6px" }}>
                  Original Resume Bullet Point
                </label>
                <textarea
                  rows={3}
                  placeholder="Paste any bullet point from your work experience or projects..."
                  value={bulletInput}
                  onChange={e => setBulletInput(e.target.value)}
                  style={{ lineHeight: "1.5" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "white", marginBottom: "6px" }}>
                  Target Role Context (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Software Engineer, Product Designer, Data Scientist"
                  value={bulletRole}
                  onChange={e => setBulletRole(e.target.value)}
                />
              </div>

              <button
                className="primary"
                onClick={handleOptimizeBullet}
                disabled={optimizing || !bulletInput.trim()}
                style={{ alignSelf: "flex-start", padding: "12px 24px" }}
              >
                {optimizing ? (
                  <><Loader2 size={16} className="animate-spin" /> Rewriting with AI...</>
                ) : (
                  <><Sparkles size={16} /> Optimize Bullet Point</>
                )}
              </button>
            </div>

            {bulletError && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ef4444", marginTop: "14px", fontSize: "0.88rem" }}>
                <XCircle size={16} />
                <span>{bulletError}</span>
              </div>
            )}
          </div>

          {/* Optimizer Results */}
          {bulletResult && (
            <div className="card" style={{ padding: "28px", border: "1px solid rgba(245,158,11,0.25)" }}>
              {/* Critique */}
              <div style={{
                background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: "8px", padding: "16px", marginBottom: "24px"
              }}>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "#f59e0b", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>
                  AI Diagnostic Critique
                </span>
                <p style={{ fontSize: "0.9rem", color: "white", lineHeight: "1.4" }}>
                  {bulletResult.critique}
                </p>
              </div>

              {/* 3 Rewrite Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {bulletResult.rewrites?.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "10px", padding: "20px",
                      position: "relative",
                      transition: "border-color 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{
                        background: idx === 0 ? "rgba(139,92,246,0.15)" : idx === 1 ? "rgba(6,182,212,0.15)" : "rgba(16,185,129,0.15)",
                        color: idx === 0 ? "#8b5cf6" : idx === 1 ? "#06b6d4" : "#10b981",
                        border: "1px solid currentColor",
                        padding: "3px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700
                      }}>
                        {item.style}
                      </span>
                      <button
                        className="outline"
                        onClick={() => copyToClipboard(item.text, idx)}
                        style={{ padding: "4px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "5px" }}
                      >
                        {copiedIndex === idx ? <><Check size={12} style={{ color: "#10b981" }} /> Copied!</> : <><Copy size={12} /> Copy Bullet</>}
                      </button>
                    </div>

                    <p style={{ fontSize: "0.95rem", color: "white", fontWeight: 500, lineHeight: "1.5", marginBottom: "8px" }}>
                      "{item.text}"
                    </p>

                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      💡 {item.why_it_works}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
