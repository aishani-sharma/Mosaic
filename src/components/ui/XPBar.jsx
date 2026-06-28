// components/ui/XPBar.jsx
export default function XPBar({ xp = 0, level = 1 }) {
  const xpToNext = level * 100;
  const progress = Math.min((xp % xpToNext) / xpToNext, 1);

  return (
    <div className="flex items-center gap-3">
      <span className="xp-pill">
        <span>LVL {level}</span>
      </span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "#2a2d3a" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${progress * 100}%`,
            background: "#64BDE3",
          }}
        />
      </div>
      <span className="font-mono text-xs" style={{ color: "#8b8fa8" }}>
        {xp % xpToNext}/{xpToNext} XP
      </span>
    </div>
  );
}
