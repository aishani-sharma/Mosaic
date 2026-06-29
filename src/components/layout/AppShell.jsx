// components/layout/AppShell.jsx
import Background from "./background";
import NavSidebar from "./NavSidebar";
import GeminiSidebar from "./GeminiSidebar";
import FeedPage from "../feed/FeedPage";
import TasksPage from "../tasks/TasksPage";
import CalendarPage from "../calendar/CalendarPage";
import PomodoroPage from "../pomodoro/PomodoroPage";
import ProfilePage from "../profile/ProfilePage";
import MosaicMomentInterrupt from "../feed/MosaicMomentInterrupt";
import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

export default function AppShell({ user, userContext }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [focusInputTrigger, setFocusInputTrigger] = useState(0);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [showMomentInterrupt, setShowMomentInterrupt] = useState(false);
  const [autoOpenCamera, setAutoOpenCamera] = useState(false);

  const handleNewTaskClick = () => {
    setActivePage("dashboard");
    setFocusInputTrigger(prev => prev + 1);
  };

  const handleSnapTrigger = () => {
    setShowMomentInterrupt(false);
    setActivePage("feed");
    setAutoOpenCamera(true);
  };

  // Keyboard trigger logic (Shift + M)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.shiftKey && (e.key === "M" || e.key === "m")) {
        setShowMomentInterrupt(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Daily Scheduler trigger logic
  useEffect(() => {
    const checkSchedule = () => {
      const scheduledTimeStr = localStorage.getItem("moment_scheduled_time");
      const scheduledDateStr = localStorage.getItem("moment_scheduled_date");
      const today = new Date().toDateString();

      // If scheduled time has already been triggered today, skip
      if (scheduledDateStr === today && scheduledTimeStr === "triggered") {
        return;
      }

      let scheduledTime = null;

      // If not set or it's a new day, schedule it
      if (!scheduledTimeStr || scheduledDateStr !== today) {
        const hoursToAdd = 2 + Math.random() * 6; // random offset between 2 and 8 hours
        const targetTime = Date.now() + hoursToAdd * 60 * 60 * 1000;
        
        localStorage.setItem("moment_scheduled_time", String(targetTime));
        localStorage.setItem("moment_scheduled_date", today);
        scheduledTime = targetTime;
      } else {
        scheduledTime = Number(scheduledTimeStr);
      }

      if (scheduledTime && Date.now() >= scheduledTime) {
        setShowMomentInterrupt(true);
        localStorage.setItem("moment_scheduled_time", "triggered");
      }
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: "var(--bg-shell)" }}>
      <Background activePage={activePage} />

      <NavSidebar
        activePage={activePage}
        setActivePage={setActivePage}
        onNewTaskClick={handleNewTaskClick}
      />

      {/* Main content */}
      <main className={`relative flex-1 z-10 ${activePage === "dashboard" ? "overflow-hidden" : "overflow-y-auto"}`}>
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,rgba(252,248,240,0.05),rgba(252,248,240,0.18))]" />
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
          <FeedPage 
            user={user} 
            userContext={userContext} 
            isActive={activePage === "feed"} 
            onNavigate={setActivePage} 
            openCamera={autoOpenCamera}
            onCameraOpened={() => setAutoOpenCamera(false)}
          />
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
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border"
          style={{
            background: "linear-gradient(180deg, var(--accent), var(--accent-strong))",
            borderColor: "rgba(255, 255, 255, 0.5)",
            boxShadow: "0 16px 30px rgba(101, 158, 184, 0.28)",
          }}
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

      {showMomentInterrupt && (
        <MosaicMomentInterrupt 
          onSnap={handleSnapTrigger} 
          onDismiss={() => setShowMomentInterrupt(false)} 
        />
      )}
    </div>
  );
}
