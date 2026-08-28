import { useState } from "react";
import {
  BookOpen, Sparkles, AlertCircle, Play, HelpCircle, CheckCircle,
  ExternalLink, Code2, Layers, Users, Video, Globe, Clock,
  Gift, DollarSign, Mic, Brain, ChevronDown, ChevronUp, Cpu, Star
} from "lucide-react";
import { getInterviewFeedback } from "../api/interview";

// ─────────────────────────────────────────────────────────────────────────────
// Curated Interview Prep Resources (static — no API call needed)
// ─────────────────────────────────────────────────────────────────────────────

const RESOURCE_CATEGORIES = [
  {
    id: "dsa",
    label: "DSA & Coding",
    icon: Code2,
    color: "#a78bfa",
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.2)",
    resources: [
      {
        title: "LeetCode – Coding Practice",
        url: "https://leetcode.com/",
        platform: "LeetCode",
        type: "interactive",
        duration: "Self-paced",
        is_free: true,
        description: "The gold standard for coding interviews. 3000+ problems with company tags.",
      },
      {
        title: "NeetCode 150 – Structured Roadmap",
        url: "https://neetcode.io/roadmap",
        platform: "NeetCode",
        type: "interactive",
        duration: "Self-paced",
        is_free: true,
        description: "Curated 150 problems covering every major pattern. Ideal for systematic prep.",
      },
      {
        title: "HackerRank Interview Preparation Kit",
        url: "https://www.hackerrank.com/interview/preparation-kits",
        platform: "HackerRank",
        type: "interactive",
        duration: "Self-paced",
        is_free: true,
        description: "Structured kits by topic: arrays, strings, trees, graphs, and more.",
      },
      {
        title: "AlgoExpert – 160 Curated Questions",
        url: "https://www.algoexpert.io/",
        platform: "AlgoExpert",
        type: "course",
        duration: "Self-paced",
        is_free: false,
        description: "Premium platform with video explanations and space/time complexity breakdowns.",
      },
    ],
  },
  {
    id: "sysdesign",
    label: "System Design",
    icon: Layers,
    color: "#22d3ee",
    bg: "rgba(34,211,238,0.08)",
    border: "rgba(34,211,238,0.2)",
    resources: [
      {
        title: "System Design Primer – GitHub",
        url: "https://github.com/donnemartin/system-design-primer",
        platform: "GitHub",
        type: "article",
        duration: "Self-paced",
        is_free: true,
        description: "50k+ star open-source resource covering scalability, databases, caching, and patterns.",
      },
      {
        title: "ByteByteGo – System Design Newsletter",
        url: "https://bytebytego.com/",
        platform: "ByteByteGo",
        type: "article",
        duration: "Self-paced",
        is_free: false,
        description: "Visual, diagram-heavy system design content by Alex Xu (author of System Design Interview).",
      },
      {
        title: "Grokking System Design Interview – Educative",
        url: "https://www.educative.io/courses/grokking-modern-system-design-interview-for-engineers-managers",
        platform: "Educative",
        type: "course",
        duration: "Self-paced",
        is_free: false,
        description: "The most popular system design course. Covers URL shortener, Netflix, Uber, etc.",
      },
      {
        title: "System Design YouTube Playlist – Gaurav Sen",
        url: "https://www.youtube.com/playlist?list=PLMCXHnjXnTnvo6alSjVkgxV-VH6EPyvoX",
        platform: "YouTube",
        type: "video",
        duration: "20+ hours",
        is_free: true,
        description: "In-depth free system design breakdowns: consistent hashing, rate limiting, messaging queues.",
      },
    ],
  },
  {
    id: "behavioral",
    label: "Behavioral & Soft Skills",
    icon: Users,
    color: "#34d399",
    bg: "rgba(52,211,153,0.08)",
    border: "rgba(52,211,153,0.2)",
    resources: [
      {
        title: "STAR Method Behavioral Question Bank",
        url: "https://www.themuse.com/advice/star-interview-method",
        platform: "The Muse",
        type: "article",
        duration: "30 min",
        is_free: true,
        description: "Master the Situation-Task-Action-Result framework with 40+ example questions.",
      },
      {
        title: "Amazon Leadership Principles Guide",
        url: "https://www.amazon.jobs/content/en/our-workplace/leadership-principles",
        platform: "Amazon",
        type: "article",
        duration: "1 hour",
        is_free: true,
        description: "The 16 leadership principles used in Amazon behavioral interviews — with prep strategy.",
      },
      {
        title: "TedTalk: How to Speak So People Listen",
        url: "https://www.youtube.com/watch?v=eIho2S0ZahI",
        platform: "YouTube / TED",
        type: "video",
        duration: "10 min",
        is_free: true,
        description: "Communication skills talk that directly applies to interview confidence and structure.",
      },
      {
        title: "Interviewing.io – Behavioral Mock Interviews",
        url: "https://interviewing.io/",
        platform: "interviewing.io",
        type: "interactive",
        duration: "Per session",
        is_free: false,
        description: "Anonymous mock interviews with real engineers from FAANG companies.",
      },
    ],
  },
  {
    id: "mock",
    label: "Mock Interviews & Practice",
    icon: Mic,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    resources: [
      {
        title: "Pramp – Free Peer Mock Interviews",
        url: "https://www.pramp.com/",
        platform: "Pramp",
        type: "interactive",
        duration: "Per session",
        is_free: true,
        description: "Free platform to practice real-time mock interviews with peers. Covers DSA and behavioral.",
      },
      {
        title: "interviewing.io – Engineer Mock Interviews",
        url: "https://interviewing.io/",
        platform: "interviewing.io",
        type: "interactive",
        duration: "Per session",
        is_free: false,
        description: "Practice with anonymous FAANG engineers and get recorded session feedback.",
      },
      {
        title: "Exponent – PM & Engineering Interview Prep",
        url: "https://www.tryexponent.com/",
        platform: "Exponent",
        type: "course",
        duration: "Self-paced",
        is_free: false,
        description: "Video courses and mock interviews tailored for product and engineering roles.",
      },
      {
        title: "Big Interview – AI Mock Interview Tool",
        url: "https://biginterview.com/",
        platform: "Big Interview",
        type: "interactive",
        duration: "Self-paced",
        is_free: false,
        description: "AI-powered behavioral and technical mock interview simulator with video recording.",
      },
    ],
  },
  {
    id: "mindset",
    label: "Mindset & Strategy",
    icon: Brain,
    color: "#ec4899",
    bg: "rgba(236,72,153,0.08)",
    border: "rgba(236,72,153,0.2)",
    resources: [
      {
        title: "Cracking the Coding Interview – Book",
        url: "https://www.crackingthecodinginterview.com/",
        platform: "Book",
        type: "article",
        duration: "Self-paced",
        is_free: false,
        description: "The definitive book by Gayle Laakmann McDowell. 189 programming questions and solutions.",
      },
      {
        title: "Tech Interview Handbook – Free Guide",
        url: "https://www.techinterviewhandbook.org/",
        platform: "GitHub",
        type: "article",
        duration: "Self-paced",
        is_free: true,
        description: "Open-source handbook covering resume, coding, system design, and negotiation. By ex-Meta engineer.",
      },
      {
        title: "How to Negotiate Salary – Haseeb Qureshi",
        url: "https://haseebq.com/my-ten-rules-for-negotiating-a-job-offer/",
        platform: "Blog",
        type: "article",
        duration: "20 min",
        is_free: true,
        description: "The most shared guide on job offer negotiation, written by a software engineer who tripled his salary.",
      },
      {
        title: "Levels.fyi – Compensation Benchmarking",
        url: "https://www.levels.fyi/",
        platform: "Levels.fyi",
        type: "interactive",
        duration: "Self-paced",
        is_free: true,
        description: "Crowd-sourced compensation data from real engineers at top tech companies worldwide.",
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Resource Card component
// ─────────────────────────────────────────────────────────────────────────────

function ResourceCard({ resource, accentColor }) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "block", textDecoration: "none" }}
    >
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "10px",
          padding: "16px",
          transition: "all 0.22s ease",
          position: "relative",
          overflow: "hidden",
          height: "100%",
          cursor: "pointer",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = accentColor;
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.35)`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "var(--border-color)";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {/* Top accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: accentColor, opacity: 0.6 }} />

        {/* Badges row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ fontSize: "0.73rem", color: accentColor, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>
            {resource.platform}
          </span>
          <div style={{ display: "flex", gap: "5px" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "3px",
              background: resource.is_free ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
              color: resource.is_free ? "#22c55e" : "#f59e0b",
              border: `1px solid ${resource.is_free ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
              borderRadius: "9999px", padding: "2px 8px", fontSize: "0.7rem", fontWeight: 700,
            }}>
              {resource.is_free ? <Gift size={10} /> : <DollarSign size={10} />}
              {resource.is_free ? "Free" : "Paid"}
            </span>
          </div>
        </div>

        <h4 style={{ fontSize: "0.88rem", color: "white", fontWeight: 600, lineHeight: "1.35", marginBottom: "7px" }}>
          {resource.title}
        </h4>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: "1.5", marginBottom: "10px" }}>
          {resource.description}
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.73rem", color: "var(--text-muted)" }}>
            <Clock size={11} /> {resource.duration}
          </span>
          <ExternalLink size={12} style={{ color: "var(--text-muted)" }} />
        </div>
      </div>
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resources Section component
// ─────────────────────────────────────────────────────────────────────────────

function ResourcesSection() {
  const [activeCategory, setActiveCategory] = useState("dsa");
  const [expandedCategories, setExpandedCategories] = useState(new Set(["dsa"]));

  const currentCat = RESOURCE_CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div style={{ marginTop: "40px" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <div style={{
          width: "42px", height: "42px", borderRadius: "10px",
          background: "var(--grad-primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "var(--shadow-primary)",
        }}>
          <BookOpen size={20} style={{ color: "white" }} />
        </div>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Interview Prep Resources</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "2px" }}>
            Curated tools, courses, and guides to prepare for every interview type.
          </p>
        </div>
      </div>

      {/* Category tab bar */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
        {RESOURCE_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              id={`resource-tab-${cat.id}`}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                padding: "9px 18px",
                borderRadius: "9999px",
                border: isActive ? "none" : `1px solid var(--border-color)`,
                background: isActive ? cat.bg : "transparent",
                color: isActive ? cat.color : "var(--text-secondary)",
                outline: isActive ? `1px solid ${cat.border}` : "none",
                cursor: "pointer",
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 600,
                fontSize: "0.82rem",
                transition: "all 0.2s ease",
                boxShadow: isActive ? `0 0 12px ${cat.bg}` : "none",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "white"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              <Icon size={14} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Resource cards grid */}
      {currentCat && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "14px",
          animation: "fadeSlideIn 0.25s ease",
        }}>
          {currentCat.resources.map((res, i) => (
            <ResourceCard key={i} resource={res} accentColor={currentCat.color} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main InterviewPrep page
// ─────────────────────────────────────────────────────────────────────────────

export default function InterviewPrep() {
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [response, setResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mockQuestions = [
    {
      id: 1,
      type: "Behavioral",
      question: "Tell me about a time when you had to resolve a complex technical disagreement within your team. What steps did you take?",
      tips: "Use the STAR method (Situation, Task, Action, Result). Focus on collaboration, data-driven compromise, and professional communication rather than who was right."
    },
    {
      id: 2,
      type: "Technical / System Design",
      question: "How would you design a scalable real-time notification service that processes 50,000 requests per second with minimal latency?",
      tips: "Break it down into connection management (WebSockets/SSE), queue handling (Kafka/RabbitMQ), scaling databases, and cache architectures (Redis)."
    },
    {
      id: 3,
      type: "Core Programming",
      question: "Explain the difference between concurrency and parallelism, and give an example of how you handle asynchronous bottlenecks in Python.",
      tips: "Explain that concurrency is about structure (handling multiple things at once) while parallelism is about execution. Discuss async/await, asyncio event loops, or multi-processing pools."
    }
  ];

  async function handleSubmitResponse(e) {
    e.preventDefault();
    if (!response.trim()) return;

    setSubmitted(true);
    setLoading(true);
    setError(null);
    try {
      const res = await getInterviewFeedback(current.question, response);
      setFeedback(res);
    } catch (err) {
      setError(err.message || "Failed to analyze response. Please try again.");
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  }

  function handleNextQuestion() {
    setActiveQuestion((prev) => (prev + 1) % mockQuestions.length);
    setResponse("");
    setSubmitted(false);
    setFeedback(null);
    setError(null);
  }

  const current = mockQuestions[activeQuestion];

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "2.3rem", color: "#ffffff", fontWeight: 800, display: "flex", alignItems: "center", gap: "10px" }}>
          <BookOpen size={30} style={{ color: "#3b82f6" }} />
          <span>Interview Simulator</span>
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Simulate behavioral, technical, and system design interviews, and receive structured feedback on your answers.
        </p>
      </div>

      {/* ── Simulator grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "30px" }}>
        {/* Left: Simulator Panel */}
        <div>
          <div className="card primary-glow" style={{ padding: "30px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span className="badge" style={{ background: "rgba(139, 92, 246, 0.1)", color: "#a78bfa", borderColor: "rgba(139, 92, 246, 0.2)" }}>
                {current.type}
              </span>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Question {activeQuestion + 1} of {mockQuestions.length}
              </span>
            </div>

            <h3 style={{ fontSize: "1.35rem", fontWeight: "700", lineHeight: "1.5", marginBottom: "20px" }}>
              "{current.question}"
            </h3>

            <form onSubmit={handleSubmitResponse}>
              <label style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>
                Your Answer
              </label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Type your response here. Try to write at least 2-3 sentences..."
                rows={6}
                style={{ width: "100%", background: "#0f1016", border: "2px solid var(--border-color)", color: "white", padding: "12px", borderRadius: "8px", marginBottom: "16px" }}
                disabled={submitted}
              />

              <div style={{ display: "flex", gap: "12px" }}>
                {!submitted ? (
                  <button type="submit" className="primary" disabled={!response.trim()}>
                    <Play size={14} />
                    <span>Submit response</span>
                  </button>
                ) : (
                  <button type="button" className="outline" onClick={handleNextQuestion}>
                    <span>Next Question</span>
                    <span className="arrow-icon">→</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "16px", borderRadius: "8px", marginTop: "24px" }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* AI Response Feedback */}
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "20px", marginTop: "24px" }}>
              <p style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>AI Coach is analyzing response patterns...</p>
            </div>
          )}

          {submitted && feedback && !loading && (
            <div className="card accent-glow" style={{ marginTop: "24px", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "#fbbf24" }}>
                <Sparkles size={18} />
                <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "white" }}>
                  AI Coach Evaluation ({feedback.rating || "Assessment"})
                </h3>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ color: "var(--text-secondary)" }}>
                  <strong style={{ color: "white" }}>Assessment:</strong> {feedback.analysis}
                </p>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", background: "#0f1016", padding: "14px", borderRadius: "8px" }}>
                  <AlertCircle size={16} style={{ color: "#a78bfa", marginTop: "2px", flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: "0.9rem", color: "white", display: "block" }}>Key Recommendation:</strong>
                    <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "2px" }}>{feedback.suggestions}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Coach Tips Panel */}
        <div>
          <div className="card secondary-glow" style={{ height: "100%", padding: "24px" }}>
            <h2 style={{ fontSize: "1.25rem", color: "white", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <HelpCircle size={18} style={{ color: "#22d3ee" }} />
              <span>Prep Tips</span>
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6", marginBottom: "16px" }}>
              {current.tips}
            </p>
            <hr style={{ borderColor: "var(--border-color)", marginBottom: "16px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              <p style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle size={14} style={{ color: "#34d399" }} />
                <span>Keep responses concise (1-2 mins speech equivalent).</span>
              </p>
              <p style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle size={14} style={{ color: "#34d399" }} />
                <span>Highlight technical metrics wherever applicable.</span>
              </p>
              <p style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle size={14} style={{ color: "#34d399" }} />
                <span>Adopt structured problem frameworks like STAR or CIRCLES.</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Resources Section ── */}
      <ResourcesSection />
    </div>
  );
}