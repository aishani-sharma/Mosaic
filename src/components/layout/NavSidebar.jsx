// components/layout/NavSidebar.jsx
import { Home, CheckSquare, Calendar, Timer, User } from "lucide-react";

const navItems = [
  { id: "feed", icon: Home, label: "Feed" },
  { id: "tasks", icon: CheckSquare, label: "Tasks" },
  { id: "calendar", icon: Calendar, label: "Calendar" },
  { id: "pomodoro", icon: Timer, label: "Pomodoro" },
  { id: "profile", icon: User, label: "Profile" },
];

export default function NavSidebar({ activePage, setActivePage }) {
  return (
    <aside
      className="flex flex-col items-center py-6 gap-2 h-screen"
      style={{
        width: 72,
        background: "#0d0d14",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}
    >
      {/* Logo mark */}
      <div className="mb-6 flex flex-col items-center">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-base"
          style={{ background: "rgba(61,214,140,0.2)", color: "#3dd68c", border: "1px solid rgba(61,214,140,0.3)" }}
        >
          M
        </div>
      </div>

      {/* Nav icons */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActivePage(id)}
            className={`nav-icon group relative`}
            style={activePage === id ? {
              background: "rgba(61,214,140,0.15)",
              color: "#3dd68c",
              boxShadow: "0 0 0 1px rgba(61,214,140,0.3)",
            } : {}}
            title={label}
          >
            <Icon size={20} />
            {/* Tooltip */}
            <span
              className="absolute left-14 px-2 py-1 rounded-md text-xs whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
              style={{ background: "#1a1a2e", color: "#f0eeff", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {label}
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
