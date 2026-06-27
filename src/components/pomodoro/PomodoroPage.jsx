// components/pomodoro/PomodoroPage.jsx
import { useState, useEffect, useRef } from "react";
import GlassCard from "../ui/GlassCard";
import { Play, Pause, RotateCcw, Coffee, Brain } from "lucide-react";

export default function PomodoroPage({ isActive } = {}) {
  const [studyMins, setStudyMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [isBreak, setIsBreak] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  const total = (isBreak ? breakMins : studyMins) * 60;
  const progress = 1 - secondsLeft / total;
  const saplingProgress = Math.max(0.1, progress);
  const leftBranchProgress = Math.max(0, Math.min((progress - 0.2) / 0.5, 1));
  const rightBranchProgress = Math.max(0, Math.min((progress - 0.4) / 0.5, 1));
  const canopyProgress = Math.max(0, Math.min((progress - 0.6) / 0.4, 1));

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
            if (!isBreak) setSessions((n) => n + 1);
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

  const circumference = 2 * Math.PI * 90;
  const accent = isBreak ? "#a8f0c6" : "#3dd68c";

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="font-display font-bold text-xl mb-6" style={{ color: "#f0eeff" }}>
        Pomodoro
      </h1>

      {/* Timer visual area */}
      <GlassCard className="p-8 mb-6 flex flex-col items-center">
        <div className="relative mb-4 flex items-center justify-center" style={{ width: 220, height: 180 }}>
          <svg width="220" height="180" viewBox="0 0 200 160">
            {/* Ground base */}
            <path d="M 30 150 Q 100 145 170 150" stroke="rgba(255,255,255,0.12)" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 80 149 Q 100 144 120 149" stroke="#a8f0c6" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.6" />

            {/* Trunk */}
            <path d="M 100 150 L 100 90" stroke="#3dd68c" strokeWidth="6" strokeLinecap="round" />

            {/* Left Sapling Branch */}
            <path d="M 100 125 Q 85 115 75 120" stroke="#3dd68c" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="75" cy="120" r={4 * saplingProgress} fill="#a8f0c6" />

            {/* Right Sapling Branch */}
            <path d="M 100 115 Q 115 105 125 110" stroke="#3dd68c" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="125" cy="110" r={4 * saplingProgress} fill="#a8f0c6" />

            {/* Left Upper Branch */}
            {leftBranchProgress > 0 && (
              <>
                <path d="M 100 100 Q 80 80 70 85" stroke="#3dd68c" strokeWidth={3 * leftBranchProgress} fill="none" strokeLinecap="round" />
                <circle cx="70" cy="85" r={5 * leftBranchProgress} fill="#a8f0c6" />
              </>
            )}

            {/* Right Upper Branch */}
            {rightBranchProgress > 0 && (
              <>
                <path d="M 100 95 Q 120 75 130 80" stroke="#3dd68c" strokeWidth={3 * rightBranchProgress} fill="none" strokeLinecap="round" />
                <circle cx="130" cy="80" r={5 * rightBranchProgress} fill="#a8f0c6" />
              </>
            )}

            {/* Canopy */}
            {canopyProgress > 0 && (
              <>
                <path d="M 100 90 L 100 65" stroke="#3dd68c" strokeWidth={3 * canopyProgress} fill="none" strokeLinecap="round" />
                <circle cx="100" cy="60" r={12 * canopyProgress} fill="#3dd68c" opacity="0.8" />
                <circle cx="90" cy="55" r={8 * canopyProgress} fill="#a8f0c6" opacity="0.9" />
                <circle cx="110" cy="55" r={8 * canopyProgress} fill="#a8f0c6" opacity="0.9" />
                <circle cx="100" cy="48" r={7 * canopyProgress} fill="#a8f0c6" opacity="0.95" />
              </>
            )}
          </svg>
        </div>

        {/* Timer numbers below the tree */}
        <div className="text-center mb-6">
          <div className="mb-1 flex items-center justify-center gap-1.5" style={{ color: accent }}>
            {isBreak ? <Coffee size={16} className="flex-shrink-0" /> : <Brain size={16} className="flex-shrink-0" />}
            <span className="text-xs font-mono font-semibold uppercase tracking-wider">
              {isBreak ? "Break time" : "Focus time"}
            </span>
          </div>
          <span className="font-mono text-5xl font-semibold tracking-tight block" style={{ color: "#f0eeff" }}>
            {formatTime(secondsLeft)}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={reset} className="btn-ghost flex items-center gap-1.5 text-sm">
            <RotateCcw size={14} />
            Reset
          </button>
          <button
            onClick={() => setRunning((r) => !r)}
            className="btn-primary flex items-center gap-2 px-8"
            style={{ background: accent }}
          >
            {running ? <Pause size={16} /> : <Play size={16} />}
            {running ? "Pause" : "Start"}
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all"
              style={{ background: i < sessions % 4 ? "#3dd68c" : "rgba(255,255,255,0.1)" }}
            />
          ))}
          <span className="text-xs ml-1 font-mono" style={{ color: "#7a7a9a" }}>
            {sessions} sessions
          </span>
        </div>
      </GlassCard>

      {/* Settings */}
      <GlassCard className="p-4">
        <p className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: "#7a7a9a" }}>
          Timer settings
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs mb-2 block" style={{ color: "#7a7a9a" }}>
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
              className="input-glass text-center font-mono"
            />
          </div>
          <div>
            <label className="text-xs mb-2 block" style={{ color: "#7a7a9a" }}>
              Break (min)
            </label>
            <input
              type="number"
              min={1} max={30}
              value={breakMins}
              onChange={(e) => setBreakMins(Number(e.target.value))}
              className="input-glass text-center font-mono"
            />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
