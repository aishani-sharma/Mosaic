// components/ui/StreakBadge.jsx
export default function StreakBadge({ streak = 0 }) {
  return (
    <div className="streak-pill">
      <span>🔥</span>
      <span>{streak} day streak</span>
    </div>
  );
}
