import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getLatestResume } from "../api/career";
import {
  UploadCloud, FileText, CheckCircle2, ShieldAlert,
  Award, FolderGit, RefreshCw, ExternalLink, Loader2,
  CalendarClock, Code
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    year: "numeric", month: "short", day: "numeric"
  });
}

export default function ResumeUpload() {
  const [existing, setExisting] = useState(null);   // on-file resume
  const [checkLoading, setCheckLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  // Check for existing resume on mount
  useEffect(() => {
    async function checkExisting() {
      try {
        const data = await getLatestResume();
        setExisting(data);
        setShowUploader(!data);  // only show uploader immediately if nothing on file
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

      // Refresh the "on file" banner
      const fresh = await getLatestResume();
      setExisting(fresh);
      setShowUploader(false);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "2.5rem", background: "var(--grad-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          AI Resume Extractor
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Upload your resume in PDF format. Gemini parses contact details, summary, experience, skills, and projects automatically into your database.
        </p>
      </div>

      {/* On-file banner */}
      {checkLoading ? (
        <div className="card" style={{ padding: "30px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <Loader2 size={20} style={{ color: "var(--text-muted)", animation: "spin 1s linear infinite" }} />
          <span style={{ color: "var(--text-secondary)" }}>Checking for existing resume...</span>
        </div>
      ) : existing ? (
        <div
          className="card secondary-glow"
          style={{ padding: "24px", marginBottom: "24px", borderLeft: "3px solid #10b981" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
              <div style={{
                width: "46px", height: "46px", borderRadius: "10px",
                background: "linear-gradient(135deg, #10b981, #3b82f6)",
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
            <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
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

      {/* Upload panel — shown when no existing resume OR user clicked "Upload New Version" */}
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
            <UploadCloud size={48} style={{ color: "var(--text-secondary)", marginBottom: "16px", filter: "var(--shadow-icon)" }} />
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
              <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /><span>Parsing & Structuring...</span></>
            ) : (
              <><span>Upload & Extract</span><span className="arrow-icon">→</span></>
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

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}