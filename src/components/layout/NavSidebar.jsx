// components/layout/NavSidebar.jsx
import { CheckSquare, ListTodo, Calendar, Timer, Users, User, Settings, LogOut, Plus } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth, isFirebaseConfigured } from "../../lib/firebase";

const navItems = [
  { id: "dashboard", icon: CheckSquare, label: "Dashboard" },
  { id: "tasks", icon: ListTodo, label: "Tasks" },
  { id: "calendar", icon: Calendar, label: "Calendar" },
  { id: "pomodoro", icon: Timer, label: "Focus" },
  { id: "feed", icon: Users, label: "Moments" },
  { id: "profile", icon: User, label: "Profile" },
];

export default function NavSidebar({ activePage, setActivePage, onNewTaskClick, onLogout, isGuest = false }) {
  return (
    <aside
      className="flex flex-col py-6 h-screen select-none relative z-20"
      style={{
        width: 220,
        background: "rgba(248, 241, 233, 0.72)",
        backdropFilter: "blur(26px)",
        WebkitBackdropFilter: "blur(26px)",
        borderRight: "1px solid rgba(115, 120, 125, 0.14)",
        flexShrink: 0,
        boxShadow: "12px 0 32px rgba(109, 104, 91, 0.08)",
      }}
    >
      {/* Brand Logo and Subtitle */}
      <div className="px-6 mb-8 flex flex-col">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-black text-sm transition-all duration-300"
            style={{
              background: "rgba(255, 250, 244, 0.84)",
              color: "var(--accent-strong)",
              border: "1px solid rgba(115, 120, 125, 0.18)",
            }}
          >
            M
          </div>
          <span className="font-display font-black text-lg tracking-tight" style={{ color: "var(--text-strong)" }}>
            Mosaic
          </span>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] mt-1 font-mono" style={{ color: "var(--text-muted)" }}>
          Calm Productivity
        </span>
      </div>

      {/* Navigation menu list */}
      <nav className="flex flex-col gap-1.5 px-3 flex-1">
        {navItems.map(({ id, icon: Icon, label }) => {
          const isActive = activePage === id;
          return (
            <button
              key={id}
              onClick={() => setActivePage(id)}
              className="flex items-center gap-3 w-full py-3 px-3.5 rounded-2xl text-sm font-semibold transition-all duration-150 text-left"
              style={{
                color: isActive ? "var(--text-strong)" : "var(--text)",
                background: isActive ? "rgba(255, 250, 244, 0.82)" : "transparent",
                border: isActive ? "1px solid rgba(115, 120, 125, 0.16)" : "1px solid transparent",
                boxShadow: isActive ? "0 12px 30px rgba(110, 106, 91, 0.08)" : "none",
              }}
              onMouseOver={e => {
                if (!isActive) {
                  e.currentTarget.style.color = "var(--text-strong)";
                  e.currentTarget.style.background = "rgba(255, 250, 244, 0.45)";
                }
              }}
              onMouseOut={e => {
                if (!isActive) {
                  e.currentTarget.style.color = "var(--text)";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom area: "+ New Task" button + Settings + Logout */}
      <div className="mt-auto px-4 flex flex-col gap-3">
        {/* + New Task button */}
        <button
          onClick={onNewTaskClick}
          className="w-full btn-primary font-bold py-3 px-3 rounded-2xl flex items-center justify-center gap-1.5 text-xs hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={14} strokeWidth={3} />
          <span>New Task</span>
        </button>

        {/* Separator */}
        <div className="h-px w-full" style={{ background: "rgba(111, 125, 132, 0.16)" }} />

        {/* Settings & Logout Row */}
        <div className="flex items-center justify-between px-1.5">
          <button
            className="flex items-center gap-2 text-xs font-semibold transition-colors"
            title="Settings"
            style={{ color: "var(--text-muted)" }}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>

          <button
            onClick={async () => {
              if (isGuest) {
                onLogout?.();
                return;
              }
              if (!isFirebaseConfigured || !auth) return;
              try {
                await signOut(auth);
              } catch (e) {
                console.error("Signout error:", e);
              }
            }}
            className="p-2 rounded-xl hover:bg-red-500/10 transition-all"
            style={{ color: "var(--text-muted)" }}
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
