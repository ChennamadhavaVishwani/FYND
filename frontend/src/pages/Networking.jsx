import { useState, useEffect } from "react";
import {
  Users, Send, Copy, CheckCircle, Mail, MessageSquare,
  ExternalLink, Sparkles, Building2, Search, Briefcase,
  UserCheck, ArrowUpRight, HelpCircle, Check, Loader2,
  RefreshCw, BookmarkPlus, Clock, ChevronRight, AlertCircle
} from "lucide-react";

import { listApplications } from "../api/applications";
import { searchJobs } from "../api/jobs";
import { getCompanyPersonas, generateOutreach } from "../api/networking";

export default function Networking() {
  // Target Selection state
  const [targetCompany, setTargetCompany] = useState("Stripe");
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [recentCompanies, setRecentCompanies] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);

  // Personas state
  const [personas, setPersonas] = useState([]);
  const [loadingPersonas, setLoadingPersonas] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState("recruiter");

  // Composer Form state
  const [recipientName, setRecipientName] = useState("Hiring Team");
  const [channel, setChannel] = useState("linkedin_note"); // "linkedin_note" | "cold_email" | "referral_request" | "follow_up"
  const [tone, setTone] = useState("direct"); // "direct" | "technical" | "enthusiastic"
  const [customNote, setCustomNote] = useState("");

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState(null);
  const [genError, setGenError] = useState(null);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);

  // Outreach Log (persisted in localStorage for active session)
  const [outreachLog, setOutreachLog] = useState(() => {
    try {
      const saved = localStorage.getItem("fynd_networking_log");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 1. Fetch real companies from Application Tracker and Recommended Jobs
  useEffect(() => {
    async function loadCompanySources() {
      try {
        const [appsRes, jobsRes] = await Promise.allSettled([
          listApplications(),
          searchJobs({ limit: 10 }),
        ]);

        const uniqueCompanies = new Map();

        if (appsRes.status === "fulfilled" && Array.isArray(appsRes.value)) {
          appsRes.value.forEach(app => {
            if (app.company_name) {
              uniqueCompanies.set(app.company_name, {
                company: app.company_name,
                role: app.job_title || "Software Engineer",
                source: "Tracked Application"
              });
            }
          });
        }

        if (jobsRes.status === "fulfilled" && jobsRes.value?.jobs) {
          jobsRes.value.jobs.forEach(j => {
            if (j.company && !uniqueCompanies.has(j.company)) {
              uniqueCompanies.set(j.company, {
                company: j.company,
                role: j.title || "Software Engineer",
                source: "Recommended Job"
              });
            }
          });
        }

        const list = Array.from(uniqueCompanies.values());
        if (list.length > 0) {
          setRecentCompanies(list);
          setTargetCompany(list[0].company);
          setTargetRole(list[0].role);
        } else {
          setRecentCompanies([
            { company: "Stripe", role: "Backend Engineer", source: "Example" },
            { company: "Supabase", role: "Fullstack Developer", source: "Example" },
            { company: "Vercel", role: "Frontend Engineer", source: "Example" }
          ]);
        }
      } catch (err) {
        console.error("Error loading networking sources:", err);
      } finally {
        setLoadingSources(false);
      }
    }
    loadCompanySources();
  }, []);

  // 2. Fetch personas whenever targetCompany / targetRole changes
  useEffect(() => {
    if (!targetCompany) return;
    async function fetchPersonas() {
      setLoadingPersonas(true);
      try {
        const res = await getCompanyPersonas({
          company: targetCompany,
          role_title: targetRole,
        });
        if (res?.personas) {
          setPersonas(res.personas);
        }
      } catch (err) {
        console.error("Error fetching personas:", err);
      } finally {
        setLoadingPersonas(false);
      }
    }
    fetchPersonas();
  }, [targetCompany, targetRole]);

  // Handle AI generation
  const handleGenerate = async () => {
    if (!targetCompany.trim() || !targetRole.trim()) return;
    setGenerating(true);
    setGenError(null);
    try {
      const data = await generateOutreach({
        company: targetCompany,
        role_title: targetRole,
        recipient_name: recipientName || "Hiring Team",
        persona_type: selectedPersona,
        channel,
        tone,
        custom_note: customNote,
      });
      setGeneratedMessage(data);
    } catch (err) {
      setGenError(err.message || "Failed to generate outreach message.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyBody = () => {
    if (!generatedMessage?.message_body) return;
    navigator.clipboard.writeText(generatedMessage.message_body);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const handleCopySubject = () => {
    if (!generatedMessage?.subject_line) return;
    navigator.clipboard.writeText(generatedMessage.subject_line);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  const handleSaveToLog = () => {
    if (!generatedMessage) return;
    const newEntry = {
      id: Date.now().toString(),
      company: targetCompany,
      role: targetRole,
      recipient: recipientName,
      persona: selectedPersona,
      channel,
      date: new Date().toISOString().split("T")[0],
      status: "Sent",
    };
    const updated = [newEntry, ...outreachLog.slice(0, 19)];
    setOutreachLog(updated);
    localStorage.setItem("fynd_networking_log", JSON.stringify(updated));
  };

  const handleDeleteLogItem = (id) => {
    const updated = outreachLog.filter(item => item.id !== id);
    setOutreachLog(updated);
    localStorage.setItem("fynd_networking_log", JSON.stringify(updated));
  };

  return (
    <div style={{ maxWidth: "1150px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{
            background: "rgba(59, 130, 246, 0.12)", color: "#60a5fa",
            border: "1px solid rgba(59, 130, 246, 0.25)",
            padding: "4px 12px", borderRadius: "20px", fontSize: "0.78rem", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", gap: "6px"
          }}>
            <Users size={13} /> Strategic Network &amp; Referral Engine
          </span>
        </div>
        <h1 style={{ fontSize: "2.3rem", color: "#ffffff", fontWeight: 800, letterSpacing: "-0.02em" }}>
          Target Discovery &amp; Outreach Hub
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: "780px", marginTop: "4px" }}>
          Discover real recruiters and engineering decision-makers on LinkedIn for companies you're targeting, then generate hyper-personalized, high-converting outreach pitches tailored to your resume.
        </p>
      </div>

      {/* Target Company & Role Selection Bar */}
      <div className="card" style={{ padding: "22px 26px", marginBottom: "24px", background: "rgba(17, 24, 39, 0.7)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Building2 size={18} style={{ color: "#3b82f6" }} />
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "white" }}>Target Company &amp; Role</span>
          </div>

          {/* Quick Switcher Tags from User's Applications & Recommended Jobs */}
          {recentCompanies.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Your Targets:</span>
              {recentCompanies.slice(0, 5).map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="outline"
                  onClick={() => {
                    setTargetCompany(item.company);
                    setTargetRole(item.role);
                  }}
                  style={{
                    padding: "4px 10px", fontSize: "0.75rem",
                    borderColor: targetCompany.toLowerCase() === item.company.toLowerCase() ? "#3b82f6" : "var(--border-color)",
                    color: targetCompany.toLowerCase() === item.company.toLowerCase() ? "#60a5fa" : "var(--text-secondary)",
                    background: targetCompany.toLowerCase() === item.company.toLowerCase() ? "rgba(59, 130, 246, 0.12)" : "transparent"
                  }}
                >
                  {item.company}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
              Target Company Name
            </label>
            <input
              type="text"
              placeholder="e.g. Stripe, Figma, Datadog"
              value={targetCompany}
              onChange={e => setTargetCompany(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
              Target Role / Title
            </label>
            <input
              type="text"
              placeholder="e.g. Senior Frontend Engineer, Fullstack Developer"
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Left (Persona Discovery) & Right (AI Composer) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.2fr", gap: "24px" }}>
        
        {/* ── LEFT COLUMN: Persona Discovery & Live LinkedIn Search ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "white" }}>
              Target Personas at {targetCompany || "Company"}
            </h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Find on LinkedIn
            </span>
          </div>

          {loadingPersonas ? (
            <div className="card" style={{ padding: "40px", textAlign: "center" }}>
              <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#3b82f6", margin: "0 auto 10px auto" }} />
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Finding best outreach channels...</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {personas.map((p) => {
                const isSelected = selectedPersona === p.id;
                return (
                  <div
                    key={p.id}
                    className="card"
                    style={{
                      padding: "18px 20px", marginBottom: "0", cursor: "pointer",
                      border: isSelected ? "1px solid #3b82f6" : "1px solid var(--border-color)",
                      background: isSelected ? "rgba(59, 130, 246, 0.06)" : "var(--bg-card)",
                      transition: "all 0.2s"
                    }}
                    onClick={() => {
                      setSelectedPersona(p.id);
                      if (p.id === "recruiter") setRecipientName("Technical Recruiter");
                      else if (p.id === "hiring_manager") setRecipientName("Engineering Manager");
                      else if (p.id === "peer_engineer") setRecipientName("Team Lead / Engineer");
                      else setRecipientName("Alumni / Fellow Engineer");
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <h4 style={{ fontSize: "0.98rem", fontWeight: 700, color: isSelected ? "#ffffff" : "#f1f5f9" }}>
                            {p.title}
                          </h4>
                          {isSelected && (
                            <span style={{
                              background: "#3b82f6", color: "white", padding: "1px 6px", borderRadius: "10px",
                              fontSize: "0.68rem", fontWeight: 700
                            }}>
                              Selected
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "0.76rem", color: "#10b981", fontWeight: 600, display: "inline-block", marginTop: "2px" }}>
                          Est. Response Rate: {p.response_rate}
                        </span>
                      </div>

                      {/* 1-Click Live LinkedIn Search URL */}
                      <a
                        href={p.linkedin_search_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "5px",
                          padding: "6px 12px", borderRadius: "6px",
                          background: "rgba(10, 102, 194, 0.15)",
                          border: "1px solid rgba(10, 102, 194, 0.4)",
                          color: "#38bdf8", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none"
                        }}
                      >
                        <span>Search LinkedIn</span>
                        <ArrowUpRight size={13} />
                      </a>
                    </div>

                    <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.4", marginBottom: "10px" }}>
                      {p.description}
                    </p>

                    <div style={{
                      background: "rgba(0, 0, 0, 0.2)", borderRadius: "6px",
                      padding: "8px 12px", fontSize: "0.78rem", color: "#94a3b8"
                    }}>
                      💡 <strong style={{ color: "#e2e8f0" }}>Strategy:</strong> {p.best_approach}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: AI Outreach Composer ── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "white" }}>
              AI Outreach Pitch Generator
            </h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Powered by Resume Context
            </span>
          </div>

          <div className="card primary-glow" style={{ padding: "24px" }}>
            
            {/* Form Settings */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "4px" }}>
                  Recipient Name (from LinkedIn)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins or Hiring Lead"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  style={{ marginBottom: 0, padding: "9px 12px", fontSize: "0.88rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "4px" }}>
                  Outreach Tone
                </label>
                <select
                  value={tone}
                  onChange={e => setTone(e.target.value)}
                  style={{ marginBottom: 0, padding: "9px 12px", fontSize: "0.88rem" }}
                >
                  <option value="direct">Direct &amp; Professional</option>
                  <option value="technical">Technical Peer (Stack-focused)</option>
                  <option value="enthusiastic">Enthusiastic &amp; Value-Driven</option>
                </select>
              </div>
            </div>

            {/* Channel Tabs */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "6px" }}>
                Outreach Format / Channel
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                <button
                  type="button"
                  className={channel === "linkedin_note" ? "primary" : "outline"}
                  onClick={() => setChannel("linkedin_note")}
                  style={{ padding: "7px 4px", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "2px" }}
                >
                  <span>LinkedIn Note</span>
                  <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>≤280 chars</span>
                </button>
                <button
                  type="button"
                  className={channel === "cold_email" ? "primary" : "outline"}
                  onClick={() => setChannel("cold_email")}
                  style={{ padding: "7px 4px", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "2px" }}
                >
                  <span>Cold Email</span>
                  <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>With Subject</span>
                </button>
                <button
                  type="button"
                  className={channel === "referral_request" ? "primary" : "outline"}
                  onClick={() => setChannel("referral_request")}
                  style={{ padding: "7px 4px", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "2px" }}
                >
                  <span>Referral Ask</span>
                  <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>Peer &amp; Alumni</span>
                </button>
                <button
                  type="button"
                  className={channel === "follow_up" ? "primary" : "outline"}
                  onClick={() => setChannel("follow_up")}
                  style={{ padding: "7px 4px", fontSize: "0.75rem", display: "flex", flexDirection: "column", gap: "2px" }}
                >
                  <span>Post-Apply</span>
                  <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>Follow-up</span>
                </button>
              </div>
            </div>

            {/* Optional Custom Hook / Context */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600, marginBottom: "4px" }}>
                Optional Personal Hook (e.g. "We both studied at UC Berkeley", "Loved your blog post on GraphQL")
              </label>
              <input
                type="text"
                placeholder="Add a unique touchpoint..."
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                style={{ marginBottom: 0, padding: "9px 12px", fontSize: "0.85rem" }}
              />
            </div>

            {/* Generate Action Button */}
            <button
              className="primary"
              onClick={handleGenerate}
              disabled={generating || !targetCompany.trim()}
              style={{ width: "100%", padding: "11px 20px", fontSize: "0.9rem", marginBottom: "16px" }}
            >
              {generating ? (
                <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Generating Tailored Pitch...</>
              ) : (
                <><Sparkles size={15} /> Generate Pitch with Resume Credentials</>
              )}
            </button>

            {genError && (
              <div style={{ color: "#ef4444", fontSize: "0.82rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <AlertCircle size={14} /> {genError}
              </div>
            )}

            {/* Generated Output Card */}
            {generatedMessage && (
              <div style={{
                background: "#0b0f19", border: "1px solid var(--border-color)",
                borderRadius: "8px", padding: "18px", position: "relative"
              }}>
                {/* Subject Line if email */}
                {generatedMessage.subject_line && (
                  <div style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                        Subject Line
                      </span>
                      <button
                        className="outline"
                        onClick={handleCopySubject}
                        style={{ padding: "3px 8px", fontSize: "0.72rem", height: "auto" }}
                      >
                        {copiedSubject ? <><Check size={11} style={{ color: "#10b981" }} /> Copied</> : <><Copy size={11} /> Copy</>}
                      </button>
                    </div>
                    <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "white" }}>
                      {generatedMessage.subject_line}
                    </p>
                  </div>
                )}

                {/* Body Header & Character Counter */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    Message Body
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{
                      fontSize: "0.75rem",
                      color: channel === "linkedin_note" && generatedMessage.character_count > 280 ? "#ef4444" : "var(--text-muted)"
                    }}>
                      {generatedMessage.character_count} chars
                    </span>
                    <button
                      className="outline"
                      onClick={handleCopyBody}
                      style={{ padding: "4px 10px", fontSize: "0.75rem", height: "auto", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      {copiedBody ? <><Check size={12} style={{ color: "#10b981" }} /> Copied Message</> : <><Copy size={12} /> Copy Message</>}
                    </button>
                  </div>
                </div>

                {/* Body Text */}
                <textarea
                  readOnly
                  rows={channel === "linkedin_note" ? 4 : 8}
                  value={generatedMessage.message_body}
                  style={{
                    fontFamily: "Inter, sans-serif", fontSize: "0.88rem",
                    lineHeight: "1.5", resize: "vertical", marginBottom: "12px",
                    background: "rgba(255, 255, 255, 0.02)"
                  }}
                />

                {/* Save to log button */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
                  <button
                    className="outline"
                    onClick={handleSaveToLog}
                    style={{ padding: "5px 12px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <BookmarkPlus size={13} />
                    <span>Log to Outreach Tracker</span>
                  </button>
                </div>

                {/* Pro Tips Footer */}
                {generatedMessage.pro_tips?.length > 0 && (
                  <div style={{
                    background: "rgba(59, 130, 246, 0.06)", border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "6px", padding: "10px 14px", fontSize: "0.78rem"
                  }}>
                    <div style={{ color: "#60a5fa", fontWeight: 700, marginBottom: "4px" }}>
                      💡 Outreach Tactical Advice:
                    </div>
                    {generatedMessage.pro_tips.map((tip, i) => (
                      <p key={i} style={{ color: "var(--text-secondary)", lineHeight: "1.4" }}>
                        • {tip}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM SECTION: Outreach Tracker Log ── */}
      {outreachLog.length > 0 && (
        <div className="card" style={{ marginTop: "30px", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={18} style={{ color: "#3b82f6" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "white" }}>
                Outreach Tracker ({outreachLog.length} logged)
              </h3>
            </div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Saved in your browser session
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Target Company</th>
                  <th>Role</th>
                  <th>Recipient / Persona</th>
                  <th>Channel</th>
                  <th>Date Logged</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {outreachLog.map((log) => (
                  <tr key={log.id}>
                    <td><strong style={{ color: "white" }}>{log.company}</strong></td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>{log.role}</td>
                    <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                      {log.recipient} ({log.persona})
                    </td>
                    <td>
                      <span className="badge" style={{ padding: "3px 8px", fontSize: "0.72rem" }}>
                        {log.channel.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{log.date}</td>
                    <td>
                      <span style={{
                        color: "#10b981", background: "rgba(16, 185, 129, 0.1)",
                        padding: "3px 8px", borderRadius: "12px", fontSize: "0.72rem", fontWeight: 600
                      }}>
                        {log.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="outline"
                        onClick={() => handleDeleteLogItem(log.id)}
                        style={{ padding: "2px 8px", fontSize: "0.7rem", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}