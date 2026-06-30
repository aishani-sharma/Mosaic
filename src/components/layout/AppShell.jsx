// components/layout/AppShell.jsx
import Background from "./background";
import NavSidebar from "./NavSidebar";
import GeminiSidebar from "./GeminiSidebar";
import { useState, useEffect, lazy, Suspense } from "react";
import { Sparkles } from "lucide-react";

const FeedPage = lazy(() => import("../feed/FeedPage"));
const TasksPage = lazy(() => import("../tasks/TasksPage"));
const CalendarPage = lazy(() => import("../calendar/CalendarPage"));
const PomodoroPage = lazy(() => import("../pomodoro/PomodoroPage"));
const ProfilePage = lazy(() => import("../profile/ProfilePage"));
const MosaicMomentInterrupt = lazy(() => import("../feed/MosaicMomentInterrupt"));

export default function AppShell({ user, userContext, onLogout }) {
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

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: "var(--bg-shell)" }}>
      <Background activePage={activePage} />

      <NavSidebar
        activePage={activePage}
        setActivePage={setActivePage}
        onNewTaskClick={handleNewTaskClick}
        onLogout={onLogout}
        isGuest={Boolean(user?.isGuest)}
      />

      {/* Main content */}
      <main className={`relative flex-1 z-10 ${activePage === "dashboard" ? "overflow-hidden" : "overflow-y-auto"}`}>
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,rgba(252,248,240,0.05),rgba(252,248,240,0.18))]" />
        <Suspense fallback={<div className="p-6 text-sm text-[#4b5563]">Loading...</div>}>
        {/* Shared Tasks View */}
        {(activePage === "dashboard" || activePage === "tasks") && (
          <div className="animate-page-enter h-full">
            <TasksPage
              user={user}
              userContext={userContext}
              isActive
              viewMode={activePage === "dashboard" ? "dashboard" : "tasks"}
              onViewAll={() => setActivePage("tasks")}
              focusInputTrigger={focusInputTrigger}
              onNavigate={setActivePage}
            />
          </div>
        )}

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
        </Suspense>
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
