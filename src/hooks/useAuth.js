// hooks/useAuth.js
import { useState, useEffect } from "react";
// import { auth } from "../lib/firebase";
// import { onAuthStateChanged } from "firebase/auth";

export function useAuth() {
  // TODO: replace with real Firebase auth once configured
  // For now returns a mock user so UI is visible during development
  const [user, setUser] = useState({ uid: "dev-user", displayName: "Aishani", email: "dev@clutch.app", photoURL: null });
  const [loading, setLoading] = useState(false);

  // Real implementation (uncomment after Firebase setup):
  // useEffect(() => {
  //   const unsub = onAuthStateChanged(auth, (u) => {
  //     setUser(u);
  //     setLoading(false);
  //   });
  //   return unsub;
  // }, []);

  return { user, loading };
}
