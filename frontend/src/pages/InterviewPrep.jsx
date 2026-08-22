import { useState } from "react";
import { BookOpen, Sparkles, AlertCircle, Play, HelpCircle, CheckCircle } from "lucide-react";
import { getInterviewFeedback } from "../api/interview";

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
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "2.5rem", background: "var(--grad-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "flex", alignItems: "center", gap: "10px" }}>
          <BookOpen size={32} style={{ color: "#ec4899" }} />
          <span>Interview Simulator</span>
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Simulate behavioral, technical, and system design interviews, and receive structured feedback on your answers.
        </p>
      </div>

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
    </div>
  );
}