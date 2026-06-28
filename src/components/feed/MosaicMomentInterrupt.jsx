import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function MosaicMomentInterrupt({ onSnap, onDismiss }) {
  const [phase, setPhase] = useState("glitch"); // glitch, crash, countdown, dismissed
  const [timeLeft, setTimeLeft] = useState(120); // 120 seconds (2:00)
  const [flashVisible, setFlashVisible] = useState(false);
  const [shameProgress, setShameProgress] = useState(0);

  // Glitch Phase duration: 1.5s
  useEffect(() => {
    if (phase === "glitch") {
      let innerTimeout;
      const flashTimeout = setTimeout(() => {
        setFlashVisible(true);
        innerTimeout = setTimeout(() => {
          setFlashVisible(false);
        }, 100);
      }, 500);

      const glitchTimeout = setTimeout(() => {
        setPhase("crash");
      }, 1500);

      return () => {
        clearTimeout(flashTimeout);
        clearTimeout(innerTimeout);
        clearTimeout(glitchTimeout);
      };
    }
  }, [phase]);

  // Crash Phase duration: 2s
  useEffect(() => {
    if (phase === "crash") {
      const crashTimeout = setTimeout(() => {
        setPhase("countdown");
      }, 2000);
      return () => clearTimeout(crashTimeout);
    }
  }, [phase]);

  // Countdown Timer logic
  useEffect(() => {
    if (phase === "countdown") {
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setPhase("dismissed");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // Dismissed Phase duration: 2s with progress bar
  useEffect(() => {
    if (phase === "dismissed") {
      const interval = setInterval(() => {
        setShameProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 5;
        });
      }, 100);

      const dismissTimeout = setTimeout(() => {
        onDismiss();
      }, 2000);

      return () => {
        clearInterval(interval);
        clearTimeout(dismissTimeout);
      };
    }
  }, [phase, onDismiss]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes glitch-shake {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-4px, 2px); }
          40% { transform: translate(4px, -2px); }
          60% { transform: translate(-2px, 4px); }
          80% { transform: translate(2px, -4px); }
        }
        @keyframes glitch-bar {
          0% { top: 20%; }
          25% { top: 60%; }
          50% { top: 35%; }
          75% { top: 80%; }
          100% { top: 20%; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes ring-pulse {
          0%, 100% { box-shadow: 0 0 0 0px rgba(126, 184, 247, 0.4); }
          50% { box-shadow: 0 0 0 20px rgba(126, 184, 247, 0); }
        }
        .glitch-anim {
          animation: glitch-shake 0.15s infinite;
        }
        .scanlines {
          background: repeating-linear-gradient(transparent 0px, transparent 3px, rgba(0, 0, 0, 0.4) 3px, rgba(0, 0, 0, 0.4) 4px);
        }
      `}} />

      {phase === "glitch" && (
        <div className="fixed inset-0 z-[9999] bg-[#0a0a0f] overflow-hidden flex items-center justify-center glitch-anim">
          {/* 3 Glitch color bars */}
          <div className="absolute left-0 w-full bg-[#7eb8f7] opacity-80" style={{ height: "3px", animation: "glitch-bar 0.3s infinite" }} />
          <div className="absolute left-0 w-full bg-[#f76a6a] opacity-80" style={{ height: "4px", animation: "glitch-bar 0.4s infinite" }} />
          <div className="absolute left-0 w-full bg-[#f7c26a] opacity-80" style={{ height: "2px", animation: "glitch-bar 0.25s infinite" }} />

          {/* Scanlines */}
          <div className="absolute inset-0 scanlines pointer-events-none" />

          {/* White Flash */}
          {flashVisible && (
            <div className="absolute inset-0 bg-white transition-opacity duration-100 pointer-events-none" />
          )}
        </div>
      )}

      {phase === "crash" && (
        <div className="fixed inset-0 z-[9999] bg-[#0a0a0f] overflow-hidden flex items-center justify-center p-4">
          {/* Scanlines */}
          <div className="absolute inset-0 scanlines pointer-events-none" />

          {/* Crash Dialog */}
          <div 
            className="w-full max-w-[400px] bg-[#1a0a0a] border border-[#f76a6a] rounded-lg p-8 flex flex-col items-center gap-4 text-center select-none"
          >
            <AlertCircle size={48} className="text-[#f76a6a]" />
            <div>
              <h2 className="font-mono text-lg font-bold text-[#f76a6a] tracking-[0.2em] mb-1">
                MOSAIC.APP STOPPED
              </h2>
              <p className="text-[13px] text-[#7a7a9a]">
                An unexpected interruption has occurred.
              </p>
            </div>

            {/* Stack Trace */}
            <div className="w-full bg-black/40 rounded p-4 font-mono text-[10px] text-[#3a3a5a] text-left leading-normal whitespace-pre">
              {"at MosaicMoment.trigger (moment.js:420)\n" +
               "at DailyScheduler.fire (scheduler.js:69)\n" +
               "at App.interrupt (index.js:1)"}
              <span style={{ animation: "blink 1s infinite" }}>_</span>
            </div>
          </div>
        </div>
      )}

      {phase === "countdown" && (
        <div className="fixed inset-0 z-[9999] bg-[#0a0a0f]/97 backdrop-blur-[20px] flex items-center justify-center p-4">
          <div className="flex flex-col items-center text-center max-w-md w-full">
            {/* Logo with pulsing ring */}
            <div 
              className="w-[72px] h-[72px] rounded-2xl bg-[#7eb8f7]/15 border border-[#7eb8f7]/40 text-[#7eb8f7] font-display font-bold text-2xl flex items-center justify-center mb-6"
              style={{ animation: "ring-pulse 1.5s infinite" }}
            >
              M
            </div>

            <span className="font-mono text-[13px] font-bold tracking-[0.3em] text-[#7eb8f7] mb-2">
              MOSAIC MOMENT
            </span>

            <h1 className="font-mono text-[72px] font-black text-white leading-none tracking-tight mb-2 select-none">
              {formatTime(timeLeft)}
            </h1>

            <p className="text-[14px] text-[#7a7a9a] mb-8">
              Share what you're working on right now.
            </p>

            <button
              onClick={onSnap}
              className="bg-[#7eb8f7] hover:scale-103 active:scale-97 text-[#0a0a0f] font-bold py-3.5 px-10 rounded-xl text-[15px] cursor-pointer shadow-md shadow-[#7eb8f7]/10 transition-transform mb-3"
            >
              Take Snap Now
            </button>

            <span className="text-[11px] text-[#555] mb-12">
              Everyone on Mosaic is being asked right now.
            </span>

            <button
              onClick={() => setPhase("dismissed")}
              className="text-[11px] text-[#3a3a5a] bg-transparent border-none cursor-pointer hover:underline outline-none"
            >
              Skip (you'll be shamed)
            </button>
          </div>
        </div>
      )}

      {phase === "dismissed" && (
        <div className="fixed inset-0 z-[9999] bg-[#0a0a0f] flex flex-col items-center justify-center p-4">
          <div className="text-center max-w-sm w-full flex flex-col items-center gap-4">
            <div>
              <h2 className="font-display font-bold text-[24px] text-[#f76a6a] leading-tight mb-1">
                You missed your Moment.
              </h2>
              <p className="text-[13px] text-[#7a7a9a]">
                Your friends will know.
              </p>
            </div>
            {/* Shame progress bar */}
            <div className="w-full bg-[#1a1a24] h-[3px]">
              <div 
                className="h-full bg-[#f76a6a] transition-all duration-100 ease-out" 
                style={{ width: `${shameProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
