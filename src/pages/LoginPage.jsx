// pages/LoginPage.jsx
import { useState } from "react";
import { isFirebaseConfigured } from "../lib/firebase";
import cozyCafe from "../assets/cozy_cafe.png";
import { Sparkles } from "lucide-react";

export default function LoginPage({ onLogin, onGuestLogin }) {
  const [showModal, setShowModal] = useState(false);
  const [guestName, setGuestName] = useState("");
  const isGuestReady = guestName.trim().length > 0;

  return (
    <div className="relative h-screen min-h-[100svh] w-full overflow-hidden flex flex-col justify-center items-center select-none font-sans bg-[#faf6ef]">
      {/* Immersive Full Screen Background Scenery */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <img
          src={cozyCafe}
          alt="Scenery Background"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          style={{ objectPosition: "center center" }}
        />
        {/* Soft radial overlay behind text content for readability */}
        <div 
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at center, rgba(255, 250, 244, 0.72) 0%, rgba(255, 250, 244, 0.34) 52%, rgba(245, 239, 230, 0.12) 100%)",
            pointerEvents: "none"
          }}
        />
      </div>

      {/* Floating White Frame Layer on top of the Scenery */}
      <div 
        className="absolute inset-[clamp(16px,3vw,35px)] z-5 pointer-events-none rounded-[clamp(20px,3vw,32px)]"
        style={{
          border: "10px solid rgba(255, 252, 248, 0.95)",
          boxShadow: "0 24px 56px rgba(91, 88, 76, 0.12), inset 0 0 0 1px rgba(164, 154, 140, 0.14)",
        }}
      />

      {/* Hero Content */}
      <div className="relative z-10 mt-80 text-center px-6 max-w-xl animate-fade-in flex flex-col items-center">
        {/* Primary CTA button (Translucent Frosted Glass) */}
        <button
          onClick={() => setShowModal(true)}
          className="group relative px-9 py-3.5 rounded-full font-semibold text-base shadow-[0_8px_30px_rgba(91,88,76,0.08)] hover:shadow-[0_12px_35px_rgba(91,88,76,0.12)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center gap-2 cursor-pointer border"
          style={{
            background: "rgba(255, 250, 244, 0.78)",
            borderColor: "rgba(115, 120, 125, 0.14)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            color: "#23313a",
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = "rgba(255, 250, 244, 0.92)";
            e.currentTarget.style.borderColor = "rgba(115, 120, 125, 0.2)";
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = "rgba(255, 250, 244, 0.78)";
            e.currentTarget.style.borderColor = "rgba(115, 120, 125, 0.14)";
          }}
        >
          <span>Get Started</span>
          <Sparkles size={16} className="transition-transform group-hover:rotate-12 text-[#23313a]/70" />
        </button>
      </div>

      {/* Frosted Glass Modal Overlay */}
      {showModal && (
        <div 
          className="fixed inset-0 z-40 bg-[rgba(88,84,76,0.18)] backdrop-blur-[8px] transition-all duration-300 animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          {/* Centered Modal */}
          <div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 w-auto max-w-sm mx-auto p-8 flex flex-col items-center animate-scale-in"
            style={{
              background: "linear-gradient(to bottom, rgba(255, 251, 246, 0.92), rgba(250, 244, 236, 0.88))",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(115, 120, 125, 0.14)",
              borderRadius: "28px",
              boxShadow: "0 30px 60px rgba(91, 88, 76, 0.14)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Title */}
            <h2 className="font-serif-display font-semibold text-2xl text-[#111827] mb-2 text-center">
              Welcome to Mosaic
            </h2>
            <p className="text-xs text-[#6f7d84] text-center mb-8 uppercase tracking-[0.24em] font-mono">
              Calm Productivity
            </p>

            {/* Google sign in button */}
            <button
              onClick={onLogin}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer shadow-sm"
              disabled={!isFirebaseConfigured}
              style={{
                background: "rgba(255,255,255,0.92)",
                border: "1px solid rgba(115, 120, 125, 0.14)",
                color: "#111827",
                opacity: isFirebaseConfigured ? 1 : 0.6,
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = "#f8fbfd";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.92)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* Google G */}
              <svg width="18" height="18" viewBox="0 0 48 48" className="flex-shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isFirebaseConfigured ? "Continue with Google" : "Google Sign-In Unavailable"}</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 w-full my-5">
              <div className="flex-1 h-px bg-[#6f7d84]/15" />
              <span className="text-xs text-[#6B7280] font-bold uppercase tracking-wider font-mono">or</span>
              <div className="flex-1 h-px bg-[#6f7d84]/15" />
            </div>

            <div className="w-full space-y-3">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter a name for guest pass"
                className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.78)",
                  border: "1px solid rgba(115, 120, 125, 0.14)",
                  color: "#111827",
                }}
              />
              <button
                onClick={() => {
                  if (!isGuestReady) return;
                  onGuestLogin?.(guestName);
                }}
                disabled={!isGuestReady}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: isGuestReady ? "rgba(35, 49, 58, 0.92)" : "rgba(35, 49, 58, 0.42)",
                  border: "1px solid rgba(35, 49, 58, 0.08)",
                  color: "#fffaf4",
                  opacity: isGuestReady ? 1 : 0.7,
                }}
              >
                <span>Enter with Guest Pass</span>
              </button>
            </div>

            {/* Email sign in button (Disabled / Coming Soon) */}
            <button
              disabled
              className="mt-3 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold opacity-70 cursor-not-allowed text-[#4c5b63]"
              style={{
                background: "rgba(245, 239, 230, 0.78)",
                border: "1px solid rgba(115, 120, 125, 0.12)",
              }}
            >
              <span>Email sign-in is coming soon</span>
            </button>
          </div>
        </div>
      )}

      {/* Embedded Animations and CSS Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&display=swap');
        
        .font-serif-display {
          font-family: 'Playfair Display', Georgia, serif;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        .animate-scale-in {
          animation: scaleIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { opacity: 0; transform: translateY(-45%) scale(0.95); }
          to { opacity: 1; transform: translateY(-50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
