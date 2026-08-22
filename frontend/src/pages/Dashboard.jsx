import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Briefcase, Compass, BookOpen, Users,
  Sparkles, Kanban, ArrowUpRight, ChevronRight,
  FileText, Target, TrendingUp, CheckCircle2,
  Zap, ShieldAlert, Loader2
} from "lucide-react";

import { searchJobs, ingestJobs } from "../api/jobs";
import { getProfile } from "../api/career";
import { listApplications } from "../api/applications";
import { matchAllJobs } from "../api/match";
import JobCard from "../components/JobCard";

// ─── Quick Action Cards ───────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    path: "/jobs",
    label: "AI Job Matches",
    description: "See every job ranked by your fit score",
    icon: Target,
    gradient: "var(--grad-primary)",
    glow: "rgba(139, 92, 246, 0.15)",
  },
  {
    path: "/skills",
    label: "Skill Gap Analysis",
    description: "Identify what's missing across market demands",
    icon: Compass,
    gradient: "var(--grad-secondary)",
    glow: "rgba(6, 182, 212, 0.15)",
  },
  {
    path: "/interview",
    label: "Interview Prep",
    description: "Practice with AI feedback on your answers",
    icon: BookOpen,
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    glow: "rgba(245, 158, 11, 0.15)",
  },
  {
    path: "/copilot",
    label: "AI Career Copilot",
    description: "Chat with your personal AI career advisor",
    icon: Sparkles,
    gradient: "linear-gradient(135deg, #ec4899, #8b5cf6)",
    glow: "rgba(236, 72, 153, 0.15)",
  },
  {
    path: "/tracker",
    label: "Application Tracker",
    description: "Manage your Kanban pipeline of applications",
    icon: Kanban,
    gradient: "linear-gradient(135deg, #10b981, #3b82f6)",
    glow: "rgba(16, 185, 129, 0.15)",
  },
  {
    path: "/networking",
    label: "Networking",
    description: "Find people and communities to connect with",
    icon: Users,
    gradient: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
    glow: "rgba(6, 182, 212, 0.15)",
  },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, gradient, loading }) {
  return (
    <div
      className="card"
      style={{
        padding: "20px 24px",
        marginBottom: 0,
        borderLeft: `3px solid transparent`,
        borderImage: `${gradient} 1`,
        display: "flex",
        alignItems: "center",
        gap: "16px",
        cursor: "default",
      }}
    >
      <div
        style={{
          width: "46px",
          height: "46px",
          borderRadius: "10px",
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={22} color="white" />
      </div>
      <div>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)" }}>
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: "0.8rem" }}>Loading...</span>
          </div>
        ) : (
          <div style={{ fontSize: "1.6rem", fontWeight: "700", color: "white", lineHeight: 1 }}>
            {value}
          </div>
        )}
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>{label}</div>
        {sub && !loading && (
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>{sub}</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();

  // Profile / stats state
  const [profile, setProfile] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [topMatchScore, setTopMatchScore] = useState(null);
  const [trackedCount, setTrackedCount] = useState(null);

  // Job search state
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Load stats on mount
  useEffect(() => {
    async function loadStats() {
      setStatsLoading(true);
      try {
        // Run all stats calls in parallel
        const [prof, tracked, matchData] = await Promise.allSettled([
          getProfile(),
          listApplications(),
          matchAllJobs({ limit: 5 }),
        ]);

        if (prof.status === "fulfilled") setProfile(prof.value);
        if (tracked.status === "fulfilled") setTrackedCount(tracked.value?.length ?? 0);
        if (matchData.status === "fulfilled") {
          const matches = matchData.value?.matches || [];
          if (matches.length > 0) setTopMatchScore(matches[0].match_score);
        }
      } catch (_) {
        // Silently degrade — stats are non-critical
      } finally {
        setStatsLoading(false);
      }
    }
    loadStats();
  }, []);

  const skillCount = profile?.skills?.length ?? null;
  const projectCount = profile?.projects?.length ?? null;
  const firstName = profile?.profile_json?.name?.split(" ")[0] || null;

  async function handleSearch() {
    if (!query.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      await ingestJobs({ query, extract_requirements: true });
      const response = await searchJobs({ query, limit: 20 });
      setJobs(response.jobs || []);
    } catch (err) {
      setSearchError(err.message || "Search failed.");
    } finally {
      setSearchLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSearch();
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

      {/* ── Greeting ── */}
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontSize: "2.6rem",
            background: "var(--grad-primary)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.1,
            marginBottom: "8px",
          }}
        >
          {firstName ? `Welcome back, ${firstName} 👋` : "Your Career Command Centre"}
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
          Everything you need to find, evaluate, and land your next role — powered by AI.
        </p>
      </div>

      {/* ── Stats Bar ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "36px",
        }}
      >
        <StatCard
          icon={TrendingUp}
          label="Top Match Score"
          value={topMatchScore !== null ? `${topMatchScore}%` : "—"}
          sub={topMatchScore !== null ? "across current job pool" : "run AI matching to see"}
          gradient="var(--grad-primary)"
          loading={statsLoading}
        />
        <StatCard
          icon={CheckCircle2}
          label="Skills Verified"
          value={skillCount !== null ? skillCount : "—"}
          sub={projectCount !== null ? `${projectCount} projects` : undefined}
          gradient="var(--grad-secondary)"
          loading={statsLoading}
        />
        <StatCard
          icon={Kanban}
          label="Applications Tracked"
          value={trackedCount !== null ? trackedCount : "—"}
          sub="in your Kanban pipeline"
          gradient="linear-gradient(135deg, #10b981, #3b82f6)"
          loading={statsLoading}
        />
        <StatCard
          icon={Zap}
          label="AI Features Active"
          value="6"
          sub="Match · Gap · Coach · Copilot · Network · Tracker"
          gradient="linear-gradient(135deg, #f59e0b, #ef4444)"
          loading={false}
        />
      </div>

      {/* ── Quick Actions Grid ── */}
      <div style={{ marginBottom: "40px" }}>
        <h2
          style={{
            fontSize: "1.2rem",
            color: "var(--text-secondary)",
            fontWeight: 600,
            marginBottom: "16px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontSize: "0.8rem",
          }}
        >
          Navigate FYND
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                style={{
                  background: action.glow,
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "20px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                  color: "white",
                  width: "100%",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.borderColor = "var(--border-glow)";
                  e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.4)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    background: action.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 700,
                        fontSize: "1rem",
                        color: "white",
                      }}
                    >
                      {action.label}
                    </span>
                    <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
                  </div>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--text-secondary)",
                      marginTop: "4px",
                      lineHeight: 1.4,
                    }}
                  >
                    {action.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Job Search ── */}
      <div>
        <h2
          style={{
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            fontWeight: 600,
            marginBottom: "16px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Discover &amp; Ingest Jobs
        </h2>

        <div className="card primary-glow" style={{ padding: "24px", marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
              <Search
                size={18}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search role (e.g. ML Engineer, React Developer)..."
                style={{ paddingLeft: "44px", marginBottom: 0 }}
              />
            </div>
            <button
              className="primary"
              onClick={handleSearch}
              disabled={searchLoading || !query.trim()}
              style={{ padding: "12px 28px", flexShrink: 0 }}
            >
              {searchLoading ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <span>Search &amp; Ingest</span>
                  <span className="arrow-icon">→</span>
                </>
              )}
            </button>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "10px" }}>
            Pulls fresh listings from Arbeitnow, extracts skill requirements with AI, and stores them in your database for matching.
          </p>
        </div>

        {searchError && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#ef4444",
              padding: "14px 18px",
              borderRadius: "8px",
              marginBottom: "20px",
              fontSize: "0.9rem",
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{searchError}</span>
          </div>
        )}

        {hasSearched && !searchLoading && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  fontSize: "1.3rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Briefcase size={20} style={{ color: "#8b5cf6" }} />
                {jobs.length > 0
                  ? `${jobs.length} jobs found for "${query}"`
                  : `No results for "${query}"`}
              </h3>
              {jobs.length > 0 && (
                <button
                  className="outline"
                  onClick={() => navigate("/jobs")}
                  style={{
                    fontSize: "0.82rem",
                    padding: "8px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>See AI Rankings</span>
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>

            {jobs.length === 0 ? (
              <div
                className="card"
                style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}
              >
                <FileText size={36} style={{ color: "var(--text-muted)", marginBottom: "12px" }} />
                <p>No jobs found. Try a different keyword.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        )}

        {!hasSearched && (
          <div
            className="card"
            style={{
              padding: "48px",
              textAlign: "center",
              background: "rgba(255,255,255,0.01)",
              border: "1px dashed var(--border-color)",
            }}
          >
            <Search size={40} style={{ color: "var(--text-muted)", marginBottom: "14px" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
              Enter a role or keyword above to discover and ingest fresh job listings.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "6px" }}>
              Or head to{" "}
              <span
                onClick={() => navigate("/jobs")}
                style={{ color: "#a78bfa", cursor: "pointer", textDecoration: "underline" }}
              >
                AI Job Matches
              </span>{" "}
              to see jobs already ranked for your profile.
            </p>
          </div>
        )}
      </div>

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}