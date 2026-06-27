// components/pomodoro/PomodoroPage.jsx
import { useState, useEffect, useRef } from "react";
import GlassCard from "../ui/GlassCard";
import { Play, Pause, RotateCcw, Coffee, Brain, Settings } from "lucide-react";

export default function PomodoroPage({ isActive } = {}) {
  const [studyMins, setStudyMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [isBreak, setIsBreak] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  
  // Persist Focus Stats & World Progress
  const [sessions, setSessions] = useState(() => {
    return Number(localStorage.getItem("pomo_sessions") || 0);
  });
  const [streak, setStreak] = useState(() => {
    return Number(localStorage.getItem("pomo_streak") || 0);
  });
  const [totalMinutes, setTotalMinutes] = useState(() => {
    return Number(localStorage.getItem("pomo_minutes") || 0);
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const intervalRef = useRef(null);

  const total = (isBreak ? breakMins : studyMins) * 60;
  const progress = 1 - secondsLeft / total;
  const stage = Math.min(5, sessions);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem("pomo_sessions", sessions);
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("pomo_streak", streak);
  }, [streak]);

  useEffect(() => {
    localStorage.setItem("pomo_minutes", totalMinutes);
  }, [totalMinutes]);

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

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            beep();
            setRunning(false);
            if (!isBreak) {
              setSessions((n) => n + 1);
              setTotalMinutes((m) => m + studyMins);
              setStreak((st) => st + 1);
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
  }, [running, isBreak, studyMins, breakMins]);

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

      {/* Timer visual area inside glass panel */}
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
        {/* Focus World SVG */}
        <div className="relative mb-4 flex items-center justify-center" style={{ width: 240, height: 160 }}>
          <svg width="240" height="160" viewBox="0 0 200 160" className="overflow-visible">
            <defs>
              <linearGradient id="islandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="30%" stopColor="#22c55e" />
                <stop offset="70%" stopColor="#854d0e" />
                <stop offset="100%" stopColor="#713f12" />
              </linearGradient>
              <radialGradient id="islandGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3dd68c" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3dd68c" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Glowing ring/aura around the world */}
            <ellipse cx="100" cy="130" rx="65" ry="20" fill="url(#islandGlow)" />
            <ellipse cx="100" cy="130" rx="55" ry="14" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="5,4" className="animate-spin-slow" />

            {/* Floating Island Base */}
            <path d="M 45 130 C 45 120, 155 120, 155 130 C 155 142, 135 152, 100 152 C 65 152, 45 142, 45 130 Z" fill="url(#islandGrad)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <ellipse cx="100" cy="128" rx="51" ry="8" fill="#166534" opacity="0.8" />

            {/* Tree Growth Stages */}
            {stage === 0 && (
              // Sprouts seeds / dirt pile
              <g className="transition-all duration-500">
                <path d="M 92 128 Q 100 120 108 128 Z" fill="#713f12" />
                <circle cx="100" cy="124" r="2.5" fill="#3dd68c" className="animate-pulse" />
              </g>
            )}

            {stage >= 1 && (
              // Trunk
              <path
                d={`M 100 128 L 100 ${128 - Math.min(48, stage * 9)}`}
                stroke="#713f12"
                strokeWidth={stage >= 3 ? "5.5" : "3.5"}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )}

            {stage >= 2 && (
              // Left sprout leaf
              <path
                d={`M 100 ${128 - Math.min(20, stage * 4)} Q 85 ${118 - Math.min(20, stage * 4)} 82 ${122 - Math.min(20, stage * 4)}`}
                stroke="#22c55e"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                className="transition-all duration-500 animate-sway-slow"
              />
            )}

            {stage >= 3 && (
              // Right branch
              <path
                d={`M 100 ${128 - Math.min(32, stage * 6)} Q 115 ${116 - Math.min(32, stage * 6)} 118 ${120 - Math.min(32, stage * 6)}`}
                stroke="#713f12"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )}

            {stage >= 4 && (
              // Canopy leaves
              <g className="transition-all duration-500 animate-float-slow">
                <circle cx="100" cy={128 - Math.min(48, stage * 9) - 5} r={Math.min(24, (stage - 3) * 11)} fill="#166534" opacity="0.85" />
                <circle cx="88" cy={128 - Math.min(48, stage * 9) - 10} r={Math.min(16, (stage - 3) * 7)} fill="#22c55e" opacity="0.9" />
                <circle cx="112" cy={128 - Math.min(48, stage * 9) - 10} r={Math.min(16, (stage - 3) * 7)} fill="#22c55e" opacity="0.9" />
                <circle cx="100" cy={128 - Math.min(48, stage * 9) - 18} r={Math.min(14, (stage - 3) * 6)} fill="#4ade80" opacity="0.95" />
              </g>
            )}

            {stage >= 5 && (
              // Glowing flower blossoms
              <g className="transition-all duration-700 animate-pulse">
                <circle cx="95" cy={128 - Math.min(48, stage * 9) - 15} r="3" fill="#fbcfe8" />
                <circle cx="105" cy={128 - Math.min(48, stage * 9) - 12} r="3" fill="#fbcfe8" />
                <circle cx="102" cy={128 - Math.min(48, stage * 9) - 22} r="3.5" fill="#fbcfe8" />
                <circle cx="90" cy={128 - Math.min(48, stage * 9) - 4} r="2.5" fill="#fbcfe8" />
                <circle cx="110" cy={128 - Math.min(48, stage * 9) - 4} r="2.5" fill="#fbcfe8" />
              </g>
            )}
          </svg>
        </div>

        {/* Timer numbers below the tree */}
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

        {/* Settings Toggle button */}
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

      {/* Stats Badges */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-5 mx-auto">
        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-[28px] border border-white/15 text-[#111827] shadow-sm">
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-60 mb-0.5">Sessions</span>
          <span className="font-mono font-bold text-lg">{sessions}</span>
        </div>
        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-[28px] border border-white/15 text-[#111827] shadow-sm">
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-60 mb-0.5">Streak</span>
          <span className="font-mono font-bold text-lg">🔥 {streak}</span>
        </div>
        <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-[28px] border border-white/15 text-[#111827] shadow-sm">
          <span className="text-[10px] uppercase tracking-wider font-bold opacity-60 mb-0.5">Focus Time</span>
          <span className="font-mono font-bold text-lg">{totalMinutes}m</span>
        </div>
      </div>

      {/* Tree Sway and Orbit Animations */}
      <style>{`
        .animate-spin-slow {
          transform-origin: 100px 130px;
          animation: rotateSlow 20s linear infinite;
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
