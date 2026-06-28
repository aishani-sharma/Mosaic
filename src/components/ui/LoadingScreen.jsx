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
        background: "#0f1117",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.6s ease",
      }}
    >
      <div className="animate-fade-in flex flex-col items-center gap-6 relative">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center font-display font-black text-2xl"
          style={{
            background: "#1a1d27",
            border: "1.5px solid #2a2d3a",
            color: "#64BDE3",
          }}
        >
          M
        </div>

        <div className="text-center max-w-sm px-8">
          <p className="font-display text-lg font-bold mb-2" style={{ color: "#ffffff" }}>
            "{quote.quote}"
          </p>
          {quote.author && (
            <p className="text-xs font-mono font-semibold" style={{ color: "#8b8fa8" }}>
              — {quote.author}
            </p>
          )}
        </div>

        <div
          className="w-24 h-1.5 rounded-full overflow-hidden"
          style={{ background: "#2a2d3a" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              background: "#64BDE3",
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
