// pages/LoginPage.jsx
import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import scenery from "../assets/scenery.png";
import { Zap, Sparkles } from "lucide-react";

export default function LoginPage({ onLogin }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col justify-center items-center select-none font-sans bg-[#fafafa]">
      {/* Immersive Full Screen Background Scenery */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src={scenery}
          alt="Scenery Background"
          className="w-full h-full object-cover select-none pointer-events-none"
          style={{ objectPosition: "center 40%" }}
        />
        {/* Soft radial overlay behind text content for readability */}
        <div 
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at center, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.25) 55%, transparent 100%)",
            pointerEvents: "none"
          }}
        />
      </div>

      {/* Floating White Frame Layer on top of the Scenery */}
      <div 
        className="absolute inset-[35px] z-5 pointer-events-none border-[12px] border-white rounded-[32px]"
        style={{
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.12), inset 0 0 20px rgba(0, 0, 0, 0.02)",
        }}
      />

      {/* Hero Content */}
      <div className="relative z-10 text-center px-6 max-w-xl animate-fade-in flex flex-col items-center">
        {/* Brand Name (Elegant Serif Display Font) */}
        <h1 className="font-serif-display font-semibold text-5xl text-[#111827] mb-4 drop-shadow-sm tracking-tight">
          Mosaic
        </h1>

        {/* Calming Quote */}
        <p className="text-lg font-medium text-[#374151] max-w-md italic mb-10 leading-relaxed drop-shadow-sm">
          "Today's effort becomes tomorrow's masterpiece."
        </p>

        {/* Primary CTA button (Translucent Frosted Glass) */}
        <button
          onClick={() => setShowModal(true)}
          className="group relative px-9 py-3.5 rounded-full text-[#111827] font-semibold text-base shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_35px_rgba(0,0,0,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center gap-2 cursor-pointer outline-none border"
          style={{
            background: "rgba(255, 255, 255, 0.35)",
            borderColor: "rgba(255, 255, 255, 0.45)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.55)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.65)";
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.35)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.45)";
          }}
        >
          <span>Get Started</span>
          <Sparkles size={16} className="transition-transform group-hover:rotate-12 text-[#111827]/70" />
        </button>
      </div>

      {/* Frosted Glass Modal Overlay */}
      {showModal && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[6px] transition-all duration-300 animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          {/* Centered Modal */}
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm p-8 flex flex-col items-center animate-scale-in"
            style={{
              background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.05))",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              borderRadius: "28px",
              boxShadow: "0 30px 60px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Title */}
            <h2 className="font-serif-display font-semibold text-2xl text-[#111827] mb-2 text-center">
              Welcome to Mosaic
            </h2>
            <p className="text-xs text-[#6B7280] text-center mb-8 uppercase tracking-wider font-mono">
              Premium Productivity
            </p>

            {/* Google sign in button */}
            <button
              onClick={async () => {
                try {
                  await signInWithPopup(auth, googleProvider);
                } catch (e) {
                  console.error(e);
                }
              }}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer shadow-sm"
              style={{
                background: "#ffffff",
                border: "1px solid rgba(255,255,255,0.8)",
                color: "#111827",
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = "#f3f4f6";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = "#ffffff";
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
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 w-full my-5">
              <div className="flex-1 h-px bg-black/10" />
              <span className="text-xs text-[#6B7280] font-bold uppercase tracking-wider font-mono">or</span>
              <div className="flex-1 h-px bg-black/10" />
            </div>

            {/* Email sign in button (Disabled / Coming Soon) */}
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold opacity-50 cursor-not-allowed text-[#374151]"
              style={{
                background: "rgba(255, 255, 255, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.4)",
              }}
            >
              <span>Continue with Email (Coming Soon)</span>
            </button>

            {/* Developer Bypass Link */}
            <button
              onClick={onLogin}
              className="mt-6 flex items-center gap-1.5 text-xs font-bold text-[#15803d] hover:text-[#166534] transition-colors outline-none cursor-pointer"
            >
              <Zap size={13} />
              <span>Continue as Guest (Dev Bypass)</span>
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
          from { opacity: 0; transform: translate(-50%, -45%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
