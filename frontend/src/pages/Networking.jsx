import { useState } from "react";
import { Users, Send, Copy, CheckCircle, Mail, MessageSquare } from "lucide-react";

export default function Networking() {
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("referral");
  const [recruiterName, setRecruiterName] = useState("Sarah Jenkins");
  const [company, setCompany] = useState("Supabase");
  const [position, setPosition] = useState("Software Engineer");

  const mockConnections = [
    {
      name: "Sarah Jenkins",
      role: "Technical Recruiting Lead",
      company: "Supabase",
      avatar: "SJ",
      matchedReason: "Hiring for Frontend & Fullstack React Developers"
    },
    {
      name: "David Chen",
      role: "Staff Engineer (Platform)",
      company: "Stripe",
      avatar: "DC",
      matchedReason: "Common tech stack overlap (Python, Postgres, FastAPI)"
    },
    {
      name: "Elena Rostova",
      role: "Engineering Manager",
      company: "Google",
      avatar: "ER",
      matchedReason: "Former university alumni or shared open-source contributions"
    }
  ];

  const templates = {
    referral: `Hi \${name},

I hope you're having a great week. 

I noticed that \${company} is looking for a \${position}. Given my background in React, Python, and system design, I believe my skills match this role well. I recently built a fullstack application implementing complex search optimization models that I think aligns with the work your team handles.

Would you be open to a quick chat next week to see if I might be a good fit, or could you possibly point me toward the hiring manager? 

Best regards,
[Your Name]`,
    info: `Hi \${name},

I hope this message finds you well. 

I've been following the engineering blog at \${company} and was particularly impressed by your team's recent articles on scaling real-time WebSocket pipelines. As a \${position} myself, I'm very interested in building database-driven scalable systems.

Would you be open to a 10-minute informational coffee chat next week? I'd love to learn more about your career path and the engineering culture on your team.

Thanks for your time,
[Your Name]`
  };

  const currentTemplateText = templates[selectedTemplate]
    .replace("${name}", recruiterName)
    .replace("${company}", company)
    .replace("${position}", position);

  function handleCopy() {
    navigator.clipboard.writeText(currentTemplateText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "2.5rem", background: "var(--grad-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "flex", alignItems: "center", gap: "10px" }}>
          <Users size={32} style={{ color: "#06b6d4" }} />
          <span>Networking Hub</span>
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Reach out to targeted connections at companies you are matching with, and generate premium outreach templates.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "30px" }}>
        {/* Left: Recommended Connections */}
        <div>
          <h2 style={{ fontSize: "1.35rem", marginBottom: "20px" }}>Recommended Contacts</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {mockConnections.map((conn, idx) => (
              <div 
                key={idx} 
                className="card secondary-glow" 
                style={{ 
                  display: "flex", 
                  gap: "16px", 
                  alignItems: "center", 
                  marginBottom: "0", 
                  cursor: "pointer",
                  border: recruiterName === conn.name ? "2px solid #8b5cf6" : "2px solid var(--border-color)"
                }}
                onClick={() => {
                  setRecruiterName(conn.name);
                  setCompany(conn.company);
                }}
              >
                <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--grad-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1rem", color: "white", flexShrink: 0 }}>
                  {conn.avatar}
                </div>
                <div>
                  <h4 style={{ fontSize: "1.05rem", fontWeight: "700" }}>{conn.name}</h4>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                    {conn.role} <span style={{ color: "#a78bfa" }}>@ {conn.company}</span>
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "6px" }}>
                    {conn.matchedReason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Template Generator */}
        <div>
          <h2 style={{ fontSize: "1.35rem", marginBottom: "20px" }}>Outreach Composer</h2>
          <div className="card primary-glow" style={{ height: "100%" }}>
            {/* Input Variables */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Name</label>
                <input 
                  value={recruiterName} 
                  onChange={(e) => setRecruiterName(e.target.value)} 
                  style={{ marginBottom: "0", padding: "8px 12px", fontSize: "0.9rem" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Company</label>
                <input 
                  value={company} 
                  onChange={(e) => setCompany(e.target.value)} 
                  style={{ marginBottom: "0", padding: "8px 12px", fontSize: "0.9rem" }}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Target Position</label>
              <input 
                value={position} 
                onChange={(e) => setPosition(e.target.value)} 
                style={{ marginBottom: "0", padding: "8px 12px", fontSize: "0.9rem" }}
              />
            </div>

            {/* Template Selector */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
              <button 
                className={selectedTemplate === "referral" ? "primary" : "outline"}
                onClick={() => setSelectedTemplate("referral")}
                style={{ flex: 1, padding: "8px 12px", fontSize: "0.8rem" }}
              >
                <Send size={12} />
                <span>Referral Request</span>
              </button>
              <button 
                className={selectedTemplate === "info" ? "secondary" : "outline"}
                onClick={() => setSelectedTemplate("info")}
                style={{ flex: 1, padding: "8px 12px", fontSize: "0.8rem" }}
              >
                <MessageSquare size={12} />
                <span>Informational Coffee</span>
              </button>
            </div>

            {/* Output Text area */}
            <div style={{ position: "relative" }}>
              <textarea 
                value={currentTemplateText}
                readOnly
                rows={10}
                style={{ width: "100%", background: "#0f1016", border: "2px solid var(--border-color)", color: "white", padding: "16px", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.85rem", resize: "none" }}
              />
              <button 
                onClick={handleCopy}
                className="outline" 
                style={{ position: "absolute", right: "12px", bottom: "24px", padding: "6px 12px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {copied ? <CheckCircle size={12} style={{ color: "#34d399" }} /> : <Copy size={12} />}
                <span>{copied ? "Copied!" : "Copy message"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}