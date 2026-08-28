import { useState, useEffect } from "react";
import { 
  User, Mail, Phone, MapPin, Globe, 
  Plus, Trash2, Briefcase, GraduationCap, Code, FolderGit, Save, Edit3, X,
  Target, CheckCircle2, Circle, Loader2, Sparkles, ChevronDown, ChevronUp
} from "lucide-react";

const Linkedin = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={props.size || 24} height={props.size || 24} {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const Github = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={props.size || 24} height={props.size || 24} {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

import { 
  getProfile, updateProfile, 
  addSkill, deleteSkill, 
  addProject, deleteProject, 
  addExperience, deleteExperience,
  listGoals, createGoal, toggleGoalSkill, deleteGoal
} from "../api/career";
import { getSkillGapOverview } from "../api/skillGap";

export default function CareerProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editBasic, setEditBasic] = useState(false);

  // Goals state
  const [goals, setGoals] = useState([]);
  const [goalInput, setGoalInput] = useState("");
  const [goalCreating, setGoalCreating] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(true);
  const [togglingSkill, setTogglingSkill] = useState(null); // "goalId:skill"

  // AI Project Recommendations state
  const [projectRecs, setProjectRecs] = useState(null); // null = loading, [] = empty
  const [projectRecsError, setProjectRecsError] = useState(null);
  const [expandedRec, setExpandedRec] = useState(null); // index of expanded card

  // Form states
  const [basicForm, setBasicForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    summary: "",
    location: "",
    website: "",
    linkedin: "",
    github: ""
  });

  const [skillForm, setSkillForm] = useState({ skill_name: "", category: "Frontend" });
  const [projectForm, setProjectForm] = useState({ title: "", description: "", tech_stack: "" });
  const [experienceForm, setExperienceForm] = useState({ company: "", role: "", start_date: "", end_date: "", description: "" });
  const [educationForm, setEducationForm] = useState({ school: "", degree: "", start_date: "", end_date: "" });

  useEffect(() => {
    fetchProfileData();
    fetchGoals();
    fetchProjectRecs();
  }, []);

  async function fetchProjectRecs() {
    try {
      const data = await getSkillGapOverview();
      setProjectRecs(data?.project_recommendations ?? []);
    } catch (err) {
      setProjectRecsError("Could not load AI project suggestions.");
      setProjectRecs([]);
    }
  }

  async function fetchGoals() {
    try {
      const data = await listGoals();
      setGoals(data || []);
    } catch {}
  }

  async function handleCreateGoal(e) {
    e.preventDefault();
    if (!goalInput.trim()) return;
    setGoalCreating(true);
    try {
      await createGoal(goalInput.trim());
      setGoalInput("");
      fetchGoals();
    } catch (err) {
      setError(err.message || "Failed to create goal.");
    } finally {
      setGoalCreating(false);
    }
  }

  async function handleDeleteGoal(goalId) {
    try {
      await deleteGoal(goalId);
      setGoals(prev => prev.filter(g => g.id !== goalId));
    } catch (err) {
      setError(err.message || "Failed to delete goal.");
    }
  }

  async function handleToggleSkill(goal, item) {
    const key = `${goal.id}:${item.skill}`;
    setTogglingSkill(key);
    const newChecked = !item.checked;
    // Optimistically update local state
    setGoals(prev => prev.map(g => g.id === goal.id
      ? { ...g, skill_checklist: g.skill_checklist.map(s => s.skill === item.skill ? { ...s, checked: newChecked } : s) }
      : g
    ));
    try {
      await toggleGoalSkill(goal.id, item.skill, item.category, newChecked);
      // If checked, refresh profile to show new skill badge
      if (newChecked) fetchProfileData();
    } catch (err) {
      // Revert on failure
      setGoals(prev => prev.map(g => g.id === goal.id
        ? { ...g, skill_checklist: g.skill_checklist.map(s => s.skill === item.skill ? { ...s, checked: item.checked } : s) }
        : g
      ));
      setError(err.message || "Failed to toggle skill.");
    } finally {
      setTogglingSkill(null);
    }
  }

  async function fetchProfileData() {
    setLoading(true);
    try {
      const data = await getProfile();
      setProfile(data);
      if (data) {
        setBasicForm({
          full_name: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
          summary: data.summary || "",
          location: data.profile_json?.location || "",
          website: data.profile_json?.website || "",
          linkedin: data.profile_json?.linkedin || "",
          github: data.profile_json?.github || ""
        });
      }
    } catch (err) {
      setError(err.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateBasic(e) {
    e.preventDefault();
    try {
      const payload = {
        full_name: basicForm.full_name,
        email: basicForm.email,
        phone: basicForm.phone,
        summary: basicForm.summary,
        profile_json: {
          location: basicForm.location,
          website: basicForm.website,
          linkedin: basicForm.linkedin,
          github: basicForm.github
        }
      };
      await updateProfile(payload);
      setEditBasic(false);
      fetchProfileData();
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    }
  }

  async function handleAddSkill(e) {
    e.preventDefault();
    if (!skillForm.skill_name.trim()) return;
    try {
      await addSkill(skillForm);
      setSkillForm({ skill_name: "", category: "Frontend" });
      fetchProfileData();
    } catch (err) {
      setError(err.message || "Failed to add skill.");
    }
  }

  async function handleDeleteSkill(id) {
    try {
      await deleteSkill(id);
      fetchProfileData();
    } catch (err) {
      setError(err.message || "Failed to delete skill.");
    }
  }

  async function handleAddProject(e) {
    e.preventDefault();
    if (!projectForm.title.trim()) return;
    try {
      const payload = {
        ...projectForm,
        tech_stack: projectForm.tech_stack.split(",").map(t => t.trim()).filter(Boolean)
      };
      await addProject(payload);
      setProjectForm({ title: "", description: "", tech_stack: "" });
      fetchProfileData();
    } catch (err) {
      setError(err.message || "Failed to add project.");
    }
  }

  async function handleDeleteProject(id) {
    try {
      await deleteProject(id);
      fetchProfileData();
    } catch (err) {
      setError(err.message || "Failed to delete project.");
    }
  }

  async function handleAddExperience(e) {
    e.preventDefault();
    if (!experienceForm.company.trim() || !experienceForm.role.trim()) return;
    try {
      await addExperience(experienceForm);
      setExperienceForm({ company: "", role: "", start_date: "", end_date: "", description: "" });
      fetchProfileData();
    } catch (err) {
      setError(err.message || "Failed to add experience.");
    }
  }

  async function handleDeleteExperience(id) {
    try {
      await deleteExperience(id);
      fetchProfileData();
    } catch (err) {
      setError(err.message || "Failed to delete experience.");
    }
  }

  async function handleAddEducation(e) {
    e.preventDefault();
    if (!educationForm.school.trim() || !educationForm.degree.trim()) return;
    try {
      const currentEducation = profile.profile_json?.education || [];
      const updatedEducation = [...currentEducation, { ...educationForm, id: Date.now().toString() }];
      
      await updateProfile({
        profile_json: {
          education: updatedEducation
        }
      });
      setEducationForm({ school: "", degree: "", start_date: "", end_date: "" });
      fetchProfileData();
    } catch (err) {
      setError(err.message || "Failed to add education.");
    }
  }

  async function handleDeleteEducation(id) {
    try {
      const currentEducation = profile.profile_json?.education || [];
      const updatedEducation = currentEducation.filter(edu => edu.id !== id);
      
      await updateProfile({
        profile_json: {
          education: updatedEducation
        }
      });
      fetchProfileData();
    } catch (err) {
      setError(err.message || "Failed to delete education.");
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.25rem", color: "var(--text-secondary)" }}>
          Loading profile...
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px", flexDirection: "column", gap: "12px" }}>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.25rem", color: "var(--text-secondary)" }}>
          Could not load profile.
        </p>
        {error && <p style={{ color: "#ef4444", fontSize: "0.9rem" }}>{error}</p>}
        <button className="outline" onClick={fetchProfileData}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "2.3rem", color: "#ffffff", fontWeight: 800 }}>
            Personal Dashboard
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            View, update, and manage your professional career credentials.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {/* ── Career Goals Section ── */}
      <div className="card" style={{ marginBottom: "30px", background: "rgba(139,92,246,0.04)", borderColor: "rgba(139,92,246,0.2)" }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", marginBottom: goalsOpen ? "20px" : "0" }}
          onClick={() => setGoalsOpen(v => !v)}
        >
          <h2 style={{ fontSize: "1.4rem", display: "flex", alignItems: "center", gap: "10px" }}>
            <Target size={22} style={{ color: "#a78bfa" }} />
            <span>Career Goals &amp; Skill Roadmaps</span>
            <span style={{ fontSize: "0.75rem", background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "9999px", padding: "2px 10px" }}>
              {goals.length} goal{goals.length !== 1 ? "s" : ""}
            </span>
          </h2>
          {goalsOpen ? <ChevronUp size={18} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={18} style={{ color: "var(--text-muted)" }} />}
        </div>

        {goalsOpen && (
          <div>
            {/* Add goal form */}
            <form onSubmit={handleCreateGoal} style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "220px", position: "relative" }}>
                <Target size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }} />
                <input
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  placeholder="Target role (e.g. AI Engineer, Data Scientist)..."
                  style={{ paddingLeft: "38px", marginBottom: 0 }}
                />
              </div>
              <button
                type="submit"
                className="primary"
                disabled={goalCreating || !goalInput.trim()}
                style={{ padding: "12px 20px", flexShrink: 0 }}
              >
                {goalCreating ? (
                  <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /><span>Generating...</span></>
                ) : (
                  <><Sparkles size={15} /><span>Add Goal</span></>
                )}
              </button>
            </form>

            {goals.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No goals yet. Add a target role above and Gemini will generate a skill checklist for you.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                {goals.map(goal => {
                  const checklist = goal.skill_checklist || [];
                  const doneCount = checklist.filter(s => s.checked).length;
                  const pct = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;
                  return (
                    <div
                      key={goal.id}
                      style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "12px", padding: "20px", transition: "border-color 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(139,92,246,0.4)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-color)"}
                    >
                      {/* Goal header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                        <div>
                          <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "white" }}>{goal.role_title}</h3>
                          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            {doneCount}/{checklist.length} skills acquired
                          </p>
                        </div>
                        <Trash2
                          size={14}
                          style={{ color: "#ef4444", cursor: "pointer", opacity: 0.6, flexShrink: 0 }}
                          onClick={() => handleDeleteGoal(goal.id)}
                        />
                      </div>

                      {/* Progress bar */}
                      <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "9999px", marginBottom: "14px", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${pct}%`,
                          background: pct === 100 ? "var(--grad-success)" : "var(--grad-primary)",
                          borderRadius: "9999px", transition: "width 0.4s ease"
                        }} />
                      </div>

                      {/* Skill checklist */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {checklist.map(item => {
                          const key = `${goal.id}:${item.skill}`;
                          const isToggling = togglingSkill === key;
                          return (
                            <button
                              key={item.skill}
                              onClick={() => handleToggleSkill(goal, item)}
                              disabled={isToggling}
                              style={{
                                display: "flex", alignItems: "center", gap: "10px",
                                background: item.checked ? "rgba(16,185,129,0.07)" : "transparent",
                                border: `1px solid ${item.checked ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.05)"}`,
                                borderRadius: "8px", padding: "8px 12px",
                                cursor: "pointer", transition: "all 0.2s", width: "100%", textAlign: "left"
                              }}
                            >
                              {isToggling ? (
                                <Loader2 size={15} style={{ color: "var(--text-muted)", animation: "spin 1s linear infinite", flexShrink: 0 }} />
                              ) : item.checked ? (
                                <CheckCircle2 size={15} style={{ color: "#10b981", flexShrink: 0 }} />
                              ) : (
                                <Circle size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                              )}
                              <span style={{
                                fontSize: "0.88rem", fontWeight: 500,
                                color: item.checked ? "#10b981" : "var(--text-secondary)",
                                textDecoration: item.checked ? "line-through" : "none",
                                flex: 1
                              }}>
                                {item.skill}
                              </span>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", flexShrink: 0 }}>
                                {item.category}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {checklist.length === 0 && (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>No checklist generated yet.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "30px", marginBottom: "30px" }}>
        {/* Basic Info Panel */}
        <div>
          <div className="card primary-glow" style={{ height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "1.3rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <User size={20} style={{ color: "#a78bfa" }} />
                <span>Basic Details</span>
              </h2>
              {!editBasic ? (
                <button className="outline" onClick={() => setEditBasic(true)} style={{ padding: "6px 12px", fontSize: "0.8rem" }}>
                  <Edit3 size={12} />
                  <span>Edit</span>
                </button>
              ) : (
                <button className="outline" onClick={() => setEditBasic(false)} style={{ padding: "6px 12px", fontSize: "0.8rem", borderColor: "#f87171", color: "#f87171" }}>
                  <X size={12} />
                  <span>Cancel</span>
                </button>
              )}
            </div>

            {!editBasic ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--grad-primary)", display: "flex", alignItems: "center", justifyOrigin: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: "bold" }}>
                    {profile.full_name ? profile.full_name.substring(0,2).toUpperCase() : "??"}
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "700" }}>{profile.full_name || "Enter Name"}</h3>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "4px" }}>
                      <MapPin size={12} />
                      {profile.profile_json?.location || "Add Location"}
                    </p>
                  </div>
                </div>

                <hr style={{ borderColor: "var(--border-color)" }} />

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.95rem" }}>
                  <p style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)" }}>
                    <Mail size={16} />
                    <span>{profile.email || "Add Email"}</span>
                  </p>
                  <p style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)" }}>
                    <Phone size={16} />
                    <span>{profile.phone || "Add Phone"}</span>
                  </p>
                  <p style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)" }}>
                    <Globe size={16} />
                    {profile.profile_json?.website ? (
                      <a href={profile.profile_json.website} target="_blank" rel="noreferrer" style={{ color: "#22d3ee", textDecoration: "none" }}>
                        {profile.profile_json.website}
                      </a>
                    ) : (
                      <span>Add Portfolio Website</span>
                    )}
                  </p>
                  <p style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)" }}>
                    <Linkedin size={16} />
                    {profile.profile_json?.linkedin ? (
                      <a href={profile.profile_json.linkedin} target="_blank" rel="noreferrer" style={{ color: "#a78bfa", textDecoration: "none" }}>
                        LinkedIn Profile
                      </a>
                    ) : (
                      <span>Add LinkedIn Link</span>
                    )}
                  </p>
                  <p style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)" }}>
                    <Github size={16} />
                    {profile.profile_json?.github ? (
                      <a href={profile.profile_json.github} target="_blank" rel="noreferrer" style={{ color: "#ec4899", textDecoration: "none" }}>
                        GitHub Profile
                      </a>
                    ) : (
                      <span>Add GitHub Link</span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateBasic} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Full Name</label>
                <input 
                  value={basicForm.full_name} 
                  onChange={e => setBasicForm({ ...basicForm, full_name: e.target.value })}
                  placeholder="John Doe"
                />

                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Email Address</label>
                <input 
                  type="email"
                  value={basicForm.email} 
                  onChange={e => setBasicForm({ ...basicForm, email: e.target.value })}
                  placeholder="john@example.com"
                />

                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Phone Number</label>
                <input 
                  value={basicForm.phone} 
                  onChange={e => setBasicForm({ ...basicForm, phone: e.target.value })}
                  placeholder="+1 (555) 019-2834"
                />

                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Location</label>
                <input 
                  value={basicForm.location} 
                  onChange={e => setBasicForm({ ...basicForm, location: e.target.value })}
                  placeholder="San Francisco, CA"
                />

                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Portfolio Website</label>
                <input 
                  value={basicForm.website} 
                  onChange={e => setBasicForm({ ...basicForm, website: e.target.value })}
                  placeholder="https://myportfolio.dev"
                />

                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>LinkedIn URL</label>
                <input 
                  value={basicForm.linkedin} 
                  onChange={e => setBasicForm({ ...basicForm, linkedin: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                />

                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>GitHub URL</label>
                <input 
                  value={basicForm.github} 
                  onChange={e => setBasicForm({ ...basicForm, github: e.target.value })}
                  placeholder="https://github.com/username"
                />

                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Professional Summary</label>
                <textarea 
                  value={basicForm.summary} 
                  onChange={e => setBasicForm({ ...basicForm, summary: e.target.value })}
                  placeholder="Write a brief professional summary..."
                  rows={4}
                  style={{ width: "100%", background: "#0f1016", border: "2px solid var(--border-color)", color: "white", padding: "10px", borderRadius: "8px" }}
                />

                <button type="submit" className="primary" style={{ marginTop: "10px" }}>
                  <Save size={16} />
                  <span>Save Basic Details</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bio & Dashboard Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
          <div className="card secondary-glow" style={{ flex: "1" }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "12px", color: "#ffffff", fontWeight: 700 }}>
              Professional Summary
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: "1.6" }}>
              {profile.summary || "No professional summary added yet. Click edit in the basic details panel to add a biography."}
            </p>
          </div>

          {/* Stats Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            <div className="card" style={{ padding: "20px", textAlign: "center", marginBottom: "0" }}>
              <Code size={24} style={{ color: "#a78bfa", marginBottom: "8px", filter: "var(--shadow-icon)" }} />
              <h4 style={{ fontSize: "1.75rem" }}>{profile.skills?.length || 0}</h4>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Skills Listed</p>
            </div>
            <div className="card" style={{ padding: "20px", textAlign: "center", marginBottom: "0" }}>
              <FolderGit size={24} style={{ color: "#22d3ee", marginBottom: "8px", filter: "var(--shadow-icon)" }} />
              <h4 style={{ fontSize: "1.75rem" }}>{profile.projects?.length || 0}</h4>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Projects</p>
            </div>
            <div className="card" style={{ padding: "20px", textAlign: "center", marginBottom: "0" }}>
              <Briefcase size={24} style={{ color: "#ec4899", marginBottom: "8px", filter: "var(--shadow-icon)" }} />
              <h4 style={{ fontSize: "1.75rem" }}>{profile.experience?.length || 0}</h4>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Experience Logs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div className="card accent-glow" style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Code size={22} style={{ color: "#fbbf24" }} />
          <span>Technical Skills & Competencies</span>
        </h2>

        {/* Add Skill Form */}
        <form onSubmit={handleAddSkill} style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "2", minWidth: "200px" }}>
            <input 
              value={skillForm.skill_name}
              onChange={e => setSkillForm({ ...skillForm, skill_name: e.target.value })}
              placeholder="Skill name (e.g. React, Docker, Python)"
              style={{ marginBottom: "0" }}
            />
          </div>
          <div style={{ flex: "1", minWidth: "150px" }}>
            <select
              value={skillForm.category}
              onChange={e => setSkillForm({ ...skillForm, category: e.target.value })}
              style={{ marginBottom: "0" }}
            >
              <option value="Languages">Languages</option>
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="DevOps">DevOps</option>
              <option value="Database">Database</option>
              <option value="General">General/Other</option>
            </select>
          </div>
          <button type="submit" className="primary" style={{ padding: "12px 20px" }}>
            <Plus size={16} />
            <span>Add Skill</span>
          </button>
        </form>

        {/* Skills badge containers grouped by category */}
        {profile.skills?.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>No skills added to this profile yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {["Languages", "Frontend", "Backend", "DevOps", "Database", "General"].map(cat => {
              const catSkills = (profile.skills || []).filter(s => s.category === cat || (!s.category && cat === "General"));
              if (catSkills.length === 0) return null;
              return (
                <div key={cat}>
                  <h4 style={{ fontSize: "1rem", color: "var(--text-secondary)", marginBottom: "8px" }}>{cat}</h4>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {catSkills.map(skill => (
                      <span key={skill.id} className="badge" style={{ background: "rgba(139, 92, 246, 0.1)", color: "#a78bfa", borderColor: "rgba(139, 92, 246, 0.3)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span>{skill.skill_name}</span>
                        <Trash2 
                          size={12} 
                          className="badge-delete"
                          onClick={() => handleDeleteSkill(skill.id)} 
                        />
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Experience & Education Timelines */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginBottom: "30px" }}>
        {/* Work Experience */}
        <div className="card">
          <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Briefcase size={22} style={{ color: "#ec4899" }} />
            <span>Work Experience</span>
          </h2>

          <form onSubmit={handleAddExperience} style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <input 
                value={experienceForm.company}
                onChange={e => setExperienceForm({ ...experienceForm, company: e.target.value })}
                placeholder="Company Name"
              />
              <input 
                value={experienceForm.role}
                onChange={e => setExperienceForm({ ...experienceForm, role: e.target.value })}
                placeholder="Job Role / Title"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <input 
                value={experienceForm.start_date}
                onChange={e => setExperienceForm({ ...experienceForm, start_date: e.target.value })}
                placeholder="Start Date (e.g. Jan 2023)"
              />
              <input 
                value={experienceForm.end_date}
                onChange={e => setExperienceForm({ ...experienceForm, end_date: e.target.value })}
                placeholder="End Date (e.g. Present)"
              />
            </div>
            <textarea 
              value={experienceForm.description}
              onChange={e => setExperienceForm({ ...experienceForm, description: e.target.value })}
              placeholder="Describe your achievements and duties..."
              rows={2}
              style={{ width: "100%", background: "#0f1016", border: "2px solid var(--border-color)", color: "white", padding: "10px", borderRadius: "8px" }}
            />
            <button type="submit" className="primary" style={{ marginTop: "6px" }}>
              <Plus size={16} />
              <span>Add Experience Entry</span>
            </button>
          </form>

          {profile.experience?.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No experience details added yet.</p>
          ) : (
            <div className="timeline">
              {profile.experience.map(exp => (
                <div key={exp.id} className="timeline-item">
                  <div className="timeline-header">
                    <div>
                      <h4 className="timeline-title">{exp.role}</h4>
                      <p className="timeline-subtitle">{exp.company}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className="timeline-date">{exp.start_date} - {exp.end_date}</span>
                      <Trash2 
                        size={14} 
                        style={{ color: "#ef4444", cursor: "pointer" }}
                        onClick={() => handleDeleteExperience(exp.id)} 
                      />
                    </div>
                  </div>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>{exp.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Education History */}
        <div className="card">
          <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <GraduationCap size={22} style={{ color: "#22d3ee" }} />
            <span>Education</span>
          </h2>

          <form onSubmit={handleAddEducation} style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <input 
                value={educationForm.school}
                onChange={e => setEducationForm({ ...educationForm, school: e.target.value })}
                placeholder="School / University"
              />
              <input 
                value={educationForm.degree}
                onChange={e => setEducationForm({ ...educationForm, degree: e.target.value })}
                placeholder="Degree / Major"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <input 
                value={educationForm.start_date}
                onChange={e => setEducationForm({ ...educationForm, start_date: e.target.value })}
                placeholder="Start Date (e.g. 2019)"
              />
              <input 
                value={educationForm.end_date}
                onChange={e => setEducationForm({ ...educationForm, end_date: e.target.value })}
                placeholder="End Date (e.g. 2023)"
              />
            </div>
            <button type="submit" className="primary" style={{ marginTop: "6px" }}>
              <Plus size={16} />
              <span>Add Education Entry</span>
            </button>
          </form>

          {(!profile.profile_json?.education || profile.profile_json.education.length === 0) ? (
            <p style={{ color: "var(--text-muted)" }}>No education details added yet.</p>
          ) : (
            <div className="timeline">
              {profile.profile_json.education.map((edu, idx) => (
                <div key={edu.id ?? `${edu.school}-${edu.degree}-${idx}`} className="timeline-item">
                  <div className="timeline-header">
                    <div>
                      <h4 className="timeline-title">{edu.degree}</h4>
                      <p className="timeline-subtitle">{edu.school}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className="timeline-date">{edu.start_date} - {edu.end_date}</span>
                      <Trash2 
                        size={14} 
                        style={{ color: "#ef4444", cursor: "pointer" }}
                        onClick={() => handleDeleteEducation(edu.id)} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="card">
        <h2 style={{ fontSize: "1.5rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <FolderGit size={22} style={{ color: "#ec4899" }} />
          <span>Projects & Works</span>
        </h2>

        {/* Add Project Form */}
        <form onSubmit={handleAddProject} style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input 
              value={projectForm.title}
              onChange={e => setProjectForm({ ...projectForm, title: e.target.value })}
              placeholder="Project Name / Title"
            />
            <input 
              value={projectForm.tech_stack}
              onChange={e => setProjectForm({ ...projectForm, tech_stack: e.target.value })}
              placeholder="Tech Stack (comma-separated, e.g. React, Node.js, Postgres)"
            />
          </div>
          <textarea 
            value={projectForm.description}
            onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
            placeholder="Brief project description, key deliverables, and GitHub repository details..."
            rows={2}
            style={{ width: "100%", background: "#0f1016", border: "2px solid var(--border-color)", color: "white", padding: "10px", borderRadius: "8px" }}
          />
          <button type="submit" className="primary" style={{ marginTop: "6px" }}>
            <Plus size={16} />
            <span>Publish Project Card</span>
          </button>
        </form>

        {profile.projects?.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>No projects published to this dashboard yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
            {profile.projects.map(proj => (
              <div key={proj.id} className="card secondary-glow" style={{ marginBottom: "0", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <h3 style={{ fontSize: "1.15rem", fontWeight: "700" }}>{proj.title}</h3>
                    <Trash2 
                      size={16} 
                      style={{ color: "#ef4444", cursor: "pointer", opacity: 0.7 }}
                      className="badge-delete"
                      onClick={() => handleDeleteProject(proj.id)} 
                    />
                  </div>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "16px", minHeight: "50px" }}>
                    {proj.description}
                  </p>
                </div>
                <div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {(proj.tech_stack || []).map((tech, idx) => (
                      <span key={idx} className="badge" style={{ background: "rgba(6, 182, 212, 0.05)", color: "#22d3ee", borderColor: "rgba(6, 182, 212, 0.15)", fontSize: "0.75rem", padding: "4px 8px" }}>
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── AI Project Recommendations ── */}
      <div className="card" id="ai-project-suggestions">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "10px",
            background: "var(--grad-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "var(--shadow-primary)", flexShrink: 0,
          }}>
            <Sparkles size={20} style={{ color: "white" }} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
              AI Project Suggestions
              <span style={{
                background: "var(--grad-primary)", color: "white",
                borderRadius: "9999px", padding: "2px 10px",
                fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em",
              }}>AI</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "2px" }}>
              Gemini-generated project ideas based on your skill gap — build these to close gaps and strengthen your portfolio.
            </p>
          </div>
        </div>

        {projectRecs === null && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)",
                borderRadius: "10px", padding: "20px",
                animation: "shimmer 1.5s ease-in-out infinite alternate",
              }}>
                <div style={{ height: "14px", background: "rgba(255,255,255,0.06)", borderRadius: "6px", marginBottom: "10px", width: "70%" }} />
                <div style={{ height: "10px", background: "rgba(255,255,255,0.04)", borderRadius: "6px", marginBottom: "6px" }} />
                <div style={{ height: "10px", background: "rgba(255,255,255,0.04)", borderRadius: "6px", width: "85%" }} />
              </div>
            ))}
          </div>
        )}

        {projectRecsError && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>{projectRecsError}</p>
        )}

        {projectRecs !== null && projectRecs.length === 0 && !projectRecsError && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
            No suggestions yet — make sure your resume is uploaded and job listings are saved so Gemini can tailor project ideas to your gaps.
          </p>
        )}

        {projectRecs?.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {projectRecs.map((proj, idx) => {
              const isExpanded = expandedRec === idx;
              const diffColor = proj.difficulty === "Beginner" ? "#22c55e"
                : proj.difficulty === "Advanced" ? "#ef4444" : "#f59e0b";
              const diffBg = proj.difficulty === "Beginner" ? "rgba(34,197,94,0.1)"
                : proj.difficulty === "Advanced" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)";
              const diffBorder = proj.difficulty === "Beginner" ? "rgba(34,197,94,0.25)"
                : proj.difficulty === "Advanced" ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)";
              return (
                <div
                  key={idx}
                  style={{
                    background: "var(--bg-card)", border: "1px solid var(--border-color)",
                    borderLeft: `4px solid ${diffColor}`, borderRadius: "10px",
                    padding: "20px", display: "flex", flexDirection: "column", gap: "12px",
                    transition: "all 0.22s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = diffColor; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.borderLeftColor = diffColor; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div>
                    <h3 style={{ fontSize: "0.97rem", fontWeight: 700, lineHeight: "1.35", marginBottom: "8px", color: "white" }}>
                      {proj.title}
                    </h3>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: diffBg, color: diffColor, border: `1px solid ${diffBorder}`, borderRadius: "9999px", padding: "2px 9px", fontSize: "0.72rem", fontWeight: 700 }}>
                        {proj.difficulty}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(6,182,212,0.08)", color: "#22d3ee", border: "1px solid rgba(6,182,212,0.2)", borderRadius: "9999px", padding: "2px 9px", fontSize: "0.72rem", fontWeight: 600 }}>
                        ⏱ {proj.estimated_time}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                    {(proj.skills_practiced || []).map((sk, i) => (
                      <span key={i} style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "9999px", padding: "2px 9px", fontSize: "0.73rem", fontWeight: 500 }}>
                        {sk}
                      </span>
                    ))}
                  </div>
                  <button
                    id={`proj-rec-expand-${idx}`}
                    onClick={() => setExpandedRec(isExpanded ? null : idx)}
                    style={{ display: "flex", alignItems: "center", gap: "5px", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.8rem", fontWeight: 600, padding: "0", transition: "color 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "white"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? "Hide details" : "View details"}
                  </button>
                  {isExpanded && (
                    <div style={{ background: "#0f1016", borderRadius: "8px", padding: "14px", animation: "fadeIn 0.2s ease" }}>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "12px" }}>
                        {proj.description}
                      </p>
                      {proj.tech_stack?.length > 0 && (
                        <div>
                          <p style={{ fontSize: "0.73rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px", fontWeight: 600 }}>Suggested Tech Stack</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                            {proj.tech_stack.map((tech, i) => (
                              <span key={i} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: "5px", padding: "3px 8px", fontSize: "0.75rem", fontFamily: "monospace" }}>
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        id={`proj-rec-add-${idx}`}
                        onClick={() => {
                          setProjectForm({ title: proj.title, description: proj.description || "", tech_stack: (proj.tech_stack || []).join(", ") });
                          document.getElementById("my-projects-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className="primary"
                        style={{ marginTop: "12px", width: "100%", padding: "10px" }}
                      >
                        <Plus size={14} />
                        <span>Use as template</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer { from { opacity: 0.5; } to { opacity: 1; } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
