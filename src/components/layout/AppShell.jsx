// components/layout/AppShell.jsx
import NavSidebar from "./NavSidebar";
import GeminiSidebar from "./GeminiSidebar";
import FeedPage from "../feed/FeedPage";
import TasksPage from "../tasks/TasksPage";
import CalendarPage from "../calendar/CalendarPage";
import PomodoroPage from "../pomodoro/PomodoroPage";
import ProfilePage from "../profile/ProfilePage";
import { useState } from "react";

const pages = {
  feed: FeedPage,
  tasks: TasksPage,
  calendar: CalendarPage,
  pomodoro: PomodoroPage,
  profile: ProfilePage,
};

export default function AppShell({ user, userContext }) {
  const [activePage, setActivePage] = useState("feed");
  const ActivePage = pages[activePage] ?? FeedPage;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0a0a0f" }}>
      <NavSidebar activePage={activePage} setActivePage={setActivePage} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <ActivePage user={user} userContext={userContext} />
      </main>

      <GeminiSidebar userContext={userContext} />
    </div>
  );
}
