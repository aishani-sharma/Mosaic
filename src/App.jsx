// App.jsx
import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import Onboarding from "./components/onboarding/Onboarding";
import AppShell from "./components/layout/AppShell";
import LoadingScreen from "./components/ui/LoadingScreen";

// App states: "login" → "onboarding" → "loading" → "app"
export default function App() {
  const [screen, setScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [userContext, setUserContext] = useState(null);

  function handleLogin() {
    // TODO: replace with real Firebase Google auth
    setUser({ uid: "dev-user", displayName: "Aishani", email: "dev@clutch.app" });
    setScreen("onboarding");
  }

  function handleOnboardingComplete(data) {
    setUserContext({ ...data, xp: 0, level: 1, streak: 3, tasksCompleted: 0, pomodoroSessions: 0 });
    setScreen("loading");
  }

  function handleLoadingDone() {
    setScreen("app");
  }

  if (screen === "login") return <LoginPage onLogin={handleLogin} />;
  if (screen === "onboarding") return <Onboarding onComplete={handleOnboardingComplete} />;
  if (screen === "loading") return <LoadingScreen onDone={handleLoadingDone} />;
  return <AppShell user={user} userContext={userContext} />;
}
