// components/layout/AppShell.jsx
import Background from "./background";
import NavSidebar from "./NavSidebar";
import GeminiSidebar from "./GeminiSidebar";
import FeedPage from "../feed/FeedPage";
import TasksPage from "../tasks/TasksPage";
import CalendarPage from "../calendar/CalendarPage";
import PomodoroPage from "../pomodoro/PomodoroPage";
import ProfilePage from "../profile/ProfilePage";
import { useState } from "react";
import { Sparkles } from "lucide-react";

export default function AppShell({ user, userContext }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [focusInputTrigger, setFocusInputTrigger] = useState(0);
  const [isAiOpen, setIsAiOpen] = useState(false);

  const handleNewTaskClick = () => {
    setActivePage("dashboard");
    setFocusInputTrigger(prev => prev + 1);
  };

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: "#0f1117" }}>
      <Background />

      <NavSidebar
        activePage={activePage}
        setActivePage={setActivePage}
        onNewTaskClick={handleNewTaskClick}
      />

      {/* Main content */}
      <main className={`relative flex-1 z-10 ${activePage === "dashboard" ? "overflow-hidden" : "overflow-y-auto"}`}>
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
        </div> {/* page-content */}
      </main>

      {/* Floating AI Button (Bottom Right) */}
      {!isAiOpen && (
        <button
          onClick={() => setIsAiOpen(prev => !prev)}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center bg-[#3dd68c] hover:bg-[#5ce2a7] text-[#0c0e13] shadow-lg hover:shadow-[#3dd68c]/25 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-[#3dd68c]/10"
          title="Open AI Companion"
        >
          <Sparkles size={20} strokeWidth={2.5} />
        </button>
      )}

      <GeminiSidebar 
        userContext={userContext} 
        isOpen={isAiOpen} 
        onClose={() => setIsAiOpen(false)} 
      />
    </div>
  );
}
