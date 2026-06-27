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
  const [activePage, setActivePage] = useState("dashboard");
  const [focusInputTrigger, setFocusInputTrigger] = useState(0);

  const handleNewTaskClick = () => {
    setActivePage("dashboard");
    setFocusInputTrigger(prev => prev + 1);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0f1117" }}>
      <NavSidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        onNewTaskClick={handleNewTaskClick} 
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-[#0f1117]">
        {/* Dashboard View */}
        <div 
          style={{ display: activePage === "dashboard" ? "block" : "none" }} 
          className={activePage === "dashboard" ? "animate-page-enter" : ""}
        >
          <TasksPage 
            user={user} 
            userContext={userContext} 
            isActive={activePage === "dashboard"} 
            viewMode="dashboard" 
            onViewAll={() => setActivePage("tasks")} 
            focusInputTrigger={focusInputTrigger}
            onNavigate={setActivePage}
          />
        </div>

        {/* Tasks List View */}
        <div 
          style={{ display: activePage === "tasks" ? "block" : "none" }} 
          className={activePage === "tasks" ? "animate-page-enter" : ""}
        >
          <TasksPage 
            user={user} 
            userContext={userContext} 
            isActive={activePage === "tasks"} 
            viewMode="tasks" 
            focusInputTrigger={focusInputTrigger}
            onNavigate={setActivePage}
          />
        </div>

        {/* Feed View */}
        <div 
          style={{ display: activePage === "feed" ? "block" : "none" }} 
          className={activePage === "feed" ? "animate-page-enter" : ""}
        >
          <FeedPage user={user} userContext={userContext} isActive={activePage === "feed"} />
        </div>

        {/* Calendar View */}
        <div 
          style={{ display: activePage === "calendar" ? "block" : "none" }} 
          className={activePage === "calendar" ? "animate-page-enter" : ""}
        >
          <CalendarPage user={user} userContext={userContext} isActive={activePage === "calendar"} />
        </div>

        {/* Pomodoro Focus View */}
        <div 
          style={{ display: activePage === "pomodoro" ? "block" : "none" }} 
          className={activePage === "pomodoro" ? "animate-page-enter" : ""}
        >
          <PomodoroPage user={user} userContext={userContext} isActive={activePage === "pomodoro"} />
        </div>

        {/* Profile View */}
        <div 
          style={{ display: activePage === "profile" ? "block" : "none" }} 
          className={activePage === "profile" ? "animate-page-enter" : ""}
        >
          <ProfilePage user={user} userContext={userContext} isActive={activePage === "profile"} />
        </div>
      </main>

      <GeminiSidebar userContext={userContext} />
    </div>
  );
}
