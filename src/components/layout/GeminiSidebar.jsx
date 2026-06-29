import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Mic } from "lucide-react";
import { useGeminiChat } from "../../hooks/useGemini";

function renderMessage(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/`(.*?)`/g, "$1");
}

export default function GeminiSidebar({ userContext, isOpen, onClose }) {
  const { messages, sendMessage, loading } = useGeminiChat(userContext);
  const [input, setInput] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  function handleMicClick() {
    if (!("SpeechRecognition" in window) && !("webkitSpeechRecognition" in window)) {
      alert("Voice input requires Chrome or Edge");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      setInput(event.results[0][0].transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

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
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(185, 94, 82, 0.24); }
          50% { box-shadow: 0 0 0 6px rgba(185, 94, 82, 0.08); }
        }
      `}</style>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-[rgba(236,232,225,0.25)] backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      <aside
        className="fixed top-0 right-0 h-screen z-40 flex flex-col transition-transform duration-300 ease-out shadow-2xl"
        style={{
          width: 300,
          background: "rgba(248, 241, 233, 0.8)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderLeft: "1px solid rgba(115, 120, 125, 0.14)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        <div
          className="flex items-center gap-2.5 px-4 py-4 animate-page-enter"
          style={{ borderBottom: "1px solid rgba(115, 120, 125, 0.12)" }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(126, 184, 211, 0.12)", border: "1px solid rgba(126, 184, 211, 0.24)" }}
          >
            <Sparkles size={14} style={{ color: "var(--accent-strong)" }} />
          </div>
          <div>
            <p className="text-sm font-display font-bold" style={{ color: "var(--text-strong)" }}>
              Mosaic AI
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Your companion
            </p>
          </div>
          <div
            className="ml-auto w-2 h-2 rounded-full"
            style={{ background: "var(--accent-strong)", boxShadow: "0 0 6px rgba(101, 158, 184, 0.35)" }}
          />
        </div>

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
                        background: "rgba(126, 184, 211, 0.18)",
                        color: "var(--text-strong)",
                        border: "1px solid rgba(126, 184, 211, 0.25)",
                        borderBottomRightRadius: 4,
                      }
                    : {
                        background: "rgba(255, 252, 247, 0.82)",
                        color: "var(--text-strong)",
                        border: "1px solid rgba(115, 120, 125, 0.12)",
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
                className="px-3 py-2 rounded-xl text-sm"
                style={{
                  background: "rgba(255, 252, 247, 0.82)",
                  border: "1px solid rgba(115, 120, 125, 0.12)",
                  color: "var(--text-muted)",
                }}
              >
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-3 pb-4 relative z-10 bg-transparent flex-shrink-0">
          <div
            className="flex items-end gap-2 rounded-xl p-2"
            style={{
              background: "rgba(255, 252, 247, 0.84)",
              border: "1px solid rgba(115, 120, 125, 0.12)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
            }}
          >
            <button
              type="button"
              onClick={handleMicClick}
              className="rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
              style={
                listening
                  ? {
                      width: "32px",
                      height: "32px",
                      color: "#b95e52",
                      background: "transparent",
                      boxShadow: "0 0 0 4px rgba(185, 94, 82, 0.22)",
                      animation: "pulse 1s infinite",
                    }
                  : {
                      width: "32px",
                      height: "32px",
                      color: "var(--text-muted)",
                      background: "transparent",
                    }
              }
              title={listening ? "Stop listening" : "Start voice input"}
            >
              <Mic size={16} />
            </button>
            <textarea
              className="flex-1 bg-transparent text-sm resize-none outline-none leading-relaxed"
              style={{ minHeight: 36, maxHeight: 120, fontFamily: "Inter, sans-serif", color: "var(--text-strong)" }}
              placeholder="Ask Mosaic anything..."
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
                background: input.trim() && !loading && !cooldown ? "var(--accent)" : "rgba(255, 250, 244, 0.72)",
                color: input.trim() && !loading && !cooldown ? "#ffffff" : "rgba(111, 125, 132, 0.5)",
              }}
            >
              <Send size={14} />
            </button>
          </div>
          <p className="text-center mt-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
            Enter to send
          </p>
        </div>
      </aside>
    </>
  );
}
