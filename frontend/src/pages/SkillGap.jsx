import { useState, useEffect, useCallback } from "react";
import {
  Compass, Award, BookOpen, AlertTriangle, Layers,
  ExternalLink, Clock, DollarSign, Gift, Code2,
  Zap, Target, ChevronDown, ChevronUp, Cpu, Star,
  GraduationCap, Video, Globe, Play, FileText,
  TrendingUp, FolderGit2, Timer
} from "lucide-react";
import { getSkillGapOverview } from "../api/skillGap";
import { getSkillResources } from "../api/resources";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  HIGH:   { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)",   label: "High" },
  MEDIUM: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)",  label: "Medium" },
  LOW:    { color: "#22c55e", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.25)",   label: "Low" },
  // Legacy casing from older backend versions
  High:   { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)",   label: "High" },
  Medium: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)",  label: "Medium" },
  Low:    { color: "#22c55e", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.25)",   label: "Low" },
};

const DIFFICULTY_CONFIG = {
  Beginner:     { color: "#22c55e", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.25)" },
  Intermediate: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)" },
  Advanced:     { color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)" },
};

const PLATFORM_STYLES = {
  "YouTube":                { color: "#ff0000", icon: Video },
  "YouTube / freeCodeCamp": { color: "#ff0000", icon: Video },
  "freeCodeCamp":           { color: "#0a0a23", icon: Code2 },
  "Coursera":               { color: "#0056d2", icon: GraduationCap },
  "Official Docs":          { color: "#a78bfa", icon: FileText },
  "Udemy":                  { color: "#a435f0", icon: Play },
  "GitHub":                 { color: "#e6edf3", icon: FolderGit2 },
  "Microsoft / GitHub":     { color: "#e6edf3", icon: FolderGit2 },
  "fast.ai":                { color: "#e74c3c", icon: Cpu },
  "Google":                 { color: "#4285f4", icon: Globe },
  "AWS":                    { color: "#ff9900", icon: Globe },
  "Redis":                  { color: "#ff4438", icon: Globe },
};

const TYPE_ICONS = {
  course:      GraduationCap,
  video:       Video,
  docs:        FileText,
  interactive: Cpu,
  article:     BookOpen,
};

function getPlatformIcon(platform) {
  const entry = PLATFORM_STYLES[platform];
  if (entry) return entry.icon;
  return Globe;
}

function getPlatformColor(platform) {
  const entry = PLATFORM_STYLES[platform];
  return entry?.color ?? "#94a3b8";
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab button component
// ─────────────────────────────────────────────────────────────────────────────

function TabBtn({ id, active, onClick, icon: Icon, label, badge }) {
  return (
    <button
      id={id}
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "14px 20px",
        background: active ? "var(--grad-primary)" : "transparent",
        color: active ? "white" : "var(--text-secondary)",
        border: "none",
        borderBottom: active ? "none" : "2px solid var(--border-color)",
        borderRadius: active ? "10px 10px 0 0" : "10px 10px 0 0",
        cursor: "pointer",
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600,
        fontSize: "0.9rem",
        transition: "all 0.25s ease",
        boxShadow: active ? "var(--shadow-primary)" : "none",
        position: "relative",
      }}
    >
      <Icon size={16} />
      <span>{label}</span>
      {badge !== undefined && (
        <span style={{
          background: active ? "rgba(255,255,255,0.25)" : "rgba(139,92,246,0.15)",
          color: active ? "white" : "#a78bfa",
          borderRadius: "9999px",
          padding: "2px 8px",
          fontSize: "0.75rem",
          fontWeight: 700,
        }}>{badge}</span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1 – Priority Roadmap
// ─────────────────────────────────────────────────────────────────────────────

function PriorityRoadmap({ overview }) {
  return (
    <div>
      {overview && (
        <div className="card primary-glow" style={{ padding: "24px", marginBottom: "28px" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Award size={20} style={{ color: "#a78bfa" }} />
            <span>Market Intake Summary</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.7" }}>
            We scanned your portfolio against{" "}
            <strong style={{ color: "white" }}>{overview.jobs_analyzed} stored jobs</strong>. The system identified key
            capabilities currently sought by employers that are not yet verified in your career details.
          </p>
        </div>
      )}

      <h2 style={{ fontSize: "1.4rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
        <Target size={20} style={{ color: "#ec4899" }} />
        Priority Roadmap Items
      </h2>

      {!overview || overview.missing_skills?.length === 0 ? (
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <Compass size={40} style={{ color: "var(--text-muted)", marginBottom: "16px" }} />
          <p style={{ color: "var(--text-secondary)" }}>
            No recurring skill gaps found. Check that you have job search items and a parsed resume in the database.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "18px" }}>
          {overview.missing_skills.map((s, idx) => {
            const pCfg = PRIORITY_CONFIG[s.priority] || PRIORITY_CONFIG.LOW;
            return (
              <div
                key={idx}
                className="card secondary-glow"
                style={{ borderLeft: `4px solid ${pCfg.color}`, padding: "24px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
                  <div>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>{s.skill}</h3>
                    <p style={{ fontSize: "0.83rem", color: "var(--text-muted)", marginTop: "4px" }}>
                      Appears in {s.appears_in_jobs} jobs · Required in {s.required_in_jobs ?? "?"} jobs
                    </p>
                  </div>
                  <span style={{
                    background: pCfg.bg,
                    color: pCfg.color,
                    border: `1px solid ${pCfg.border}`,
                    borderRadius: "9999px",
                    padding: "5px 14px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                  }}>
                    {pCfg.label} Priority
                  </span>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", background: "#0f1016", padding: "16px", borderRadius: "8px" }}>
                  <BookOpen size={17} style={{ color: "#a78bfa", marginTop: "3px", flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: "0.85rem", color: "white", display: "block", marginBottom: "4px" }}>
                      Recommended Action:
                    </strong>
                    <p style={{ fontSize: "0.93rem", color: "var(--text-secondary)", lineHeight: "1.55" }}>
                      {s.recommended_prep}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2 – Learning Resources
// ─────────────────────────────────────────────────────────────────────────────

const RESOURCE_FILTERS = ["All", "Free", "Paid", "video", "docs", "course", "interactive", "article"];

function ResourceCard({ resource }) {
  const PlatformIcon = getPlatformIcon(resource.platform);
  const platformColor = getPlatformColor(resource.platform);
  const TypeIcon = TYPE_ICONS[resource.type] || Globe;

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block",
        textDecoration: "none",
        background: "var(--bg-card)",
        border: "2px solid var(--border-color)",
        borderRadius: "10px",
        padding: "18px",
        transition: "all 0.25s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--border-glow)";
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--border-color)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Top accent line by platform color */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: platformColor, opacity: 0.7 }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <PlatformIcon size={16} style={{ color: platformColor, flexShrink: 0 }} />
          <span style={{ fontSize: "0.78rem", color: platformColor, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
            {resource.platform}
          </span>
        </div>
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          <span style={{
            display: "flex", alignItems: "center", gap: "4px",
            background: resource.is_free ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
            color: resource.is_free ? "#22c55e" : "#f59e0b",
            border: `1px solid ${resource.is_free ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
            borderRadius: "9999px",
            padding: "3px 10px",
            fontSize: "0.73rem",
            fontWeight: 700,
          }}>
            {resource.is_free ? <Gift size={11} /> : <DollarSign size={11} />}
            {resource.is_free ? "Free" : "Paid"}
          </span>
          <span style={{
            display: "flex", alignItems: "center", gap: "4px",
            background: "rgba(139,92,246,0.1)",
            color: "#a78bfa",
            border: "1px solid rgba(139,92,246,0.2)",
            borderRadius: "9999px",
            padding: "3px 10px",
            fontSize: "0.73rem",
            fontWeight: 600,
          }}>
            <TypeIcon size={11} />
            {resource.type}
          </span>
        </div>
      </div>

      <h4 style={{ fontSize: "0.95rem", color: "white", fontWeight: 600, marginBottom: "8px", lineHeight: "1.4" }}>
        {resource.title}
      </h4>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <Clock size={13} />
          {resource.duration}
        </span>
        <ExternalLink size={14} style={{ color: "var(--text-muted)" }} />
      </div>
    </a>
  );
}

function LearningResources({ skillNames }) {
  const [resourceData, setResourceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");
  const [fetched, setFetched] = useState(false);

  const fetchResources = useCallback(async () => {
    if (fetched || !skillNames?.length) return;
    setLoading(true);
    setFetched(true);
    try {
      const data = await getSkillResources(skillNames);
      setResourceData(data.resources || []);
    } catch (err) {
      setError(err.message || "Failed to load resources.");
    } finally {
      setLoading(false);
    }
  }, [skillNames, fetched]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  if (!skillNames?.length) {
    return (
      <div className="card" style={{ padding: "40px", textAlign: "center" }}>
        <BookOpen size={40} style={{ color: "var(--text-muted)", marginBottom: "16px" }} />
        <p style={{ color: "var(--text-secondary)" }}>
          No skill gaps identified yet. Upload your resume and add some jobs to get started.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "60px 0" }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "50%",
          border: "3px solid var(--border-color)",
          borderTopColor: "#8b5cf6",
          animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Finding the best learning resources…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", padding: "16px", borderRadius: "8px" }}>
        <AlertTriangle size={18} />
        <span>{error}</span>
      </div>
    );
  }

  if (!resourceData) return null;

  const filterBtns = ["All", "Free", "Paid", "video", "docs", "course", "interactive", "article"];

  // Flatten all resources for filter counting
  const allResources = resourceData.flatMap(s => s.resources.map(r => ({ ...r, _skill: s.skill })));

  const filteredBySkill = resourceData.map(skillGroup => ({
    ...skillGroup,
    resources: skillGroup.resources.filter(r => {
      if (filter === "All") return true;
      if (filter === "Free") return r.is_free;
      if (filter === "Paid") return !r.is_free;
      return r.type === filter;
    }),
  })).filter(sg => sg.resources.length > 0);

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "28px" }}>
        {filterBtns.map(f => (
          <button
            key={f}
            id={`resource-filter-${f.toLowerCase()}`}
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 16px",
              borderRadius: "9999px",
              border: filter === f ? "none" : "1px solid var(--border-color)",
              background: filter === f ? "var(--grad-primary)" : "transparent",
              color: filter === f ? "white" : "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 600,
              fontSize: "0.82rem",
              transition: "all 0.2s ease",
              boxShadow: filter === f ? "var(--shadow-primary)" : "none",
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filteredBySkill.length === 0 ? (
        <div className="card" style={{ padding: "32px", textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>No resources match this filter.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {filteredBySkill.map((skillGroup, i) => {
            const pCfg = PRIORITY_CONFIG.LOW; // just use as accent
            return (
              <div key={i}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                  <BookOpen size={18} style={{ color: "#a78bfa" }} />
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{skillGroup.skill}</h3>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.04)", padding: "3px 10px", borderRadius: "9999px", border: "1px solid var(--border-color)" }}>
                    {skillGroup.resources.length} resource{skillGroup.resources.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
                  {skillGroup.resources.map((res, j) => (
                    <ResourceCard key={j} resource={res} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3 – Project Ideas
// ─────────────────────────────────────────────────────────────────────────────

function ProjectCard({ project, gapSkills }) {
  const [expanded, setExpanded] = useState(false);
  const diffCfg = DIFFICULTY_CONFIG[project.difficulty] || DIFFICULTY_CONFIG.Intermediate;

  return (
    <div
      className="card"
      style={{
        borderLeft: `4px solid ${diffCfg.color}`,
        padding: "24px",
        transition: "all 0.25s ease",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "10px",
            background: `${diffCfg.bg}`,
            border: `1px solid ${diffCfg.border}`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <FolderGit2 size={20} style={{ color: diffCfg.color }} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, lineHeight: "1.35", marginBottom: "4px" }}>
              {project.title}
            </h3>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <span style={{
                display: "flex", alignItems: "center", gap: "4px",
                background: diffCfg.bg,
                color: diffCfg.color,
                border: `1px solid ${diffCfg.border}`,
                borderRadius: "9999px",
                padding: "3px 10px",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}>
                <Zap size={11} /> {project.difficulty}
              </span>
              <span style={{
                display: "flex", alignItems: "center", gap: "4px",
                background: "rgba(6,182,212,0.08)",
                color: "#22d3ee",
                border: "1px solid rgba(6,182,212,0.2)",
                borderRadius: "9999px",
                padding: "3px 10px",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}>
                <Timer size={11} /> {project.estimated_time}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Skills targeted */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
        {(project.skills_practiced || []).map((sk, i) => {
          const isGap = gapSkills.some(g => g.toLowerCase() === sk.toLowerCase());
          return (
            <span key={i} style={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              background: isGap ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.04)",
              color: isGap ? "#a78bfa" : "var(--text-secondary)",
              border: `1px solid ${isGap ? "rgba(139,92,246,0.25)" : "var(--border-color)"}`,
              borderRadius: "9999px",
              padding: "3px 10px",
              fontSize: "0.78rem",
              fontWeight: isGap ? 600 : 400,
            }}>
              {isGap && <Star size={10} />}
              {sk}
            </span>
          );
        })}
      </div>

      {/* Expandable description + tech stack */}
      <button
        id={`project-expand-${project.title?.replace(/\s+/g, "-").toLowerCase()}`}
        onClick={() => setExpanded(e => !e)}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "transparent", border: "none",
          color: "var(--text-secondary)", cursor: "pointer",
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "0.85rem", fontWeight: 600,
          padding: "6px 0",
          transition: "color 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "white"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
      >
        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        {expanded ? "Hide details" : "View details"}
      </button>

      {expanded && (
        <div style={{
          marginTop: "14px",
          background: "#0f1016",
          borderRadius: "8px",
          padding: "18px",
          animation: "fadeIn 0.2s ease",
        }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.65", marginBottom: "16px" }}>
            {project.description}
          </p>
          {project.tech_stack?.length > 0 && (
            <div>
              <strong style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Suggested Tech Stack
              </strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {project.tech_stack.map((tech, i) => (
                  <span key={i} style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "0.8rem",
                    fontFamily: "monospace",
                  }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

function ProjectIdeas({ projects, gapSkills }) {
  if (!projects) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "60px 0" }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "50%",
          border: "3px solid var(--border-color)",
          borderTopColor: "#ec4899",
          animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ color: "var(--text-secondary)" }}>Generating project ideas…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="card" style={{ padding: "40px", textAlign: "center" }}>
        <FolderGit2 size={40} style={{ color: "var(--text-muted)", marginBottom: "16px" }} />
        <p style={{ color: "var(--text-secondary)" }}>
          No project recommendations yet. Ensure your resume and job listings are loaded.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Hero banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(236,72,153,0.08) 100%)",
        border: "1px solid rgba(139,92,246,0.2)",
        borderRadius: "12px",
        padding: "22px 28px",
        marginBottom: "28px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "12px",
          background: "var(--grad-primary)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          boxShadow: "var(--shadow-primary)",
        }}>
          <TrendingUp size={24} style={{ color: "white" }} />
        </div>
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "4px" }}>
            Build your way to the job
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: "1.5" }}>
            These AI-generated project ideas are tailored to your skill gaps. Building even 2-3 of them will dramatically
            strengthen your portfolio. Skills highlighted in{" "}
            <span style={{ color: "#a78bfa", fontWeight: 600 }}>purple ★</span> are your identified gaps.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "18px" }}>
        {projects.map((p, i) => (
          <ProjectCard key={i} project={p} gapSkills={gapSkills} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main SkillGap page
// ─────────────────────────────────────────────────────────────────────────────

export default function SkillGap() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("roadmap");

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

  const skillNames = overview?.missing_skills?.map(s => s.skill) ?? [];
  const projects = overview?.project_recommendations ?? null;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{
          fontSize: "2.3rem",
          color: "#ffffff",
          display: "flex", alignItems: "center", gap: "12px",
          marginBottom: "8px",
          fontWeight: 800,
        }}>
          <Compass size={30} style={{ color: "#3b82f6" }} />
          <span>Skill Gap &amp; Roadmaps</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6" }}>
          Analysis of missing capabilities matched against local job market demands — with curated resources and
          AI-generated project recommendations to close your gaps fast.
        </p>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", padding: "16px", borderRadius: "8px", marginBottom: "28px" }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", padding: "80px 0" }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "50%",
            border: "3px solid var(--border-color)",
            borderTopColor: "#8b5cf6",
            animation: "spin 0.9s linear infinite",
          }} />
          <p style={{ color: "var(--text-secondary)" }}>Analyzing catalog discrepancies…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {/* ── Tab bar ── */}
          <div style={{ display: "flex", gap: "0", marginBottom: "0", borderBottom: "2px solid var(--border-color)" }}>
            <TabBtn
              id="tab-roadmap"
              active={activeTab === "roadmap"}
              onClick={() => setActiveTab("roadmap")}
              icon={Target}
              label="Priority Roadmap"
              badge={overview?.missing_skills?.length ?? 0}
            />
            <TabBtn
              id="tab-resources"
              active={activeTab === "resources"}
              onClick={() => setActiveTab("resources")}
              icon={BookOpen}
              label="Learning Resources"
            />
            <TabBtn
              id="tab-projects"
              active={activeTab === "projects"}
              onClick={() => setActiveTab("projects")}
              icon={FolderGit2}
              label="Project Ideas"
              badge={projects?.length ?? "…"}
            />
          </div>

          {/* ── Tab content ── */}
          <div style={{ paddingTop: "32px" }}>
            {activeTab === "roadmap" && <PriorityRoadmap overview={overview} />}
            {activeTab === "resources" && (
              <LearningResources skillNames={skillNames} />
            )}
            {activeTab === "projects" && (
              <ProjectIdeas
                projects={overview ? projects : null}
                gapSkills={skillNames}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}