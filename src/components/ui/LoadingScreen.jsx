import { useEffect, useState, useRef } from "react";
import { getQuoteOfDay } from "../../lib/gemini";


const FALLBACK = { quote: "Do it now. Sometimes 'later' becomes 'never'.", author: "Unknown" };
const DISPLAY_MS = 3000;

export default function LoadingScreen({ onDone }) {
  const [quote, setQuote] = useState(FALLBACK);
  const [fading, setFading] = useState(false);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const exitTimer = setTimeout(() => {
      setFading(true);
      setTimeout(onDone, 600);
    }, DISPLAY_MS);

    getQuoteOfDay()
      .then((q) => { if (q?.quote) setQuote(q); })
      .catch((e) => console.error("Failed to load daily quote:", e));

    return () => clearTimeout(exitTimer);
  }, []);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{
        background: "#0a0a0f",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.6s ease",
      }}
    >
      <div
        className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(61,214,140,0.12) 0%, transparent 70%)",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div className="animate-fade-in flex flex-col items-center gap-6 relative">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center font-display font-bold text-2xl"
          style={{
            background: "rgba(61,214,140,0.15)",
            border: "1px solid rgba(61,214,140,0.4)",
            color: "#3dd68c",
            boxShadow: "0 0 32px rgba(61,214,140,0.3)",
          }}
        >
          M
        </div>

        <div className="text-center max-w-sm px-8">
          <p className="font-display text-lg font-medium mb-2" style={{ color: "#f0eeff" }}>
            "{quote.quote}"
          </p>
          {quote.author && (
            <p className="text-sm font-mono" style={{ color: "#7a7a9a" }}>
              — {quote.author}
            </p>
          )}
        </div>

        <div
          className="w-24 h-0.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #3dd68c, #a8f0c6)",
              animation: `loadBar ${DISPLAY_MS}ms ease-in-out forwards`,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes loadBar { from { width: 0% } to { width: 100% } }
      `}</style>
    </div>
  );
}
