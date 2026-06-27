// components/layout/GeminiSidebar.jsx
import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { useGeminiChat } from "../../hooks/useGemini";

function renderMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')  // bold
    .replace(/\*(.*?)\*/g, '$1')       // italic
    .replace(/#{1,6}\s/g, '')          // headers
    .replace(/`(.*?)`/g, '$1');        // inline code
}

export default function GeminiSidebar({ userContext }) {
  const { messages, sendMessage, loading } = useGeminiChat(userContext);
  const [input, setInput] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || loading || cooldown) return;
    setInput("");
    sendMessage(trimmed);

    setCooldown(true);
    setTimeout(() => setCooldown(false), 1500);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <aside
      className="flex flex-col h-screen relative z-20"
      style={{
        width: 300,
        flexShrink: 0,
        background: "rgba(20, 30, 40, 0.35)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderLeft: "1px solid rgba(255, 255, 255, 0.15)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-4 animate-page-enter"
        style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(61,214,140,0.1)", border: "1px solid rgba(61,214,140,0.25)" }}
        >
          <Sparkles size={14} style={{ color: "#3dd68c" }} />
        </div>
        <div>
          <p className="text-sm font-display font-bold" style={{ color: "#ffffff" }}>
            Mosaic AI
          </p>
          <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
            Your companion
          </p>
        </div>
        <div
          className="ml-auto w-2 h-2 rounded-full"
          style={{ background: "#3dd68c", boxShadow: "0 0 6px #3dd68c" }}
        ></div>
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
                      background: "rgba(61,214,140,0.12)",
                      color: "#ffffff",
                      border: "1px solid rgba(61,214,140,0.25)",
                      borderBottomRightRadius: 4,
                    }
                  : {
                      background: "rgba(255, 255, 255, 0.08)",
                      color: "#ffffff",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderBottomLeftRadius: 4,
                    }
              }
            >
              {renderMessage(msg.text)}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="px-3 py-2 rounded-xl text-sm border border-white/10"
              style={{ background: "rgba(255, 255, 255, 0.08)", color: "rgba(255, 255, 255, 0.6)" }}
            >
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-4 relative z-10 bg-transparent flex-shrink-0">
        <div
          className="flex items-end gap-2 rounded-xl p-2"
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
          }}
        >
          <textarea
            className="flex-1 bg-transparent text-sm resize-none outline-none leading-relaxed text-white placeholder-white/40"
            style={{ minHeight: 36, maxHeight: 120, fontFamily: "Inter, sans-serif" }}
            placeholder="Ask Mosaic anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || cooldown}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
            style={{
              background: (input.trim() && !loading && !cooldown) ? "#3dd68c" : "rgba(255, 255, 255, 0.08)",
              color: (input.trim() && !loading && !cooldown) ? "#0c0e13" : "rgba(255, 255, 255, 0.35)",
            }}
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-center mt-1.5 text-[10px]" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
          Enter to send
        </p>
      </div>
    </aside>
  );
}
