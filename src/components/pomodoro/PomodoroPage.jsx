// components/pomodoro/PomodoroPage.jsx
import { useState, useEffect, useRef } from "react";
import GlassCard from "../ui/GlassCard";
import { Play, Pause, RotateCcw, Coffee, Brain, Settings, Volume2 } from "lucide-react";
import { updateUserProfile } from "../../lib/firestore";

const SOUND_URLS = {
  rain: "https://www.soundjay.com/nature/sounds/rain-07.mp3",
  forest: "https://www.soundjay.com/nature/sounds/forest-wind-1.mp3",
  cafe: "https://www.soundjay.com/misc/sounds/coffee-shop-1.mp3",
  ocean: "https://www.soundjay.com/nature/sounds/ocean-wave-1.mp3",
  fireplace: "https://www.soundjay.com/misc/sounds/fire-1.mp3",
};

export default function PomodoroPage({ user, userContext, isActive }) {
  const [studyMins, setStudyMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [isBreak, setIsBreak] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  // Focus Statistics & World Progress States
  const [sessions, setSessions] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);

  // Audio and settings state
  const [activeSound, setActiveSound] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  // Load initial statistics from Firebase context
  useEffect(() => {
    if (userContext) {
      setSessions(userContext.pomodoroSessions || 0);
      setStreak(userContext.pomodoroStreak || 0);
      setTotalMinutes(userContext.pomodoroMinutes || 0);
    }
  }, [userContext]);

  const total = (isBreak ? breakMins : studyMins) * 60;
  const progress = 1 - secondsLeft / total;
  const stage = Math.min(6, sessions); // Sapling (0) to Village (6+)

  // Sky Gradients mapping to Pomodoro progression (Morning -> Afternoon -> Sunset -> Night)
  const getSkyColors = (prog) => {
    if (prog <= 0.25) {
      return { top: "#bae6fd", bottom: "#fed7aa" }; // Morning
    }
    if (prog <= 0.5) {
      return { top: "#38bdf8", bottom: "#e0f2fe" }; // Afternoon
    }
    if (prog <= 0.75) {
      return { top: "#c084fc", bottom: "#fdba74" }; // Sunset
    }
    return { top: "#1e1b4b", bottom: "#312e81" }; // Night
  };

  const skyColors = getSkyColors(progress);

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.8);
    } catch {}
  }

  // Timer loop
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            beep();
            setRunning(false);
            if (!isBreak) {
              const nextSessions = sessions + 1;
              const nextMinutes = totalMinutes + studyMins;
              const nextStreak = streak + 1;

              setSessions(nextSessions);
              setTotalMinutes(nextMinutes);
              setStreak(nextStreak);

              // Persist growth metrics to Firebase
              if (user?.uid) {
                updateUserProfile(user.uid, {
                  pomodoroSessions: nextSessions,
                  pomodoroMinutes: nextMinutes,
                  pomodoroStreak: nextStreak,
                }).catch(e => console.error("Firebase update failed:", e));
              }
            }
            setIsBreak((b) => !b);
            return isBreak ? studyMins * 60 : breakMins * 60;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, isBreak, studyMins, breakMins, sessions, totalMinutes, streak, user]);

  // Audio Play/Pause Sync with Timer state
  useEffect(() => {
    if (audioRef.current) {
      if (running && activeSound) {
        audioRef.current.play().catch(e => console.log("Audio play blocked by browser:", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [running, activeSound]);

  // Audio source source update
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (activeSound) {
        audioRef.current.src = SOUND_URLS[activeSound];
        audioRef.current.loop = true;
        if (running) {
          audioRef.current.play().catch(e => console.log("Audio play blocked by browser:", e));
        }
      }
    }
  }, [activeSound]);

  function reset() {
    setRunning(false);
    setIsBreak(false);
    setSecondsLeft(studyMins * 60);
  }

  function formatTime(s) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  const accent = isBreak ? "#15803d" : "#111827";

  return (
    <div className="max-w-md mx-auto px-4 py-6 text-[#111827] animate-page-enter">
      <h1 className="font-display font-bold text-xl mb-6 text-[#111827]">
        Focus Timer
      </h1>

      {/* Embedded Audio Element */}
      <audio ref={audioRef} />

      {/* Main glass card timer container */}
      <div
        className="p-8 flex flex-col items-center w-full"
        style={{
          background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04))",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          borderRadius: "28px",
        }}
      >
        {/* Dynamic Focus World SVG */}
        <div className="relative mb-5 flex items-center justify-center rounded-2xl overflow-hidden shadow-inner border border-white/10" style={{ width: 240, height: 160 }}>
          <svg width="240" height="160" viewBox="0 0 200 160" className="overflow-hidden">
            <defs>
              {/* Dynamic sky gradient stops */}
              <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={skyColors.top} style={{ transition: "stop-color 1s ease" }} />
                <stop offset="100%" stopColor={skyColors.bottom} style={{ transition: "stop-color 1s ease" }} />
              </linearGradient>
              <linearGradient id="islandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="30%" stopColor="#22c55e" />
                <stop offset="70%" stopColor="#854d0e" />
                <stop offset="100%" stopColor="#713f12" />
              </linearGradient>
              <radialGradient id="islandGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3dd68c" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3dd68c" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Sharp Background Sky */}
            <rect width="200" height="160" fill="url(#skyGrad)" />

            {/* Glowing ring/aura around the world */}
            <ellipse cx="100" cy="130" rx="65" ry="20" fill="url(#islandGlow)" />

            {/* Floating Island Base */}
            <path d="M 35 130 C 35 116, 165 116, 165 130 C 165 144, 140 154, 100 154 C 60 154, 35 144, 35 130 Z" fill="url(#islandGrad)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <ellipse cx="100" cy="128" rx="61" ry="9" fill="#166534" opacity="0.85" />

            {/* Static Rock (Always Displays) */}
            <path d="M 142 133 C 139 133, 137 127, 144 126 C 150 125, 152 131, 146 133 Z" fill="#9ca3af" stroke="#4b5563" strokeWidth="0.8" />

            {/* Static Flowers (Always Displays) */}
            <g className="flowers text-[#ff87ab]">
              {/* Pink Flower 1 */}
              <circle cx="55" cy="134" r="2" fill="#fbcfe8" />
              <circle cx="55" cy="134" r="0.6" fill="#facc15" />
              {/* Orange Flower 2 */}
              <circle cx="125" cy="135" r="1.8" fill="#ffedd5" />
              <circle cx="125" cy="135" r="0.5" fill="#f97316" />
            </g>

            {/* Stage 0: Small Sapling Sprout */}
            {stage === 0 && (
              <g>
                <path d="M 100 128 Q 98 116 100 110" stroke="#713f12" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M 100 115 Q 92 110 93 118" fill="#4ade80" />
                <path d="M 100 110 Q 108 105 109 113" fill="#22c55e" />
              </g>
            )}

            {/* Stage 1: Small Tree */}
            {stage === 1 && (
              <g>
                <path d="M 100 128 Q 100 110 100 90" stroke="#713f12" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="100" cy="84" r="15" fill="#166534" />
                <circle cx="94" cy="80" r="10" fill="#22c55e" opacity="0.9" />
              </g>
            )}

            {/* Stage 2+: Mature Tree Base */}
            {stage >= 2 && (
              <g>
                {/* Thick mature trunk */}
                <path d="M 97 128 L 97 88 Q 100 88 103 88 L 103 128 Z" fill="#713f12" />
                <path d="M 100 102 Q 85 92 82 95" stroke="#713f12" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M 100 96 Q 115 88 118 91" stroke="#713f12" strokeWidth="3" fill="none" strokeLinecap="round" />
                {/* Large Canopy */}
                <circle cx="100" cy="78" r="24" fill="#14532d" opacity="0.88" />
                <circle cx="85" cy="82" r="17" fill="#166534" opacity="0.9" />
                <circle cx="115" cy="82" r="17" fill="#166534" opacity="0.9" />
                <circle cx="100" cy="62" r="15" fill="#22c55e" opacity="0.95" />
              </g>
            )}

            {/* Stage 3+: Flowering Tree Additions */}
            {stage >= 3 && (
              <g className="animate-pulse">
                <circle cx="92" cy="74" r="2.8" fill="#fbcfe8" />
                <circle cx="108" cy="78" r="3.2" fill="#fbcfe8" />
                <circle cx="82" cy="86" r="2.8" fill="#fbcfe8" />
                <circle cx="118" cy="86" r="2.2" fill="#fbcfe8" />
                <circle cx="100" cy="58" r="3.2" fill="#fbcfe8" />
              </g>
            )}

            {/* Stage 4+: Treehouse Additions */}
            {stage >= 4 && (
              <g>
                {/* Platform */}
                <line x1="88" y1="96" x2="112" y2="96" stroke="#d97706" strokeWidth="3.2" strokeLinecap="round" />
                {/* Rope Ladder */}
                <line x1="100" y1="96" x2="100" y2="128" stroke="#b45309" strokeWidth="1.2" strokeDasharray="3,2" />
                {/* House Walls & Roof */}
                <rect x="92" y="85" width="16" height="11" fill="#78350f" rx="1" />
                <polygon points="90,85 100,77 110,85" fill="#b91c1c" />
                {/* Window glow */}
                <rect x="98" y="90" width="4" height="5" fill="#fef08a" />
              </g>
            )}

            {/* Stage 5+: Windmill Additions */}
            {stage >= 5 && (
              <g>
                {/* Windmill Tower */}
                <polygon points="54,128 58,98 66,98 70,128" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="0.8" />
                <polygon points="56,98 62,88 68,98" fill="#b91c1c" />
                {/* Rotating Windmill Sails */}
                <g className="animate-spin-slow" style={{ transformOrigin: "62px 98px" }}>
                  <line x1="62" y1="98" x2="62" y2="76" stroke="#4b5563" strokeWidth="1.2" />
                  <line x1="62" y1="98" x2="62" y2="120" stroke="#4b5563" strokeWidth="1.2" />
                  <line x1="62" y1="98" x2="40" y2="98" stroke="#4b5563" strokeWidth="1.2" />
                  <line x1="62" y1="98" x2="84" y2="98" stroke="#4b5563" strokeWidth="1.2" />
                  {/* Blades */}
                  <polygon points="62,76 65,84 62,84" fill="#ffffff" />
                  <polygon points="62,120 59,112 62,112" fill="#ffffff" />
                  <polygon points="40,98 48,95 48,98" fill="#ffffff" />
                  <polygon points="84,98 76,101 76,98" fill="#ffffff" />
                </g>
              </g>
            )}

            {/* Stage 6+: Tiny Village Additions */}
            {stage >= 6 && (
              <g>
                {/* Houses */}
                <rect x="74" y="121" width="10" height="9" fill="#f9fafb" stroke="#d1d5db" strokeWidth="0.8" rx="0.5" />
                <polygon points="72,121 79,116 86,121" fill="#d97706" />

                <rect x="120" y="122" width="12" height="9" fill="#f9fafb" stroke="#d1d5db" strokeWidth="0.8" rx="0.5" />
                <polygon points="118,122 126,117 134,122" fill="#4f46e5" />
                
                {/* Path */}
                <path d="M 64 128 C 76 130, 95 128, 120 129" stroke="#fed7aa" strokeWidth="1.5" fill="none" opacity="0.5" strokeDasharray="2,2" />
              </g>
            )}
          </svg>
        </div>

        {/* Timer numbers below Focus World */}
        <div className="text-center mb-5">
          <div className="mb-1 flex items-center justify-center gap-1.5" style={{ color: accent }}>
            {isBreak ? <Coffee size={16} className="flex-shrink-0" /> : <Brain size={16} className="flex-shrink-0" />}
            <span className="text-xs font-mono font-semibold uppercase tracking-wider">
              {isBreak ? "Break time" : "Focus time"}
            </span>
          </div>
          <span className="font-mono text-5xl font-semibold tracking-tight block text-[#111827]">
            {formatTime(secondsLeft)}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-4">
          <button 
            onClick={reset} 
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer border border-[#111827]/10 hover:bg-black/5 bg-transparent text-[#111827] flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            onClick={() => setRunning((r) => !r)}
            className="btn-primary flex items-center gap-2 px-8 rounded-xl font-bold cursor-pointer"
            style={{ background: isBreak ? "#22c55e" : "#3dd68c" }}
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? "Pause" : "Start"}
          </button>
        </div>

        {/* Ambient Sound Selector */}
        <div className="mt-5 w-full flex flex-col items-center border-t border-[#111827]/5 pt-4">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#111827]/60 font-bold mb-2 font-mono">
            <Volume2 size={11} />
            <span>Ambient Sound</span>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {[
              { id: null, label: "Off" },
              { id: "rain", label: "Rain" },
              { id: "forest", label: "Forest" },
              { id: "cafe", label: "Cafe" },
              { id: "ocean", label: "Ocean" },
              { id: "fireplace", label: "Fire" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSound(s.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer border transition-all duration-200 ${
                  activeSound === s.id
                    ? "bg-[#3dd68c] border-[#3dd68c] text-[#0c0e13]"
                    : "bg-white/15 border-[#111827]/10 text-[#111827] hover:bg-black/5"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible Timer Settings Trigger */}
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-[#111827]/70 hover:text-[#111827] transition-colors cursor-pointer border border-[#111827]/10 bg-white/10 px-3 py-1.5 rounded-full"
        >
          <Settings size={13} />
          <span>Timer Settings</span>
        </button>

        {/* Collapsible Settings Panel */}
        {settingsOpen && (
          <div className="w-full mt-4 p-4 rounded-2xl bg-white/15 border border-white/20 animate-page-enter">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs mb-1.5 block text-[#111827]/70 font-medium">
                  Focus (min)
                </label>
                <input
                  type="number"
                  min={1} max={90}
                  value={studyMins}
                  onChange={(e) => {
                    setStudyMins(Number(e.target.value));
                    if (!running) setSecondsLeft(Number(e.target.value) * 60);
                  }}
                  className="w-full text-center bg-white/30 rounded-lg px-3 py-1.5 text-xs text-[#111827] outline-none border border-[#111827]/10 font-mono"
                />
              </div>
              <div>
                <label className="text-xs mb-1.5 block text-[#111827]/70 font-medium">
                  Break (min)
                </label>
                <input
                  type="number"
                  min={1} max={30}
                  value={breakMins}
                  onChange={(e) => setBreakMins(Number(e.target.value))}
                  className="w-full text-center bg-white/30 rounded-lg px-3 py-1.5 text-xs text-[#111827] outline-none border border-[#111827]/10 font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* statistics Row */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-5 mx-auto">
        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-[28px] border border-white/15 text-[#111827] shadow-sm">
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-60 mb-0.5">🍅 Sessions</span>
          <span className="font-mono font-bold text-lg">{sessions}</span>
        </div>
        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-[28px] border border-white/15 text-[#111827] shadow-sm">
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-60 mb-0.5">⏱️ Minutes</span>
          <span className="font-mono font-bold text-lg">{totalMinutes}m</span>
        </div>
        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-[28px] border border-white/15 text-[#111827] shadow-sm">
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-60 mb-0.5">🔥 Streak</span>
          <span className="font-mono font-bold text-lg">{streak}</span>
        </div>
      </div>

      {/* Windmill & Sway Animations */}
      <style>{`
        .animate-spin-slow {
          transform-origin: 62px 98px;
          animation: rotateSlow 8s linear infinite;
        }
        .animate-sway-slow {
          transform-origin: 100px 128px;
          animation: swaySlow 4s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: floatSlow 5s ease-in-out infinite;
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes swaySlow {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
