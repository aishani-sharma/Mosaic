// components/pomodoro/PomodoroPage.jsx
import { useState, useEffect, useRef } from "react";
import GlassCard from "../ui/GlassCard";
import { Play, Pause, RotateCcw, Coffee, Brain } from "lucide-react";

export default function PomodoroPage() {
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

      {/* Timer ring */}
      <GlassCard className="p-8 mb-6 flex flex-col items-center">
        <div className="relative mb-6" style={{ width: 220, height: 220 }}>
          <svg width="220" height="220" className="absolute inset-0 -rotate-90">
            <circle cx="110" cy="110" r="90" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
            <circle
              cx="110" cy="110" r="90"
              fill="none"
              stroke={accent}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s ease", filter: `drop-shadow(0 0 8px ${accent})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="mb-1" style={{ color: accent }}>
              {isBreak ? <Coffee size={20} /> : <Brain size={20} />}
            </div>
            <span className="font-mono text-4xl font-medium" style={{ color: "#f0eeff" }}>
              {formatTime(secondsLeft)}
            </span>
            <span className="text-xs mt-1 font-mono" style={{ color: "#7a7a9a" }}>
              {isBreak ? "Break time" : "Focus time"}
            </span>
          </div>
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
