// App.jsx
import { getUserProfile, createUserProfile, checkAndUpdateStreak } from "./lib/firestore";
import { useState, useEffect } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./lib/firebase";
import { useAuth } from "./hooks/useAuth";
import Onboarding from "./components/onboarding/Onboarding";
import AppShell from "./components/layout/AppShell";
import LoadingScreen from "./components/ui/LoadingScreen";
import LoginPage from "./pages/LoginPage";

export default function App() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState("login");
  const [userContext, setUserContext] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setScreen("login");
      return;
    }

    // User is logged in — check Firestore for their profile
    async function loadProfile() {
      let profile = await getUserProfile(user.uid);
      await checkAndUpdateStreak(user.uid);

      if (!profile) {
        // First time user — send to onboarding
        setScreen("onboarding");
      } else {
        // Returning user — load their context and go straight to app
        profile = await getUserProfile(user.uid); // re-fetch after streak update
        setUserContext(profile);
        setScreen("app");
      }
    }

    loadProfile();
  }, [user, loading]);

  async function handleLogin() {
    try {
      await signInWithPopup(auth, googleProvider);
      // screen change handled by useEffect above
    } catch (e) {
      console.error("Login error:", e);
    }
  }

  async function handleOnboardingComplete(data) {
    await createUserProfile(user.uid, data);
    const profile = await getUserProfile(user.uid);
    setUserContext(profile);
    setScreen("app");
  }

  if (loading) return <LoginPage onLogin={handleLogin} />;

  if (screen === "login") return <LoginPage onLogin={handleLogin} />;
  if (screen === "onboarding") return <Onboarding onComplete={handleOnboardingComplete} />;
  return <AppShell user={user} userContext={userContext} />;
}