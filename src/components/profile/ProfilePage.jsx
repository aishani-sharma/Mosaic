// components/profile/ProfilePage.jsx
import GlassCard from "../ui/GlassCard";
import XPBar from "../ui/XPBar";
import StreakBadge from "../ui/StreakBadge";
import { User, Edit3 } from "lucide-react";

export default function ProfilePage({ user, userContext }) {
  const ctx = userContext ?? {};
  const stats = [
    { label: "Tasks Done", value: ctx.tasksCompleted ?? 0 },
    { label: "Current Streak", value: `${ctx.streak ?? 0}d` },
    { label: "Total XP", value: ctx.xp ?? 0 },
    { label: "Sessions", value: ctx.pomodoroSessions ?? 0 },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="font-display font-bold text-xl mb-6" style={{ color: "#f0eeff" }}>Profile</h1>

      {/* Avatar + name */}
      <GlassCard className="p-6 mb-5 flex flex-col items-center text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 font-display font-bold text-3xl"
          style={{ background: "rgba(124,106,247,0.15)", color: "#7c6af7", border: "1.5px solid rgba(124,106,247,0.3)" }}
        >
          {user?.displayName?.slice(0, 1) ?? <User size={32} />}
        </div>
        <p className="font-display font-semibold text-lg mb-0.5" style={{ color: "#f0eeff" }}>
          {user?.displayName ?? "Clutcher"}
        </p>
        <p className="text-sm mb-4" style={{ color: "#7a7a9a" }}>{user?.email}</p>
        <div className="w-full">
          <XPBar xp={ctx.xp ?? 0} level={ctx.level ?? 1} />
        </div>
      </GlassCard>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {stats.map(s => (
          <GlassCard key={s.label} className="p-4 text-center">
            <p className="font-mono font-semibold text-2xl mb-1" style={{ color: "#7c6af7" }}>{s.value}</p>
            <p className="text-xs" style={{ color: "#7a7a9a" }}>{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Context summary */}
      <GlassCard className="p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "#7a7a9a" }}>Your context</p>
          <button className="flex items-center gap-1 text-xs" style={{ color: "#7c6af7" }}>
            <Edit3 size={12} /> Edit
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { label: "Role", value: ctx.role ?? "Not set" },
            { label: "Focus areas", value: ctx.focusAreas?.join(", ") ?? "Not set" },
            { label: "Work hours", value: ctx.workHours ?? "Not set" },
          ].map(row => (
            <div key={row.label} className="flex justify-between text-sm">
              <span style={{ color: "#7a7a9a" }}>{row.label}</span>
              <span style={{ color: "#f0eeff" }}>{row.value}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Streak */}
      <GlassCard className="p-4 flex items-center justify-between">
        <div>
          <p className="font-display font-semibold mb-1" style={{ color: "#f0eeff" }}>Daily streak</p>
          <p className="text-xs" style={{ color: "#7a7a9a" }}>Complete at least one task per day</p>
        </div>
        <StreakBadge streak={ctx.streak ?? 0} />
      </GlassCard>
    </div>
  );
}
