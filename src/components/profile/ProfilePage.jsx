// components/profile/ProfilePage.jsx
import { useState, useEffect } from "react";
import GlassCard from "../ui/GlassCard";
import XPBar from "../ui/XPBar";
import StreakBadge from "../ui/StreakBadge";
import { User, Edit3 } from "lucide-react";
import { updateUserProfile } from "../../lib/firestore";

const ROLES = ["Engineering Student", "Medical Student", "Working Professional", "Entrepreneur", "Other"];
const FOCUS_AREAS = ["Academics", "Work Projects", "Personal Goals", "Health & Fitness", "Finance", "Side Projects"];

export default function ProfilePage({ user, userContext }) {
  const ctx = userContext ?? {};
  const [profileData, setProfileData] = useState(ctx);
  const [isEditing, setIsEditing] = useState(false);
  const [role, setRole] = useState(ctx.role ?? "");
  const [focusAreas, setFocusAreas] = useState(ctx.focusAreas ?? []);
  const [workHours, setWorkHours] = useState(ctx.workHours ?? "");

  useEffect(() => {
    if (userContext) {
      setProfileData(userContext);
      setRole(userContext.role ?? "");
      setFocusAreas(userContext.focusAreas ?? []);
      setWorkHours(userContext.workHours ?? "");
    }
  }, [userContext]);

  async function handleSave() {
    if (!user?.uid) return;
    try {
      const updated = {
        ...profileData,
        role,
        focusAreas,
        workHours,
      };
      await updateUserProfile(user.uid, { role, focusAreas, workHours });
      setProfileData(updated);
      setIsEditing(false);
    } catch (e) {
      console.error("Error updating profile context:", e);
    }
  }

  const stats = [
    { label: "Tasks Done", value: profileData.tasksCompleted ?? 0 },
    { label: "Current Streak", value: `${profileData.streak ?? 0}d` },
    { label: "Total XP", value: profileData.xp ?? 0 },
    { label: "Sessions", value: profileData.pomodoroSessions ?? 0 },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="font-display font-bold text-xl mb-6" style={{ color: "#f0eeff" }}>Profile</h1>

      {/* Avatar + name */}
      <GlassCard className="p-6 mb-5 flex flex-col items-center text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 font-display font-bold text-3xl"
          style={{ background: "rgba(61,214,140,0.15)", color: "#3dd68c", border: "1.5px solid rgba(61,214,140,0.3)" }}
        >
          {user?.displayName?.slice(0, 1) ?? <User size={32} />}
        </div>
        <p className="font-display font-semibold text-lg mb-0.5" style={{ color: "#f0eeff" }}>
          {user?.displayName ?? "Mosaicker"}
        </p>
        <p className="text-sm mb-4" style={{ color: "#7a7a9a" }}>{user?.email}</p>
        <div className="w-full">
          <XPBar xp={profileData.xp ?? 0} level={profileData.level ?? 1} />
        </div>
      </GlassCard>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {stats.map(s => (
          <GlassCard key={s.label} className="p-4 text-center">
            <p className="font-mono font-semibold text-2xl mb-1" style={{ color: "#3dd68c" }}>{s.value}</p>
            <p className="text-xs" style={{ color: "#7a7a9a" }}>{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Context summary */}
      <GlassCard className="p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "#7a7a9a" }}>Your context</p>
          {!isEditing && (
            <button
              onClick={() => {
                setRole(profileData.role ?? "");
                setFocusAreas(profileData.focusAreas ?? []);
                setWorkHours(profileData.workHours ?? "");
                setIsEditing(true);
              }}
              className="flex items-center gap-1 text-xs"
              style={{ color: "#3dd68c" }}
            >
              <Edit3 size={12} /> Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-4">
            {/* Role dropdown */}
            <div>
              <label className="block text-xs font-mono mb-1.5 uppercase" style={{ color: "#7a7a9a" }}>Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="input-glass bg-surface cursor-pointer text-sm w-full py-2.5 px-3 rounded-xl border border-[rgba(255,255,255,0.08)] outline-none"
                style={{ background: "#13131a", color: "#f0eeff" }}
              >
                <option value="" disabled>Select your role</option>
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Focus areas tags */}
            <div>
              <label className="block text-xs font-mono mb-2 uppercase" style={{ color: "#7a7a9a" }}>Focus Areas</label>
              <div className="flex flex-wrap gap-1.5">
                {FOCUS_AREAS.map(f => {
                  const isSelected = focusAreas.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setFocusAreas(prev =>
                          prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
                        );
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs transition-all duration-200"
                      style={{
                        background: isSelected ? "rgba(61,214,140,0.15)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isSelected ? "rgba(61,214,140,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: isSelected ? "#3dd68c" : "#7a7a9a",
                      }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Work hours */}
            <div>
              <label className="block text-xs font-mono mb-1.5 uppercase" style={{ color: "#7a7a9a" }}>Work Hours</label>
              <input
                type="text"
                className="input-glass py-2 px-3 text-sm w-full"
                value={workHours}
                placeholder="e.g. 9am-5pm weekdays"
                onChange={e => setWorkHours(e.target.value)}
              />
            </div>

            {/* Form actions */}
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setIsEditing(false)}
                className="btn-ghost px-4 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary px-4 py-1.5 text-xs font-semibold"
                style={{ background: "#3dd68c" }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {[
              { label: "Role", value: profileData.role ?? "Not set" },
              { label: "Focus areas", value: profileData.focusAreas?.join(", ") ?? "Not set" },
              { label: "Work hours", value: profileData.workHours ?? "Not set" },
            ].map(row => (
              <div key={row.label} className="flex justify-between text-sm">
                <span style={{ color: "#7a7a9a" }}>{row.label}</span>
                <span style={{ color: "#f0eeff" }}>{row.value}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Streak */}
      <GlassCard className="p-4 flex items-center justify-between">
        <div>
          <p className="font-display font-semibold mb-1" style={{ color: "#f0eeff" }}>Daily streak</p>
          <p className="text-xs" style={{ color: "#7a7a9a" }}>Complete at least one task per day</p>
        </div>
        <StreakBadge streak={profileData.streak ?? 0} />
      </GlassCard>
    </div>
  );
}
