// App.jsx
import { getUserProfile, createUserProfile, checkAndUpdateStreak } from "./lib/firestore";
import { useState, useEffect } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "./lib/firebase";
import { useAuth } from "./hooks/useAuth";
import Onboarding from "./components/onboarding/Onboarding";
import AppShell from "./components/layout/AppShell";
import LoginPage from "./pages/LoginPage";

export default function App() {
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const [screen, setScreen] = useState("login");
  const [userContext, setUserContext] = useState(null);

  const user = firebaseUser;
  const loading = authLoading;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setScreen("login");
      return;
    }

    // User is logged in — check Firestore for their profile
    async function loadProfile() {
      try {
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
      } catch (err) {
        console.error("Failed to load profile from Firestore:", err);
        // Fallback to bypass firestore exceptions and let the user view/use the app
        setUserContext({
          displayName: user.displayName || "Guest User",
          xp: 0,
          level: 1,
          streak: 0,
          role: "student",
          interests: [],
          bio: ""
        });
        setScreen("app");
      }
    }

    loadProfile();
  }, [user, loading]);

  async function handleLogin() {
    if (!isFirebaseConfigured || !auth || !googleProvider) return;
    try {
      await signInWithPopup(auth, googleProvider);
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
