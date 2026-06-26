// components/layout/GeminiSidebar.jsx
import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { useGeminiChat } from "../../hooks/useGemini";
import GlassCard from "../ui/GlassCard";

export default function GeminiSidebar({ userContext }) {
  const { messages, sendMessage, loading } = useGeminiChat(userContext);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput("");
    sendMessage(trimmed);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <aside
      className="flex flex-col h-screen"
      style={{
        width: 300,
        flexShrink: 0,
        background: "#0d0d14",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(124,106,247,0.2)" }}
        >
          <Sparkles size={14} style={{ color: "#7c6af7" }} />
        </div>
        <div>
          <p className="text-sm font-display font-semibold" style={{ color: "#f0eeff" }}>
            Clutch AI
          </p>
          <p className="text-xs" style={{ color: "#7a7a9a" }}>
            Your companion
          </p>
        </div>
        <div
          className="ml-auto w-2 h-2 rounded-full"
          style={{ background: "#4ade80", boxShadow: "0 0 6px #4ade80" }}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
          >
            <div
              className="max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed"
              style={
                msg.role === "user"
                  ? {
                      background: "rgba(124,106,247,0.2)",
                      color: "#f0eeff",
                      borderBottomRightRadius: 4,
                    }
                  : {
                      background: "rgba(255,255,255,0.05)",
                      color: "#d4d0f0",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderBottomLeftRadius: 4,
                    }
              }
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="px-3 py-2 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.05)", color: "#7a7a9a" }}
            >
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-4">
        <div
          className="flex items-end gap-2 rounded-xl p-2"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <textarea
            className="flex-1 bg-transparent text-sm resize-none outline-none leading-relaxed"
            style={{ color: "#f0eeff", minHeight: 36, maxHeight: 120, fontFamily: "Inter, sans-serif" }}
            placeholder="Ask Clutch anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
            style={{
              background: input.trim() ? "#7c6af7" : "rgba(255,255,255,0.06)",
              color: input.trim() ? "#fff" : "#7a7a9a",
            }}
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-center mt-1.5 text-xs" style={{ color: "#3a3a5a" }}>
          Enter to send
        </p>
      </div>
    </aside>
  );
}
