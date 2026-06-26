// components/ui/XPBar.jsx
export default function XPBar({ xp = 0, level = 1 }) {
  const xpToNext = level * 100;
  const progress = Math.min((xp % xpToNext) / xpToNext, 1);

  return (
    <div className="flex items-center gap-3">
      <span className="xp-pill">
        <span>LVL {level}</span>
      </span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${progress * 100}%`,
            background: "linear-gradient(90deg, #3dd68c, #a8f0c6)",
            boxShadow: "0 0 8px rgba(61,214,140,0.6)",
          }}
        />
      </div>
      <span className="font-mono text-xs" style={{ color: "#7a7a9a" }}>
        {xp % xpToNext}/{xpToNext} XP
      </span>
    </div>
  );
}
