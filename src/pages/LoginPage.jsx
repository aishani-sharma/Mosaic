// pages/LoginPage.jsx
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import GlassCard from "../components/ui/GlassCard";
import { Zap } from "lucide-react";

export default function LoginPage({ onLogin }) {
  // TODO: wire to Firebase Google auth
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0a0a0f" }}>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 35%, rgba(61,214,140,0.1) 0%, transparent 60%)" }}
      />

      <div className="w-full max-w-sm relative">
        {/* Brand */}
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 font-display font-black text-2xl"
            style={{
              background: "rgba(61,214,140,0.15)",
              border: "1px solid rgba(61,214,140,0.4)",
              color: "#3dd68c",
              boxShadow: "0 0 40px rgba(61,214,140,0.25)",
            }}
          >
            M
          </div>
          <h1 className="font-display font-black text-3xl mb-1" style={{ color: "#f0eeff" }}>Mosaic</h1>
          <p className="text-sm" style={{ color: "#7a7a9a" }}>Don't miss your moment.</p>
        </div>

        <GlassCard className="p-7">
          <h2 className="font-display font-bold text-lg mb-1 text-center" style={{ color: "#f0eeff" }}>
            Welcome back
          </h2>
          <p className="text-sm text-center mb-7" style={{ color: "#7a7a9a" }}>
            Sign in to keep your streak alive 🔥
          </p>

          {/* Google sign in */}
          <button
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#f0eeff",
            }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
            onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
          >
            {/* Google G */}
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <span className="text-xs" style={{ color: "#3a3a5a" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          </div>

          {/* Dev bypass */}
          <button
            onClick={onLogin}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Zap size={15} />
            Continue as Guest (Dev)
          </button>
        </GlassCard>

        <p className="text-center text-xs mt-6" style={{ color: "#3a3a5a" }}>
          Your data stays private. No spam, ever.
        </p>
      </div>
    </div>
  );
}
