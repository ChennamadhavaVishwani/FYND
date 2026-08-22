import { useNavigate } from "react-router-dom";
import { ArrowRight, Compass, Sparkles, Target, Award, BookOpen, Users } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 50% 30%, #151030 0%, var(--bg-dark) 70%)", color: "white", fontFamily: "'Inter', sans-serif" }}>
      {/* Header banner */}
      <header style={{ maxWidth: "1200px", margin: "0 auto", padding: "30px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.75rem", background: "var(--grad-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "0.1em" }}>
          FYND
        </h2>
        <div style={{ display: "flex", gap: "16px" }}>
          <button className="outline" onClick={() => navigate("/login")} style={{ padding: "8px 20px" }}>
            Sign In
          </button>
          <button className="primary" onClick={() => navigate("/signup")} style={{ padding: "8px 20px" }}>
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "80px 20px 60px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(139, 92, 246, 0.1)", border: "1px solid rgba(139, 92, 246, 0.2)", padding: "6px 16px", borderRadius: "9999px", marginBottom: "24px" }}>
          <Sparkles size={16} style={{ color: "#a78bfa" }} />
          <span style={{ fontSize: "0.85rem", color: "#a78bfa", fontWeight: "600", fontFamily: "'Space Grotesk', sans-serif" }}>
            Next-Gen AI Career Discovery Platform
          </span>
        </div>

        <h1 style={{ fontSize: "3.5rem", lineHeight: "1.15", background: "linear-gradient(135deg, #ffffff 30%, #a78bfa 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "20px", textShadow: "0px 4px 20px rgba(139, 92, 246, 0.15)" }}>
          Find Your Next Destination
        </h1>

        <p style={{ fontSize: "1.2rem", color: "var(--text-secondary)", lineHeight: "1.6", maxWWidth: "680px", margin: "0 auto 40px" }}>
          Upload PDF resumes to parse contact details, match semantic similarity, check local job catalog skill coverage roadmaps, and practice with an AI interview prep coach.
        </p>

        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
          <button className="primary" onClick={() => navigate("/signup")} style={{ padding: "16px 36px", fontSize: "1.05rem" }}>
            <span>Create Free Account</span>
            <span className="arrow-icon">→</span>
          </button>
          <button className="outline" onClick={() => navigate("/login")} style={{ padding: "16px 36px", fontSize: "1.05rem" }}>
            <span>Existing Members</span>
          </button>
        </div>
      </section>

      {/* Feature Grids */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "60px 20px 100px" }}>
        <h2 style={{ textAlign: "center", fontSize: "2rem", marginBottom: "50px", fontFamily: "'Space Grotesk', sans-serif" }}>
          Powered by Deep Intelligence
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
          <div className="card primary-glow" style={{ marginBottom: "0", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "var(--grad-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Target size={20} style={{ color: "white" }} />
            </div>
            <h3 style={{ fontSize: "1.2rem" }}>Profile Auto-Extraction</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.5" }}>
              Ingest free-form PDF resumes. Gemini structures contact info, summary bios, skills categories, experiences, and projects instantly into your DB.
            </p>
          </div>

          <div className="card secondary-glow" style={{ marginBottom: "0", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "var(--grad-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Compass size={20} style={{ color: "white" }} />
            </div>
            <h3 style={{ fontSize: "1.2rem" }}>Interactive Roadmap Gaps</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.5" }}>
              Compare your catalog skills against stored job requirements. View prioritized missing tags with customized learning path prep descriptions.
            </p>
          </div>

          <div className="card accent-glow" style={{ marginBottom: "0", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "var(--grad-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={20} style={{ color: "white" }} />
            </div>
            <h3 style={{ fontSize: "1.2rem" }}>Mock Interview Simulator</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.5" }}>
              Practice core programming, system design, and behavioral questions. Submit replies to get custom evaluations from our built-in AI Coach.
            </p>
          </div>

          <div className="card" style={{ marginBottom: "0", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={20} style={{ color: "white" }} />
            </div>
            <h3 style={{ fontSize: "1.2rem" }}>Personal Dashboard</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.5" }}>
              A centralized dashboard like on Wellfound. Add, view, edit, and delete details, skills badges, projects, experience history, and school details.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
