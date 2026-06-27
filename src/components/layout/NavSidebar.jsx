// components/layout/NavSidebar.jsx
import { CheckSquare, ListTodo, Calendar, Timer, Users, User, Settings, LogOut, Plus } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";

const navItems = [
  { id: "dashboard", icon: CheckSquare, label: "Dashboard" },
  { id: "tasks", icon: ListTodo, label: "Tasks" },
  { id: "calendar", icon: Calendar, label: "Calendar" },
  { id: "pomodoro", icon: Timer, label: "Focus" },
  { id: "feed", icon: Users, label: "Feed" },
  { id: "profile", icon: User, label: "Profile" },
];

export default function NavSidebar({ activePage, setActivePage, onNewTaskClick }) {
  return (
    <aside
      className="flex flex-col py-6 h-screen select-none"
      style={{
        width: 220,
        background: "#0c0e13",
        borderRight: "1px solid #2a2d3a",
        flexShrink: 0,
      }}
    >
      {/* Brand Logo and Subtitle */}
      <div className="px-6 mb-8 flex flex-col">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-display font-black text-sm transition-all duration-300"
            style={{
              background: "#1a1d27",
              color: "#3dd68c",
              border: "1.5px solid #2a2d3a",
            }}
          >
            M
          </div>
          <span className="font-display font-black text-lg text-white tracking-tight">
            Mosaic
          </span>
        </div>
        <span className="text-[10px] font-semibold text-[#8b8fa8] uppercase tracking-wider mt-1 font-mono">
          Premium Productivity
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
              className="flex items-center gap-3 w-full py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-150 text-left outline-none"
              style={{
                borderLeft: isActive ? "3px solid #3dd68c" : "3px solid transparent",
                color: isActive ? "#3dd68c" : "#8b8fa8",
                background: isActive ? "#1a1d27" : "transparent",
              }}
              onMouseOver={e => {
                if (!isActive) {
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                }
              }}
              onMouseOut={e => {
                if (!isActive) {
                  e.currentTarget.style.color = "#8b8fa8";
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
          className="w-full bg-[#3dd68c] hover:bg-[#5ce2a7] text-[#0c0e13] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs hover:scale-[1.02] active:scale-[0.98] outline-none"
        >
          <Plus size={14} strokeWidth={3} />
          <span>New Task</span>
        </button>

        {/* Separator */}
        <div className="h-px bg-[#2a2d3a] w-full" />

        {/* Settings & Logout Row */}
        <div className="flex items-center justify-between px-1.5">
          <button
            className="flex items-center gap-2 text-xs font-semibold text-[#8b8fa8] hover:text-white transition-colors outline-none"
            title="Settings"
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>

          <button
            onClick={async () => {
              try {
                await signOut(auth);
              } catch (e) {
                console.error("Signout error:", e);
              }
            }}
            className="p-2 rounded-lg hover:bg-red-500/10 text-[#8b8fa8] hover:text-[#f76a6a] transition-all outline-none"
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
