import { useEffect, useRef, useState } from "react";
import Lottie from "lottie-react";
import { Play, Pause, RotateCcw, Coffee, Brain, Settings, Volume2, Sparkles } from "lucide-react";
import GlassCard from "../ui/GlassCard";
import { updateUserProfile } from "../../lib/firestore";

const SOUND_URLS = {
  rain: "/sounds/rain.wav",
  forest: "/sounds/forest.wav",
  cafe: "/sounds/cafe.wav",
  ocean: "/sounds/ocean.wav",
  fireplace: "/sounds/fireplace.wav",
};

const SOUND_OPTIONS = [
  { id: "rain", label: "Rain" },
  { id: "forest", label: "Forest" },
  { id: "cafe", label: "Cafe" },
  { id: "ocean", label: "Ocean" },
  { id: "fireplace", label: "Fire" },
  { id: null, label: "Off" },
];

const STAGES = [
  { label: "Seed", note: "The ritual begins." },
  { label: "Tree", note: "Roots are settling in." },
  { label: "Flowers", note: "Momentum is starting to bloom." },
  { label: "Cottage", note: "Your focus now feels lived-in." },
  { label: "Windmill", note: "The whole scene has motion." },
  { label: "Cozy Village", note: "Deep work built a place worth returning to." },
];

const SOUND_KEY = "mosaic_pomodoro_sound";
const VOLUME_KEY = "mosaic_pomodoro_volume";

export default function PomodoroPage({ user, userContext }) {
  const [studyMins, setStudyMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [isBreak, setIsBreak] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [activeSound, setActiveSound] = useState(() => localStorage.getItem(SOUND_KEY) || "rain");
  const [volume, setVolume] = useState(() => Number(localStorage.getItem(VOLUME_KEY) || 0.45));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [celebration, setCelebration] = useState({ active: false, milestone: false, label: "" });
  const [ambientAnimation, setAmbientAnimation] = useState(null);

  const audioRef = useRef(null);
  const chimeRef = useRef(null);
  const intervalRef = useRef(null);
  const fadeRef = useRef(null);
  const celebrationTimeoutRef = useRef(null);
  const statsRef = useRef({ sessions: 0, streak: 0, totalMinutes: 0 });

  statsRef.current = { sessions, streak, totalMinutes };

  useEffect(() => {
    if (userContext) {
      setSessions((prev) => Math.max(prev, userContext.pomodoroSessions || 0));
      setStreak((prev) => Math.max(prev, userContext.pomodoroStreak || 0));
      setTotalMinutes((prev) => Math.max(prev, userContext.pomodoroMinutes || 0));
    }
  }, [userContext]);

  useEffect(() => {
    fetch("/lottie/focus-ambient.json")
      .then((res) => res.json())
      .then(setAmbientAnimation)
      .catch(() => {});
  }, []);

  useEffect(() => {
    localStorage.setItem(SOUND_KEY, activeSound || "");
  }, [activeSound]);

  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume));
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const total = (isBreak ? breakMins : studyMins) * 60;
  const progress = 1 - secondsLeft / total;
  const stage = Math.min(STAGES.length - 1, sessions);
  const stageMeta = STAGES[stage];
  const nextStage = STAGES[Math.min(stage + 1, STAGES.length - 1)];
  const sessionsToNext = stage === STAGES.length - 1 ? 0 : stage + 1 - sessions;
  const worldProgress = Math.min(100, (sessions / (STAGES.length - 1)) * 100);

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.16, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  function clearFade() {
    if (fadeRef.current) {
      window.clearInterval(fadeRef.current);
      fadeRef.current = null;
    }
  }

  function fadeAmbient(nextSound, shouldResume = running) {
    const audio = audioRef.current;
    if (!audio) return;

    clearFade();

    const targetVolume = volume;
    const stepMs = 50;
    const stepSize = Math.max(targetVolume / 6, 0.04);
    const swapSource = () => {
      if (!nextSound) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        audio.volume = targetVolume;
        return;
      }

      audio.src = SOUND_URLS[nextSound];
      audio.loop = true;
      audio.volume = 0;
      if (!shouldResume) return;

      audio.play().catch(() => {});
      fadeRef.current = window.setInterval(() => {
        const nextVolume = Math.min(targetVolume, audio.volume + stepSize);
        audio.volume = nextVolume;
        if (nextVolume >= targetVolume) {
          clearFade();
        }
      }, stepMs);
    };

    if (!audio.src || audio.paused || audio.volume <= 0.01) {
      swapSource();
      return;
    }

    fadeRef.current = window.setInterval(() => {
      const nextVolume = Math.max(0, audio.volume - stepSize);
      audio.volume = nextVolume;
      if (nextVolume <= 0.01) {
        clearFade();
        audio.pause();
        swapSource();
      }
    }, stepMs);
  }

  function triggerCelebration(nextStageIndex, milestoneReached) {
    if (celebrationTimeoutRef.current) {
      window.clearTimeout(celebrationTimeoutRef.current);
    }

    if (chimeRef.current) {
      chimeRef.current.currentTime = 0;
      chimeRef.current.play().catch(() => {});
    }

    setCelebration({
      active: true,
      milestone: milestoneReached,
      label: milestoneReached ? `${STAGES[nextStageIndex].label} unlocked` : "Session complete",
    });

    celebrationTimeoutRef.current = window.setTimeout(() => {
      setCelebration({ active: false, milestone: false, label: "" });
    }, 2400);
  }

  function completeFocusSession() {
    const nextSessions = statsRef.current.sessions + 1;
    const nextMinutes = statsRef.current.totalMinutes + studyMins;
    const nextStreak = statsRef.current.streak + 1;
    const currentStageIndex = Math.min(STAGES.length - 1, statsRef.current.sessions);
    const nextStageIndex = Math.min(STAGES.length - 1, nextSessions);
    const milestoneReached = nextStageIndex > currentStageIndex;

    setSessions(nextSessions);
    setTotalMinutes(nextMinutes);
    setStreak(nextStreak);
    triggerCelebration(nextStageIndex, milestoneReached);

    if (user?.uid) {
      updateUserProfile(user.uid, {
        pomodoroSessions: nextSessions,
        pomodoroMinutes: nextMinutes,
        pomodoroStreak: nextStreak,
      }).catch((e) => console.error("Firebase update failed:", e));
    }
  }

  useEffect(() => {
    if (running) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            beep();
            setRunning(false);
            if (!isBreak) {
              completeFocusSession();
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.loop = true;
    audio.volume = volume;

    if (!activeSound) {
      audio.pause();
      return;
    }

    if (running) {
      if (!audio.src) {
        audio.src = SOUND_URLS[activeSound];
      }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [running, volume]);

  useEffect(() => {
    if (!audioRef.current) return;
    fadeAmbient(activeSound, running);
    return clearFade;
  }, [activeSound]);

  useEffect(() => {
    return () => {
      clearFade();
      if (celebrationTimeoutRef.current) {
        window.clearTimeout(celebrationTimeoutRef.current);
      }
    };
  }, []);

  function handleStartPause() {
    if (!running && activeSound && audioRef.current) {
      if (!audioRef.current.src) {
        audioRef.current.src = SOUND_URLS[activeSound];
      }
      audioRef.current.volume = volume;
      audioRef.current.play().catch(() => {});
    }
    setRunning((r) => !r);
  }

  function reset() {
    setRunning(false);
    setIsBreak(false);
    setSecondsLeft(studyMins * 60);
  }

  function formatTime(s) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  const accent = isBreak ? "#5d90ff" : "#18252d";
  const confetti = Array.from({ length: 18 }, (_, index) => ({
    id: index,
    left: 6 + index * 5.2,
    delay: (index % 6) * 0.08,
    duration: 1.7 + (index % 4) * 0.18,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 text-[#18252d] animate-page-enter">
      <audio ref={audioRef} />
      <audio ref={chimeRef} src="/sounds/completion-chime.wav" preload="auto" />

      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#5d6a72] font-semibold mb-2">Focus Studio</p>
          <h1 className="font-display font-bold text-3xl text-[#18252d]">Pomodoro</h1>
          <p className="text-sm text-[#53626b] mt-1">Build your village one uninterrupted session at a time.</p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-white/60 shadow-[0_12px_32px_rgba(81,75,61,0.08)]">
          <Sparkles size={14} className="text-[#c38f46]" />
          <span className="text-xs font-semibold text-[#42515a]">{stageMeta.label}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.35fr_0.85fr] gap-5 items-start">
        <GlassCard className={`p-4 md:p-5 overflow-hidden relative ${celebration.active ? "pomodoro-glow" : ""}`}>
          <div className="pomodoro-aura" />
          <div className="relative rounded-[30px] overflow-hidden border border-white/60 bg-[linear-gradient(180deg,rgba(255,252,247,0.74),rgba(225,237,242,0.68))] min-h-[460px]">
            {ambientAnimation && (
              <div className="absolute inset-0 opacity-90 pointer-events-none">
                <Lottie animationData={ambientAnimation} loop autoplay className="h-full w-full scale-[1.08]" />
              </div>
            )}

            <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),transparent_70%)] pointer-events-none" />
            <div className="absolute inset-x-8 top-8 flex justify-between opacity-70 pointer-events-none">
              <div className="pomodoro-cloud pomodoro-cloud-left" />
              <div className="pomodoro-cloud pomodoro-cloud-right" />
            </div>

            {celebration.active && (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,247,214,0.42),transparent_62%)] pointer-events-none animate-pulse" />
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {confetti.map((piece) => (
                    <span
                      key={piece.id}
                      className="pomodoro-confetti"
                      style={{
                        left: `${piece.left}%`,
                        animationDelay: `${piece.delay}s`,
                        animationDuration: `${piece.duration}s`,
                      }}
                    />
                  ))}
                </div>
                <div className="absolute top-5 left-1/2 -translate-x-1/2 rounded-full border border-white/70 bg-white/70 px-4 py-2 backdrop-blur-md shadow-[0_10px_24px_rgba(81,75,61,0.12)]">
                  <span className="text-xs font-semibold tracking-wide text-[#42515a]">{celebration.label}</span>
                </div>
              </>
            )}

            <div className="absolute inset-x-0 bottom-0 h-[54%] bg-[linear-gradient(180deg,rgba(170,207,178,0.02),rgba(131,180,137,0.3)_30%,rgba(90,132,88,0.6)_100%)] pointer-events-none" />
            <div className="absolute left-1/2 top-[28%] -translate-x-1/2 w-[54%] h-20 rounded-[999px] bg-[radial-gradient(circle,rgba(255,245,214,0.42),rgba(255,245,214,0)_72%)] pointer-events-none" />

            <div className="absolute left-1/2 top-[32%] -translate-x-1/2 w-[56%] h-20 rounded-[50%] bg-[linear-gradient(180deg,#7db08a,#55795e)] shadow-[inset_0_10px_22px_rgba(255,255,255,0.22),0_30px_50px_rgba(62,92,71,0.25)]">
              <div className="absolute inset-x-10 top-4 h-3 rounded-full bg-white/20" />
              <div className="absolute left-[18%] top-6 h-3 w-7 rounded-full bg-[#f4d3bd]/30 rotate-[10deg]" />
              <div className="absolute right-[21%] top-8 h-3 w-8 rounded-full bg-[#f4d3bd]/25 -rotate-[12deg]" />

              <div className={`pomodoro-stage pomodoro-seed ${stage === 0 ? "unlocked" : ""}`}>
                <div className="pomodoro-stage-motion">
                <span className="pomodoro-seed-core" />
                <span className="pomodoro-seed-leaf leaf-left" />
                <span className="pomodoro-seed-leaf leaf-right" />
                </div>
              </div>

              <div className={`pomodoro-stage pomodoro-tree ${stage === 1 ? "unlocked" : ""}`}>
                <div className="pomodoro-stage-motion">
                <span className="trunk" />
                <span className="canopy canopy-a" />
                <span className="canopy canopy-b" />
                <span className="canopy canopy-c" />
                </div>
              </div>

              <div className={`pomodoro-stage pomodoro-flowers ${stage === 2 ? "unlocked" : ""}`}>
                <div className="pomodoro-stage-motion">
                {Array.from({ length: 6 }, (_, index) => (
                  <span key={index} className={`bloom bloom-${index + 1}`} />
                ))}
                </div>
              </div>

              <div className={`pomodoro-stage pomodoro-cottage ${stage === 3 ? "unlocked" : ""}`}>
                <div className="pomodoro-stage-motion">
                <span className="house" />
                <span className="roof" />
                <span className="window" />
                <span className="door" />
                </div>
              </div>

              <div className={`pomodoro-stage pomodoro-windmill ${stage === 4 ? "unlocked" : ""}`}>
                <div className="pomodoro-stage-motion">
                <span className="tower" />
                <span className="cap" />
                <span className="hub" />
                <span className="blade blade-a" />
                <span className="blade blade-b" />
                </div>
              </div>

              <div className={`pomodoro-stage pomodoro-village ${stage === 5 ? "unlocked" : ""}`}>
                <div className="pomodoro-stage-motion">
                <span className="home home-a" />
                <span className="home home-b" />
                <span className="home home-c" />
                <span className="path" />
                <span className="lantern" />
                </div>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
              <div className="rounded-[28px] border border-white/65 bg-white/55 backdrop-blur-xl shadow-[0_18px_50px_rgba(81,75,61,0.12)] px-5 py-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="mb-1 flex items-center gap-2" style={{ color: accent }}>
                      {isBreak ? <Coffee size={16} /> : <Brain size={16} />}
                      <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.28em]">
                        {isBreak ? "Break window" : "Focus window"}
                      </span>
                    </div>
                    <span className="font-mono text-5xl md:text-6xl font-semibold tracking-tight block text-[#18252d]">
                      {formatTime(secondsLeft)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-[#7a878f] font-semibold mb-2">Growth</div>
                    <div className="w-24 h-2.5 rounded-full bg-white/70 overflow-hidden border border-white/70">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,#7eb8d3,#8bc49d)] transition-all duration-700" style={{ width: `${Math.max(progress * 100, 5)}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={reset}
                    className="btn-ghost px-5 py-2.5 rounded-2xl text-sm font-semibold flex items-center gap-2"
                  >
                    <RotateCcw size={14} />
                    Reset
                  </button>
                  <button
                    onClick={handleStartPause}
                    className="btn-primary flex items-center gap-2 px-7 py-2.5 rounded-2xl font-bold"
                  >
                    {running ? <Pause size={16} /> : <Play size={16} />}
                    {running ? "Pause" : "Start"}
                  </button>
                  <span className="text-xs font-medium text-[#53626b]">
                    {sessionsToNext > 0 ? `${sessionsToNext} session${sessionsToNext > 1 ? "s" : ""} to ${nextStage.label}` : "Village complete"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="flex flex-col gap-4">
          <GlassCard className="p-4 md:p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#6c787f] font-semibold mb-1">Scene Progress</p>
                <h2 className="font-display text-xl font-bold text-[#18252d]">{stageMeta.label}</h2>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#53626b]">Completed sessions</div>
                <div className="font-mono text-2xl font-bold text-[#18252d]">{sessions}</div>
              </div>
            </div>
            <p className="text-sm text-[#53626b] mb-4">{stageMeta.note}</p>
            <div className="mb-4">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-[#7a878f] font-semibold mb-2">
                <span>Village growth</span>
                <span>{Math.round(worldProgress)}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/55 border border-white/65 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#9ed6a2,#7eb8d3)] transition-all duration-700"
                  style={{ width: `${Math.max(worldProgress, 5)}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STAGES.map((item, index) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border px-3 py-3 transition-all duration-500 ${
                    index <= stage
                      ? "bg-white/70 border-white/70 shadow-[0_10px_26px_rgba(81,75,61,0.08)]"
                      : "bg-white/30 border-white/40 opacity-70"
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a878f] font-semibold mb-1">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="font-semibold text-sm text-[#25343d]">{item.label}</div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4 md:p-5">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[#6c787f] font-semibold mb-4">
              <Volume2 size={13} />
              <span>Ambient</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {SOUND_OPTIONS.map((sound) => (
                <button
                  key={sound.label}
                  onClick={() => setActiveSound(sound.id)}
                  className={`px-3 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ${
                    activeSound === sound.id
                      ? "bg-[#7eb8d3] text-white border-[#7eb8d3] shadow-[0_12px_28px_rgba(126,184,211,0.28)]"
                      : "bg-white/45 text-[#25343d] border-white/60 hover:bg-white/70"
                  }`}
                >
                  {sound.label}
                </button>
              ))}
            </div>

            <label className="block text-xs font-semibold text-[#53626b] mb-2">Volume</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-[#6aa8c4]"
            />
            <p className="text-xs text-[#6c787f] mt-2">Sound starts with the timer, pauses with it, and remembers your last setup.</p>
          </GlassCard>

          <GlassCard className="p-4 md:p-5">
            <button
              onClick={() => setSettingsOpen((open) => !open)}
              className="w-full flex items-center justify-between gap-3 text-left"
            >
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#6c787f] font-semibold mb-1">Timer Settings</p>
                <h3 className="font-display text-lg font-bold text-[#18252d]">Session lengths</h3>
              </div>
              <Settings size={16} className={`transition-transform duration-300 ${settingsOpen ? "rotate-90" : ""}`} />
            </button>

            {settingsOpen && (
              <div className="grid grid-cols-2 gap-3 mt-4 animate-page-enter">
                <div>
                  <label className="text-xs mb-1.5 block text-[#53626b] font-medium">Focus (min)</label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={studyMins}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setStudyMins(next);
                      if (!running && !isBreak) setSecondsLeft(next * 60);
                    }}
                    className="w-full text-center bg-white/65 rounded-xl px-3 py-2 text-sm text-[#18252d] outline-none border border-white/70 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs mb-1.5 block text-[#53626b] font-medium">Break (min)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={breakMins}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setBreakMins(next);
                      if (!running && isBreak) setSecondsLeft(next * 60);
                    }}
                    className="w-full text-center bg-white/65 rounded-xl px-3 py-2 text-sm text-[#18252d] outline-none border border-white/70 font-mono"
                  />
                </div>
              </div>
            )}
          </GlassCard>

          <div className="grid grid-cols-3 gap-3">
            <GlassCard className="p-4 text-center">
              <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#7a878f] block mb-1">Sessions</span>
              <span className="font-mono font-bold text-2xl text-[#18252d]">{sessions}</span>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#7a878f] block mb-1">Minutes</span>
              <span className="font-mono font-bold text-2xl text-[#18252d]">{totalMinutes}m</span>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-[#7a878f] block mb-1">Streak</span>
              <span className="font-mono font-bold text-2xl text-[#18252d]">{streak}</span>
            </GlassCard>
          </div>
        </div>
      </div>

      <style>{`
        .pomodoro-glow {
          box-shadow: 0 0 0 1px rgba(255,255,255,0.4), 0 24px 64px rgba(255, 214, 143, 0.18);
        }
        .pomodoro-aura {
          position: absolute;
          inset: 18px;
          border-radius: 28px;
          background: radial-gradient(circle at top, rgba(255,255,255,0.55), transparent 55%);
          pointer-events: none;
        }
        .pomodoro-cloud {
          width: 110px;
          height: 42px;
          border-radius: 999px;
          background: rgba(255,255,255,0.65);
          filter: blur(2px);
          position: relative;
          animation: cloudDrift 16s ease-in-out infinite;
        }
        .pomodoro-cloud::before,
        .pomodoro-cloud::after {
          content: "";
          position: absolute;
          background: rgba(255,255,255,0.72);
          border-radius: 999px;
        }
        .pomodoro-cloud::before {
          width: 48px;
          height: 48px;
          left: 18px;
          top: -16px;
        }
        .pomodoro-cloud::after {
          width: 58px;
          height: 58px;
          right: 16px;
          top: -20px;
        }
        .pomodoro-cloud-right {
          animation-delay: -7s;
          transform: scale(0.8);
        }
        .pomodoro-stage {
          position: absolute;
          bottom: 16px;
          left: 50%;
          opacity: 0;
          transform: translateX(-50%) translateY(14px) scale(0.84);
          transition: opacity 700ms ease, transform 700ms cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
        }
        .pomodoro-stage.unlocked {
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(1);
        }
        .pomodoro-stage-motion {
          position: relative;
          width: 100%;
          height: 100%;
          animation: breatheY 4.5s ease-in-out infinite;
        }
        .pomodoro-seed {
          width: 48px;
          height: 72px;
        }
        .pomodoro-seed-core {
          position: absolute;
          left: 50%;
          bottom: 0;
          width: 24px;
          height: 30px;
          border-radius: 60% 60% 50% 50%;
          transform: translateX(-50%);
          background: linear-gradient(180deg, #7d5230, #53321d);
          box-shadow: inset 0 4px 8px rgba(255,255,255,0.12);
        }
        .pomodoro-seed-leaf {
          position: absolute;
          width: 22px;
          height: 12px;
          border-radius: 999px 999px 0 999px;
          background: linear-gradient(180deg, #b9e2ba, #5ea46e);
          bottom: 28px;
        }
        .leaf-left { left: 2px; transform: rotate(-24deg); }
        .leaf-right { right: 2px; transform: scaleX(-1) rotate(-24deg); }
        .pomodoro-tree {
          width: 190px;
          height: 180px;
        }
        .pomodoro-tree .trunk {
          position: absolute;
          left: 50%;
          bottom: 0;
          width: 24px;
          height: 108px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: linear-gradient(180deg, #8d5f38, #5f3b23);
        }
        .pomodoro-tree .canopy {
          position: absolute;
          border-radius: 999px;
          background: linear-gradient(180deg, #8ad1a1, #4f8c67);
          box-shadow: inset 0 10px 24px rgba(255,255,255,0.16);
        }
        .canopy-a { width: 110px; height: 110px; left: 50%; top: 20px; transform: translateX(-50%); }
        .canopy-b { width: 74px; height: 74px; left: 22px; top: 58px; }
        .canopy-c { width: 74px; height: 74px; right: 22px; top: 60px; }
        .pomodoro-flowers {
          width: 190px;
          height: 72px;
        }
        .pomodoro-flowers .bloom {
          position: absolute;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background:
            radial-gradient(circle, #fff6d3 0 26%, transparent 28%),
            radial-gradient(circle at 50% 0%, #ffd1e2 0 40%, transparent 42%),
            radial-gradient(circle at 100% 50%, #ffd1e2 0 40%, transparent 42%),
            radial-gradient(circle at 50% 100%, #ffd1e2 0 40%, transparent 42%),
            radial-gradient(circle at 0% 50%, #ffd1e2 0 40%, transparent 42%);
          animation: bob 3.2s ease-in-out infinite;
        }
        .bloom-1 { left: 8px; bottom: 8px; }
        .bloom-2 { left: 38px; bottom: 28px; animation-delay: -0.4s; }
        .bloom-3 { left: 70px; bottom: 14px; animation-delay: -1s; }
        .bloom-4 { right: 56px; bottom: 26px; animation-delay: -0.8s; }
        .bloom-5 { right: 20px; bottom: 10px; animation-delay: -1.4s; }
        .bloom-6 { left: 96px; bottom: 40px; animation-delay: -1.1s; }
        .pomodoro-cottage {
          width: 164px;
          height: 126px;
        }
        .pomodoro-cottage .house,
        .pomodoro-cottage .roof,
        .pomodoro-cottage .window,
        .pomodoro-cottage .door {
          position: absolute;
        }
        .pomodoro-cottage .house {
          width: 94px;
          height: 62px;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%);
          border-radius: 14px;
          background: linear-gradient(180deg, #f7f0df, #ddcaaa);
        }
        .pomodoro-cottage .roof {
          width: 116px;
          height: 34px;
          left: 50%;
          bottom: 48px;
          transform: translateX(-50%);
          background: linear-gradient(180deg, #b86f52, #94513a);
          clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
        }
        .pomodoro-cottage .window {
          width: 20px;
          height: 20px;
          left: 50%;
          bottom: 22px;
          transform: translateX(-50%);
          border-radius: 6px;
          background: #fff0a3;
          box-shadow: 0 0 14px rgba(255, 231, 142, 0.75);
        }
        .pomodoro-cottage .door {
          width: 16px;
          height: 24px;
          left: calc(50% + 24px);
          bottom: 0;
          border-radius: 8px 8px 0 0;
          background: #9a6d4e;
        }
        .pomodoro-windmill {
          width: 114px;
          height: 156px;
          left: calc(50% - 132px);
        }
        .pomodoro-windmill .tower,
        .pomodoro-windmill .cap,
        .pomodoro-windmill .hub,
        .pomodoro-windmill .blade {
          position: absolute;
        }
        .pomodoro-windmill .tower {
          bottom: 0;
          left: 50%;
          width: 34px;
          height: 108px;
          transform: translateX(-50%);
          border-radius: 10px;
          background: linear-gradient(180deg, #ede7db, #d7c5a9);
        }
        .pomodoro-windmill .cap {
          bottom: 96px;
          left: 50%;
          width: 44px;
          height: 24px;
          transform: translateX(-50%);
          background: linear-gradient(180deg, #b96b56, #94402d);
          clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
        }
        .pomodoro-windmill .hub {
          left: 50%;
          bottom: 92px;
          width: 12px;
          height: 12px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: #6f7f86;
          box-shadow: 0 0 0 6px rgba(255,255,255,0.25);
        }
        .pomodoro-windmill .blade {
          left: 50%;
          bottom: 98px;
          width: 70px;
          height: 10px;
          transform-origin: 4px 50%;
          background: linear-gradient(90deg, #f4efe6, #ffffff);
          clip-path: polygon(0 50%, 100% 0, 100% 100%);
          animation: spinBlade 7s linear infinite;
        }
        .blade-a { transform: translateX(-4px) rotate(35deg); }
        .blade-b { transform: translateX(-4px) rotate(125deg); animation-delay: -3.5s; }
        .pomodoro-village {
          width: 220px;
          height: 126px;
          left: calc(50% + 88px);
        }
        .pomodoro-village .home,
        .pomodoro-village .path,
        .pomodoro-village .lantern {
          position: absolute;
        }
        .pomodoro-village .home {
          width: 38px;
          height: 30px;
          bottom: 12px;
          border-radius: 10px;
          background: linear-gradient(180deg, #f7f1e4, #e3d1b3);
        }
        .pomodoro-village .home::before {
          content: "";
          position: absolute;
          left: -4px;
          right: -4px;
          top: -16px;
          height: 18px;
          background: linear-gradient(180deg, #ca9163, #a8684d);
          clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
        }
        .home-a { left: 20px; }
        .home-b { left: 78px; bottom: 4px; transform: scale(1.08); }
        .home-c { left: 138px; }
        .pomodoro-village .path {
          left: 26px;
          right: 20px;
          bottom: 0;
          height: 14px;
          border-radius: 999px;
          background: rgba(244, 211, 189, 0.68);
        }
        .pomodoro-village .lantern {
          width: 11px;
          height: 11px;
          right: 34px;
          bottom: 58px;
          border-radius: 999px;
          background: #ffe9a8;
          box-shadow: 0 0 16px rgba(255, 230, 136, 0.85);
        }
        .pomodoro-confetti {
          position: absolute;
          top: -10%;
          width: 8px;
          height: 18px;
          border-radius: 999px;
          background: linear-gradient(180deg, #ffffff, #f5c774);
          opacity: 0;
          animation: confettiDrop linear forwards;
        }
        .pomodoro-confetti:nth-child(3n) { background: linear-gradient(180deg, #f7a7c2, #ffffff); }
        .pomodoro-confetti:nth-child(4n) { background: linear-gradient(180deg, #7eb8d3, #ffffff); }
        @keyframes breatheY {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-3px) scale(1.015); }
        }
        @keyframes bob {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.05); }
        }
        @keyframes spinBlade {
          from { transform: translateX(-4px) rotate(0deg); }
          to { transform: translateX(-4px) rotate(360deg); }
        }
        @keyframes cloudDrift {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(12px) translateY(-5px); }
        }
        @keyframes confettiDrop {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          8% { opacity: 1; }
          100% { transform: translateY(420px) rotate(280deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
