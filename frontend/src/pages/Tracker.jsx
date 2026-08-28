import { useState, useEffect } from "react";
import { Briefcase, Calendar, FileText, CheckCircle, XCircle, Trash2, Edit, Save, PlusCircle, ExternalLink } from "lucide-react";
import { listApplications, updateApplication, deleteApplication } from "../api/applications";

const STAGES = [
  { id: "saved", name: "Saved", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.05)" },
  { id: "applied", name: "Applied", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.05)" },
  { id: "interviewing", name: "Interviewing", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.05)" },
  { id: "offered", name: "Offered", color: "#10b981", bg: "rgba(16, 185, 129, 0.05)" },
  { id: "rejected", name: "Rejected", color: "#ef4444", bg: "rgba(239, 68, 68, 0.05)" }
];

export default function Tracker() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAppId, setEditingAppId] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTrackerData();
  }, []);

  async function loadTrackerData() {
    setLoading(true);
    try {
      const data = await listApplications();
      setApplications(data);
    } catch (err) {
      setError(err.message || "Failed to load tracked applications.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(appId, newStatus) {
    try {
      await updateApplication(appId, newStatus);
      // Reload or update locally
      setApplications(prev => 
        prev.map(app => app.id === appId ? { ...app, status: newStatus } : app)
      );
    } catch (err) {
      alert(err.message || "Failed to update status.");
    }
  }

  async function handleSaveNote(appId) {
    try {
      await updateApplication(appId, undefined, noteInput);
      setApplications(prev => 
        prev.map(app => app.id === appId ? { ...app, notes: noteInput } : app)
      );
      setEditingAppId(null);
    } catch (err) {
      alert(err.message || "Failed to save notes.");
    }
  }

  async function handleDelete(appId) {
    if (!confirm("Are you sure you want to stop tracking this job?")) return;
    try {
      await deleteApplication(appId);
      setApplications(prev => prev.filter(app => app.id !== appId));
    } catch (err) {
      alert(err.message || "Failed to delete tracking.");
    }
  }

  function startEditing(app) {
    setEditingAppId(app.id);
    setNoteInput(app.notes || "");
  }

  // Group applications by stage
  const groupedApps = STAGES.reduce((acc, stage) => {
    acc[stage.id] = applications.filter(app => app.status === stage.id);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: "1250px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "2.3rem", color: "#ffffff", fontWeight: 800, display: "flex", alignItems: "center", gap: "10px" }}>
          <Briefcase size={30} style={{ color: "#3b82f6" }} />
          <span>Application Tracker</span>
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Manage your job application pipeline. Click match cards to move them across stages and track interview details.
        </p>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "50px" }}>
          <p style={{ color: "var(--text-secondary)" }}>Loading tracker board...</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", overflowX: "auto", minHeight: "600px" }}>
          {STAGES.map((stage) => {
            const list = groupedApps[stage.id] || [];
            return (
              <div 
                key={stage.id} 
                style={{ 
                  background: "rgba(15, 16, 22, 0.4)", 
                  border: "1px solid var(--border-color)", 
                  borderRadius: "12px", 
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  minWidth: "210px"
                }}
              >
                {/* Column Title */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `2px solid ${stage.color}`, paddingBottom: "10px", marginBottom: "4px" }}>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "white" }}>{stage.name}</h3>
                  <span className="badge" style={{ background: stage.bg, color: stage.color, borderColor: stage.color, fontSize: "0.75rem", padding: "2px 8px" }}>
                    {list.length}
                  </span>
                </div>

                {/* Cards List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, overflowY: "auto" }}>
                  {list.length === 0 ? (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100px", border: "1px dashed var(--border-color)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", padding: "8px" }}>
                      No items tracked
                    </div>
                  ) : (
                    list.map((app) => {
                      const job = app.jobs || {};
                      return (
                        <div 
                          key={app.id} 
                          className="card secondary-glow" 
                          style={{ 
                            padding: "14px", 
                            marginBottom: "0", 
                            display: "flex", 
                            flexDirection: "column", 
                            gap: "10px",
                            borderLeft: `3px solid ${stage.color}`
                          }}
                        >
                          {/* Title and Company */}
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "4px" }}>
                              <h4 style={{ fontSize: "0.95rem", fontWeight: "700", margin: 0, color: "white", lineHeight: "1.3" }}>
                                {job.title}
                              </h4>
                              {job.apply_url && (
                                <a href={job.apply_url} target="_blank" rel="noreferrer" style={{ color: "var(--text-secondary)" }}>
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{job.company}</span>
                          </div>

                          {/* Quick stage toggle dropdown */}
                          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                            <select 
                              value={app.status} 
                              onChange={(e) => handleStatusChange(app.id, e.target.value)}
                              style={{ 
                                flex: 1, 
                                background: "#0f1016", 
                                border: "1px solid var(--border-color)", 
                                color: "var(--text-primary)", 
                                fontSize: "0.75rem", 
                                padding: "4px 8px", 
                                borderRadius: "4px",
                                cursor: "pointer",
                                marginBottom: 0
                              }}
                            >
                              {STAGES.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>

                            <button 
                              onClick={() => handleDelete(app.id)}
                              className="outline" 
                              style={{ padding: "4px 8px", borderColor: "rgba(239, 68, 68, 0.2)", color: "#f87171" }}
                              title="Delete tracking"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Notes Section */}
                          <div style={{ background: "#0f1016", padding: "8px", borderRadius: "6px", fontSize: "0.8rem" }}>
                            {editingAppId === app.id ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                <textarea
                                  value={noteInput}
                                  onChange={(e) => setNoteInput(e.target.value)}
                                  placeholder="Recruiter context or dates..."
                                  rows={2}
                                  style={{ 
                                    width: "100%", 
                                    background: "#181922", 
                                    border: "1px solid var(--border-color)", 
                                    color: "white", 
                                    padding: "6px", 
                                    fontSize: "0.75rem", 
                                    borderRadius: "4px",
                                    marginBottom: 0
                                  }}
                                />
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button onClick={() => handleSaveNote(app.id)} style={{ flex: 1, padding: "2px 4px", fontSize: "0.7rem", background: "var(--grad-primary)" }}>
                                    <Save size={10} />
                                    <span>Save</span>
                                  </button>
                                  <button onClick={() => setEditingAppId(null)} className="outline" style={{ flex: 1, padding: "2px 4px", fontSize: "0.7rem" }}>
                                    <span>Cancel</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                  <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Notes</span>
                                  <button 
                                    onClick={() => startEditing(app)}
                                    style={{ background: "none", border: "none", padding: 0, color: "var(--text-secondary)", cursor: "pointer" }}
                                  >
                                    <Edit size={10} />
                                  </button>
                                </div>
                                <p style={{ margin: 0, color: "var(--text-secondary)", whiteSpace: "pre-wrap", lineHeight: "1.3" }}>
                                  {app.notes || "No details added yet."}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
