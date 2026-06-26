// components/layout/AppShell.jsx
import NavSidebar from "./NavSidebar";
import GeminiSidebar from "./GeminiSidebar";
import FeedPage from "../feed/FeedPage";
import TasksPage from "../tasks/TasksPage";
import CalendarPage from "../calendar/CalendarPage";
import PomodoroPage from "../pomodoro/PomodoroPage";
import ProfilePage from "../profile/ProfilePage";
import { useState } from "react";


export default function AppShell({ user, userContext }) {
  const [activePage, setActivePage] = useState("feed");

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0a0a0f" }}>
      <NavSidebar activePage={activePage} setActivePage={setActivePage} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div style={{ display: activePage === "feed" ? "block" : "none" }}>
          <FeedPage user={user} userContext={userContext} />
        </div>
        <div style={{ display: activePage === "tasks" ? "block" : "none" }}>
          <TasksPage user={user} userContext={userContext} />
        </div>
        <div style={{ display: activePage === "calendar" ? "block" : "none" }}>
          <CalendarPage user={user} userContext={userContext} />
        </div>
        <div style={{ display: activePage === "pomodoro" ? "block" : "none" }}>
          <PomodoroPage user={user} userContext={userContext} />
        </div>
        <div style={{ display: activePage === "profile" ? "block" : "none" }}>
          <ProfilePage user={user} userContext={userContext} />
        </div>
      </main>

      <GeminiSidebar userContext={userContext} />
    </div>
  );
}
