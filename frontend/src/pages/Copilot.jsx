import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Sparkles, AlertCircle, Bot, User } from "lucide-react";
import { chatWithCopilot } from "../api/career";

export default function Copilot() {
  const [messages, setMessages] = useState([
    {
      role: "model",
      content: "Hello! I am your FYND AI Career Copilot. I've analyzed your career profile context. Ask me anything about job matching, key skill gaps, portfolio improvements, or interview preparation strategies!"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);

  const suggestions = [
    "What are my biggest skill gaps?",
    "Suggest a project to improve my resume.",
    "How can I prepare for an ML Engineer role?",
    "Give me advice on improving my experience description."
  ];

  // Scroll to bottom whenever messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSendMessage(textToSend) {
    const text = textToSend || input;
    if (!text.trim()) return;

    if (!textToSend) setInput("");
    setError(null);
    setLoading(true);

    const userMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);

    // Format chat history to send to Gemini
    // We map history to role & content strings
    const historyPayload = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    try {
      const result = await chatWithCopilot(text, historyPayload);
      setMessages(prev => [...prev, { role: "model", content: result.response }]);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px", flexShrink: 0 }}>
        <h1 style={{ fontSize: "2.3rem", background: "var(--grad-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "flex", alignItems: "center", gap: "10px" }}>
          <Sparkles size={28} style={{ color: "#8b5cf6" }} />
          <span>AI Career Copilot</span>
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Consult your personalized AI advisor to identify target areas, map learning actions, and build interview confidence.
        </p>
      </div>

      {/* Chat Container */}
      <div className="card primary-glow" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "0", marginBottom: "0", background: "rgba(15, 16, 22, 0.6)" }}>
        {/* Messages Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {messages.map((msg, index) => {
            const isBot = msg.role === "model";
            return (
              <div 
                key={index} 
                style={{ 
                  display: "flex", 
                  gap: "12px", 
                  alignSelf: isBot ? "flex-start" : "flex-end",
                  maxWidth: "80%",
                  flexDirection: isBot ? "row" : "row-reverse"
                }}
              >
                {/* Avatar */}
                <div style={{ 
                  width: "36px", 
                  height: "36px", 
                  borderRadius: "50%", 
                  background: isBot ? "var(--grad-secondary)" : "var(--grad-primary)",
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  color: "white",
                  flexShrink: 0
                }}>
                  {isBot ? <Bot size={18} /> : <User size={18} />}
                </div>

                {/* Bubble */}
                <div style={{ 
                  background: isBot ? "rgba(255, 255, 255, 0.03)" : "var(--grad-primary)",
                  border: isBot ? "1px solid var(--border-color)" : "none",
                  padding: "12px 18px", 
                  borderRadius: "12px",
                  color: isBot ? "var(--text-primary)" : "white",
                  fontSize: "0.95rem",
                  lineHeight: "1.6",
                  whiteSpace: "pre-wrap",
                  boxShadow: isBot ? "none" : "0 4px 12px rgba(139, 92, 246, 0.25)"
                }}>
                  {msg.content}
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: "flex", gap: "12px", alignSelf: "flex-start" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--grad-secondary)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", color: "white" }}>
                <Bot size={18} />
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-color)", padding: "12px 18px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="dot-typing" style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Copilot is thinking...</span>
              </div>
            </div>
          )}

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "12px 16px", borderRadius: "8px", alignSelf: "center", maxWidth: "90%" }}>
              <AlertCircle size={16} />
              <span style={{ fontSize: "0.85rem" }}>{error}</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        {messages.length === 1 && (
          <div style={{ padding: "0 24px 16px 24px", display: "flex", gap: "8px", flexWrap: "wrap", flexShrink: 0 }}>
            {suggestions.map((s, idx) => (
              <button 
                key={idx} 
                className="outline" 
                onClick={() => handleSendMessage(s)}
                style={{ padding: "8px 14px", fontSize: "0.8rem", borderRadius: "20px", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <span>{s}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input Box */}
        <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border-color)", display: "flex", gap: "12px", alignItems: "center", flexShrink: 0, background: "rgba(10, 11, 16, 0.4)" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Copilot a question (e.g. how can I close my Python backend gap?)..."
            rows={1}
            style={{ 
              flex: 1, 
              background: "#0f1016", 
              border: "2px solid var(--border-color)", 
              color: "white", 
              padding: "12px 16px", 
              borderRadius: "8px", 
              resize: "none", 
              fontSize: "0.95rem", 
              marginBottom: 0,
              fontFamily: "inherit"
            }}
            disabled={loading}
          />
          <button 
            className="primary" 
            onClick={() => handleSendMessage()} 
            disabled={loading || !input.trim()}
            style={{ width: "44px", height: "44px", padding: "0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
