// components/ui/StreakBadge.jsx
import { Flame } from "lucide-react";

export default function StreakBadge({ streak = 0 }) {
  return (
    <div className="streak-pill">
      <Flame size={12} />
      <span>{streak} day streak</span>
    </div>
  );
}
