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
  const { user: firebaseUser, loading: authLoading } = useAuth();
  const [guestUser, setGuestUser] = useState(null);
  const [screen, setScreen] = useState("login");
  const [userContext, setUserContext] = useState(null);

  const user = firebaseUser || guestUser;
  const loading = authLoading && !guestUser;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setScreen("login");
      return;
    }

    // User is logged in — check Firestore for their profile
    async function loadProfile() {
      try {
        if (user.uid === "dev-user") {
          setUserContext({
            displayName: "Aishani",
            xp: 150,
            level: 2,
            streak: 3,
            tasksCompleted: 4,
            pomodoroSessions: 1,
            role: "student",
            interests: ["Coding"],
            bio: "Guest profile"
          });
          setScreen("app");
          return;
        }

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
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Login error:", e);
    }
  }

  function handleGuestLogin() {
    setGuestUser({
      uid: "dev-user",
      displayName: "Aishani",
      email: "dev@mosaic.app"
    });
  }

  async function handleOnboardingComplete(data) {
    if (user.uid === "dev-user") {
      setUserContext({ ...data, xp: 0, level: 1, streak: 0 });
      setScreen("app");
      return;
    }
    await createUserProfile(user.uid, data);
    const profile = await getUserProfile(user.uid);
    setUserContext(profile);
    setScreen("app");
  }

  if (loading) return <LoginPage onLogin={handleLogin} onGuestLogin={handleGuestLogin} />;

  if (screen === "login") return <LoginPage onLogin={handleLogin} onGuestLogin={handleGuestLogin} />;
  if (screen === "onboarding") return <Onboarding onComplete={handleOnboardingComplete} />;
  return <AppShell user={user} userContext={userContext} />;
}