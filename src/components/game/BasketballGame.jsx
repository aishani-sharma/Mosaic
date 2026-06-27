import React, { useEffect, useMemo, useRef, useState } from "react";

const BALL_R = 16;
const GRAVITY = 0.22;
const AIR = 0.999;
const POWER = 0.19;
const MAX_PULL = 125;

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampPull(start, point) {
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  const d = Math.hypot(dx, dy);

  if (d <= MAX_PULL) return point;

  const scale = MAX_PULL / d;
  return {
    x: start.x + dx * scale,
    y: start.y + dy * scale,
  };
}

function circleRectCollision(circle, rect) {
  const nearestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  return Math.hypot(circle.x - nearestX, circle.y - nearestY) < BALL_R;
}

export default function BasketballGame() {
  const sceneRef = useRef(null);
  const rafRef = useRef(null);
  const timersRef = useRef([]);

  const modeRef = useRef("ready");
  const velocityRef = useRef({ x: 0, y: 0 });
  const ballRef = useRef({ x: 120, y: 240, rot: 0 });
  const previousBallRef = useRef({ x: 120, y: 240, rot: 0 });
  const scoredThisShotRef = useRef(false);

  const [size, setSize] = useState({ w: 900, h: 360 });
  const [ball, setBall] = useState({ x: 120, y: 240, rot: 0 });
  const [dragPoint, setDragPoint] = useState(null);
  const [mode, setModeState] = useState("ready");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [netRipple, setNetRipple] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [floatingText, setFloatingText] = useState("");
  const [confetti, setConfetti] = useState([]);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const setMode = (next) => {
    modeRef.current = next;
    setModeState(next);
  };

  const startPoint = useMemo(() => {
    return {
      x: Math.max(100, size.w * 0.16),
      y: size.h - 120,
    };
  }, [size]);

  const hoop = useMemo(() => {
    const rimY = Math.max(120, size.h * 0.42);
    // Widened rim from 55px to 70px to make it slightly easier to hit
    const rimL = size.w - 200;
    const rimR = size.w - 130;

    return {
      rimY,
      rimL,
      rimR,
      leftRim: { x: rimL, y: rimY },
      rightRim: { x: rimR, y: rimY },
      backboard: {
        x: rimR + 10,
        y: rimY - 85,
        w: 15,
        h: 100,
      },
    };
  }, [size]);

  function groundY(x) {
    const t = Math.max(0, Math.min(1, x / size.w));
    return size.h - 45 + Math.sin(t * Math.PI) * 25;
  }

  useEffect(() => {
    function measure() {
      if (!sceneRef.current) return;
      const rect = sceneRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({
          w: rect.width,
          h: rect.height,
        });
      }
    }
    measure();
    const observer = new ResizeObserver(measure);
    if (sceneRef.current) observer.observe(sceneRef.current);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [mobileExpanded]);

  useEffect(() => {
    if (modeRef.current === "ready") {
      const resetBall = { ...startPoint, rot: 0 };
      ballRef.current = resetBall;
      setBall(resetBall);
    }
  }, [startPoint]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  function delay(fn, ms) {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
  }

  function pointerToLocal(e) {
    const rect = sceneRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function getLaunchVelocity(fromPoint) {
    return {
      x: (startPoint.x - fromPoint.x) * POWER,
      y: (startPoint.y - fromPoint.y) * POWER,
    };
  }

  function getPowerPercent() {
    if (!dragPoint) return 0;
    const d = distance(startPoint, dragPoint);
    return Math.min(100, (d / MAX_PULL) * 100);
  }

  function getTrajectoryPoints() {
    if (!dragPoint) return [];

    let p = { ...dragPoint };
    let v = getLaunchVelocity(dragPoint);
    const points = [];

    for (let i = 0; i < 40; i++) {
      v.y += GRAVITY;
      v.x *= AIR;
      p = {
        x: p.x + v.x,
        y: p.y + v.y,
      };

      if (i % 2 === 0) {
        points.push({ ...p, opacity: 1 - i / 45 });
      }
    }

    return points;
  }

  function handleBallPointerDown(e) {
    if (modeRef.current !== "ready") return;

    e.preventDefault();
    sceneRef.current.setPointerCapture(e.pointerId);

    setMode("aiming");

    const p = pointerToLocal(e);
    const clamped = clampPull(startPoint, p);

    setDragPoint(clamped);
    ballRef.current = { ...clamped, rot: 0 };
    setBall({ ...clamped, rot: 0 });
  }

  function handlePointerMove(e) {
    if (modeRef.current !== "aiming") return;

    const p = pointerToLocal(e);
    const clamped = clampPull(startPoint, p);

    setDragPoint(clamped);
    ballRef.current = {
      ...clamped,
      rot: ballRef.current.rot,
    };

    setBall(ballRef.current);
  }

  function handlePointerUp() {
    if (modeRef.current !== "aiming") return;

    const releasePoint = dragPoint || startPoint;
    const velocity = getLaunchVelocity(releasePoint);
    const power = Math.hypot(velocity.x, velocity.y);

    setDragPoint(null);

    if (power < 2) {
      resetToHands(120);
      return;
    }

    scoredThisShotRef.current = false;
    velocityRef.current = velocity;
    previousBallRef.current = { ...ballRef.current };

    setMode("flying");
    rafRef.current = requestAnimationFrame(tick);
  }

  function resetToHands(wait = 0) {
    cancelAnimationFrame(rafRef.current);

    setMode("resetting");

    delay(() => {
      const resetBall = { ...startPoint, rot: 0 };

      ballRef.current = resetBall;
      previousBallRef.current = resetBall;
      velocityRef.current = { x: 0, y: 0 };

      setBall(resetBall);
      setDragPoint(null);
      setMode("ready");
    }, wait);
  }

  function triggerScore() {
    scoredThisShotRef.current = true;
    cancelAnimationFrame(rafRef.current);

    setMode("scored");
    setScore((s) => s + 1);
    setFloatingText("+1");
    setNetRipple(true);

    const burst = Array.from({ length: 24 }).map((_, i) => ({
      id: `${Date.now()}-${i}`,
      x: (hoop.rimL + hoop.rimR) / 2,
      y: hoop.rimY,
      tx: (Math.random() - 0.5) * 160,
      ty: -Math.random() * 120 - 40,
      delay: Math.random() * 0.12,
    }));

    setConfetti(burst);

    setStreak((old) => {
      const next = old + 1;

      if (next >= 3) {
        setCelebrating(true);
        setFloatingText("ON FIRE! 🔥");

        delay(() => {
          setCelebrating(false);
          setFloatingText("");
        }, 1800);
      }

      return next;
    });

    delay(() => setNetRipple(false), 650);
    delay(() => setConfetti([]), 1100);
    delay(() => setFloatingText(""), 1100);
    resetToHands(1000);
  }

  function triggerMiss() {
    cancelAnimationFrame(rafRef.current);
    setStreak(0);
    resetToHands(800);
  }

  function bounceFromRim(point, nextBall, velocity) {
    const dx = nextBall.x - point.x;
    const dy = nextBall.y - point.y;
    const d = Math.hypot(dx, dy) || 1;

    const nx = dx / d;
    const ny = dy / d;

    const dot = velocity.x * nx + velocity.y * ny;

    if (dot < 0) {
      velocity.x = (velocity.x - 2 * dot * nx) * 0.8;
      velocity.y = (velocity.y - 2 * dot * ny) * 0.8;

      nextBall.x = point.x + nx * (BALL_R + 6);
      nextBall.y = point.y + ny * (BALL_R + 6);
    }
  }

  function tick() {
    if (modeRef.current !== "flying") return;

    const prev = { ...ballRef.current };
    previousBallRef.current = prev;

    const v = velocityRef.current;

    v.y += GRAVITY;
    v.x *= AIR;

    const next = {
      x: prev.x + v.x,
      y: prev.y + v.y,
      rot: prev.rot + Math.hypot(v.x, v.y) * 2.5,
    };

    const crossedRimPlane =
      prev.y < hoop.rimY - BALL_R * 0.3 &&
      next.y >= hoop.rimY - BALL_R * 0.3;

    const insideHoop =
      next.x > hoop.rimL + BALL_R * 0.05 &&
      next.x < hoop.rimR - BALL_R * 0.05;

    const fallingDown = v.y > 0;

    if (
      !scoredThisShotRef.current &&
      crossedRimPlane &&
      insideHoop &&
      fallingDown
    ) {
      triggerScore();
      return;
    }

    if (circleRectCollision(next, hoop.backboard)) {
      if (prev.x < hoop.backboard.x) {
        next.x = hoop.backboard.x - BALL_R - 1;
        v.x = -Math.abs(v.x) * 0.72;
      } else {
        next.x = hoop.backboard.x + hoop.backboard.w + BALL_R + 1;
        v.x = Math.abs(v.x) * 0.72;
      }

      v.y *= 0.86;
    }

    if (distance(next, hoop.leftRim) < BALL_R + 6) {
      bounceFromRim(hoop.leftRim, next, v);
    }

    if (distance(next, hoop.rightRim) < BALL_R + 6) {
      bounceFromRim(hoop.rightRim, next, v);
    }

    const gY = groundY(next.x);

    if (next.y + BALL_R > gY) {
      next.y = gY - BALL_R;
      v.y = -Math.abs(v.y) * 0.45;
      v.x *= 0.8;

      if (Math.abs(v.x) < 0.7 && Math.abs(v.y) < 1.3) {
        triggerMiss();
        return;
      }
    }

    const offScreen =
      next.x < -80 ||
      next.x > size.w + 80 ||
      next.y < -220 ||
      next.y > size.h + 100;

    if (offScreen) {
      triggerMiss();
      return;
    }

    ballRef.current = next;
    velocityRef.current = v;

    setBall(next);

    rafRef.current = requestAnimationFrame(tick);
  }

  const trajectoryPoints = getTrajectoryPoints();
  const powerPercent = getPowerPercent();

  // Dynamic arm movement formulas: arms follow the ball when aiming or ready
  const leftArm = useMemo(() => {
    if (mode === "aiming" || mode === "ready") {
      const relBallX = ball.x - (startPoint.x - 50);
      const relBallY = ball.y - (startPoint.y - 94);
      return { x1: 34, y1: 49, x2: relBallX - 8, y2: relBallY };
    }
    // Shooting follow-through arms up
    return { x1: 34, y1: 49, x2: 24, y2: 12 };
  }, [mode, ball, startPoint]);

  const rightArm = useMemo(() => {
    if (mode === "aiming" || mode === "ready") {
      const relBallX = ball.x - (startPoint.x - 50);
      const relBallY = ball.y - (startPoint.y - 94);
      return { x1: 62, y1: 50, x2: relBallX + 8, y2: relBallY };
    }
    // Shooting follow-through arms up
    return { x1: 62, y1: 50, x2: 74, y2: 12 };
  }, [mode, ball, startPoint]);

  return (
    <div className={`basketball-widget ${mobileExpanded ? "expanded" : ""}`}>
      <button
        className="basketball-mobile-button"
        type="button"
        onClick={() => setMobileExpanded((v) => !v)}
      >
        🏀 {mobileExpanded ? "Hide Basketball" : "Play Basketball"}
      </button>

      <div
        ref={sceneRef}
        className={`basketball-scene ${celebrating ? "celebrating" : ""}`}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <svg
          className="scene-svg"
          width="100%"
          height="100%"
          viewBox={`0 0 ${size.w} ${size.h}`}
          preserveAspectRatio="none"
        >
          <defs>
            {/* Light blue sky gradient */}
            <linearGradient id="duskSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="70%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#ffffff" />
            </linearGradient>

            {/* Streak celebration sky shift gradient (Sunset glow) */}
            <linearGradient id="celebrateSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="50%" stopColor="#fdbb2d" />
              <stop offset="100%" stopColor="#ff7e5f" />
            </linearGradient>

            {/* Green hills gradients */}
            <linearGradient id="hillDuskFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>

            <linearGradient id="hillDuskClose" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>

            <filter id="softShadow">
              <feDropShadow
                dx="0"
                dy="5"
                stdDeviation="5"
                floodOpacity="0.25"
              />
            </filter>
          </defs>

          {/* Background Sky */}
          <rect width={size.w} height={size.h} fill={celebrating ? "url(#celebrateSky)" : "url(#duskSky)"} />

          {/* Orange Sun setting behind hills */}
          <circle
            className="sun"
            cx={size.w * 0.72}
            cy={size.h * 0.65}
            r="44"
            fill="#f97316"
            opacity="0.8"
          />

          {/* Far hills */}
          <path
            d={`M 0 ${size.h * 0.72}
                C ${size.w * 0.22} ${size.h * 0.58},
                  ${size.w * 0.4} ${size.h * 0.78},
                  ${size.w * 0.55} ${size.h * 0.64}
                C ${size.w * 0.75} ${size.h * 0.5},
                  ${size.w * 0.9} ${size.h * 0.72},
                  ${size.w} ${size.h * 0.6}
                L ${size.w} ${size.h}
                L 0 ${size.h} Z`}
            fill="url(#hillDuskFar)"
            opacity="0.75"
          />

          {/* Near hills */}
          <path
            d={`M 0 ${size.h - 45}
                C ${size.w * 0.2} ${size.h - 90},
                  ${size.w * 0.45} ${size.h - 10},
                  ${size.w * 0.65} ${size.h - 52}
                C ${size.w * 0.8} ${size.h - 85},
                  ${size.w * 0.92} ${size.h - 40},
                  ${size.w} ${size.h - 70}
                L ${size.w} ${size.h}
                L 0 ${size.h} Z`}
            fill="url(#hillDuskClose)"
          />

          {/* Green trees */}
          <g className="tree" transform={`translate(${size.w * 0.76}, ${size.h - 102})`}>
            <rect x="-4" y="24" width="8" height="34" rx="2" fill="#78350f" />
            <circle cx="0" cy="12" r="20" fill="#15803d" />
            <circle cx="-13" cy="20" r="14" fill="#166534" />
            <circle cx="13" cy="20" r="15" fill="#166534" />
          </g>

          <g className="tree small" transform={`translate(${size.w * 0.28}, ${size.h - 88})`}>
            <rect x="-3" y="20" width="6" height="28" rx="2" fill="#78350f" />
            <circle cx="0" cy="10" r="16" fill="#15803d" />
            <circle cx="-10" cy="17" r="11" fill="#166534" />
            <circle cx="10" cy="17" r="12" fill="#166534" />
          </g>

          {/* Predicted trajectory Preview line */}
          {trajectoryPoints.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={Math.max(2, 5 - i * 0.08)}
              fill="#ffffff"
              opacity={Math.max(0.12, p.opacity * 0.65)}
            />
          ))}

          {/* Stick Figure Guy */}
          <g
            className={`player ${celebrating ? "jump" : ""}`}
            transform={`translate(${startPoint.x - 50}, ${startPoint.y - 94})`}
            filter="url(#softShadow)"
          >
            {/* Legs */}
            <line x1="48" y1="72" x2="30" y2="116" stroke="#100b1a" strokeWidth="8" strokeLinecap="round" />
            <line x1="48" y1="72" x2="70" y2="116" stroke="#100b1a" strokeWidth="8" strokeLinecap="round" />

            {/* Shoes */}
            <line x1="30" y1="116" x2="18" y2="119" stroke="#05020c" strokeWidth="7" strokeLinecap="round" />
            <line x1="70" y1="116" x2="83" y2="119" stroke="#05020c" strokeWidth="7" strokeLinecap="round" />

            {/* Torso/Jersey */}
            <rect x="31" y="38" width="34" height="46" rx="14" fill="#4f46e5" />

            {/* Head & Neck */}
            <line x1="48" y1="36" x2="48" y2="40" stroke="#f2c39b" strokeWidth="6" />
            <circle cx="48" cy="22" r="18" fill="#f2c39b" />

            {/* Hair */}
            <path d="M 32 19 C 36 2, 61 1, 66 20 C 55 10, 43 10, 32 19 Z" fill="#2d1b12" />

            {/* Dynamic Arms */}
            <line x1={leftArm.x1} y1={leftArm.y1} x2={leftArm.x2} y2={leftArm.y2} stroke="#f2c39b" strokeWidth="8" strokeLinecap="round" />
            <line x1={rightArm.x1} y1={rightArm.y1} x2={rightArm.x2} y2={rightArm.y2} stroke="#f2c39b" strokeWidth="8" strokeLinecap="round" />

            {/* Face Details */}
            <circle cx="42" cy="21" r="2.2" fill="#111827" />
            <circle cx="55" cy="21" r="2.2" fill="#111827" />
            <path d="M 43 29 Q 49 34 55 29" stroke="#7c2d12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>

          {/* Basketball Hoop */}
          <g className="hoop" filter="url(#softShadow)">
            {/* Support pole */}
            <line
              x1={hoop.rimR + 42}
              y1={hoop.rimY - 25}
              x2={hoop.rimR + 42}
              y2={size.h - 40}
              stroke="#4b5563"
              strokeWidth="11"
              strokeLinecap="round"
            />

            {/* Backboard */}
            <rect
              x={hoop.backboard.x}
              y={hoop.backboard.y}
              width="74"
              height="56"
              rx="6"
              fill="#ffffff"
              opacity="0.86"
              stroke="#374151"
              strokeWidth="4.5"
            />

            <rect
              x={hoop.backboard.x + 18}
              y={hoop.backboard.y + 16}
              width="32"
              height="23"
              rx="2"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="3.5"
            />

            {/* Net mesh mesh */}
            <g className={netRipple ? "net ripple" : "net"}>
              <path
                d={`M ${hoop.rimL + 5} ${hoop.rimY + 5}
                    L ${hoop.rimL + 13} ${hoop.rimY + 54}
                    L ${hoop.rimR - 13} ${hoop.rimY + 54}
                    L ${hoop.rimR - 5} ${hoop.rimY + 5}`}
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              <path
                d={`M ${hoop.rimL + 15} ${hoop.rimY + 6}
                    L ${hoop.rimL + 24} ${hoop.rimY + 54}
                    M ${hoop.rimL + 30} ${hoop.rimY + 6}
                    L ${hoop.rimR - 24} ${hoop.rimY + 54}
                    M ${hoop.rimR - 15} ${hoop.rimY + 6}
                    L ${hoop.rimR - 24} ${hoop.rimY + 54}`}
                fill="none"
                stroke="#d1d5db"
                strokeWidth="2.5"
              />

              <path
                d={`M ${hoop.rimL + 9} ${hoop.rimY + 26}
                    C ${hoop.rimL + 23} ${hoop.rimY + 34},
                      ${hoop.rimR - 23} ${hoop.rimY + 34},
                      ${hoop.rimR - 9} ${hoop.rimY + 26}`}
                fill="none"
                stroke="#d1d5db"
                strokeWidth="2.5"
              />
            </g>

            {/* Orange Rim */}
            <line
              x1={hoop.rimL}
              y1={hoop.rimY}
              x2={hoop.rimR}
              y2={hoop.rimY}
              stroke="#f97316"
              strokeWidth="7"
              strokeLinecap="round"
            />

            <circle cx={hoop.rimL} cy={hoop.rimY} r="6" fill="#ea580c" />
            <circle cx={hoop.rimR} cy={hoop.rimY} r="6" fill="#ea580c" />
          </g>
        </svg>

        {/* Score & Streak HUD Panel */}
        <div className="score-card">
          <div className="score-label">🏀 Score</div>
          <div className="score-number">{score}</div>
          <div className="streak">Streak: {streak} 🔥</div>
        </div>

        {/* Slingshot Pull Power Indicator */}
        {mode === "aiming" && (
          <div className="power-ui">
            <span>Power</span>
            <div className="power-track">
              <div
                className="power-fill"
                style={{ width: `${powerPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* +1 Swish Floating Text */}
        {floatingText && (
          <div
            className={`floating-text ${floatingText.includes("FIRE") ? "fire-text" : ""
              }`}
            style={{
              left: hoop.rimL - 25,
              top: hoop.rimY - 50,
            }}
          >
            {floatingText}
          </div>
        )}

        {/* Confetti Sparks on Score */}
        {confetti.map((c) => (
          <span
            key={c.id}
            className="confetti-piece"
            style={{
              left: c.x,
              top: c.y,
              "--tx": `${c.tx}px`,
              "--ty": `${c.ty}px`,
              animationDelay: `${c.delay}s`,
            }}
          />
        ))}

        {/* Basketball */}
        <div
          className={`basketball-ball ${mode === "scored" || mode === "resetting" ? "fade" : ""
            }`}
          onPointerDown={handleBallPointerDown}
          style={{
            transform: `translate(${ball.x - BALL_R}px, ${ball.y - BALL_R
              }px) rotate(${ball.rot}deg)`,
            width: `${BALL_R * 2}px`,
            height: `${BALL_R * 2}px`,
          }}
        >
          <span />
          <span />
          <span />
        </div>

        {/* Slingshot instructional guide */}
        {mode === "ready" && (
          <div
            className="hint"
            style={{
              left: startPoint.x + 35,
              top: startPoint.y - 45,
            }}
          >
            Pull the ball back & release
          </div>
        )}
      </div>

      <style>{`
        .basketball-widget {
          width: 100%;
          height: 100%;
          min-height: 360px;
        }

        .basketball-mobile-button {
          display: none;
          border: none;
          border-radius: 14px;
          padding: 12px 18px;
          background: #4f46e5;
          color: white;
          font-weight: 800;
          cursor: pointer;
          width: 100%;
          box-shadow: 0 10px 25px rgba(79, 70, 229, 0.25);
          font-family: 'Outfit', sans-serif;
        }

        .basketball-scene {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 360px;
          overflow: hidden;
          border-radius: 24px;
          background: #bae6fd;
          user-select: none;
          touch-action: none;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08),
            0 20px 45px rgba(0, 0, 0, 0.3);
        }

        .basketball-scene.celebrating {
          animation: skyCelebrate 2s ease;
        }

        .scene-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .sun {
          animation: sunPulse 4s ease-in-out infinite;
        }

        .tree {
          transform-origin: bottom center;
          animation: treeSway 3s ease-in-out infinite alternate;
        }

        .tree.small {
          animation-duration: 3.6s;
        }

        .player {
          transform-origin: center bottom;
        }

        .player.jump {
          animation: playerJump 0.65s ease-in-out infinite;
        }

        .net.ripple {
          animation: netRipple 0.6s ease-in-out;
          transform-origin: center top;
        }

        .basketball-ball {
          position: absolute;
          border-radius: 999px;
          background: radial-gradient(circle at 35% 28%, #fb923c, #ea580c 72%);
          border: 2px solid #9a3412;
          box-shadow: 0 8px 20px rgba(0,0,0,0.35);
          cursor: grab;
          z-index: 8;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s ease;
        }

        .basketball-ball:active {
          cursor: grabbing;
        }

        .basketball-ball.fade {
          opacity: 0;
        }

        .basketball-ball span {
          position: absolute;
          display: block;
          background: #7c2d12;
          opacity: 0.85;
        }

        .basketball-ball span:nth-child(1) {
          width: 2px;
          height: 100%;
          left: 50%;
          top: 0;
          transform: translateX(-50%);
        }

        .basketball-ball span:nth-child(2) {
          height: 2px;
          width: 100%;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
        }

        .basketball-ball span:nth-child(3) {
          height: 2px;
          width: 120%;
          left: -10%;
          top: 50%;
          transform: rotate(35deg);
        }

        .score-card {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 6;
          padding: 10px 14px;
          border-radius: 14px;
          background: rgba(17, 24, 39, 0.75);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 10px 25px rgba(0,0,0,0.25);
          text-align: right;
          color: #f3f4f6;
          font-family: 'Outfit', sans-serif;
        }

        .score-label {
          font-size: 11px;
          font-weight: 800;
          opacity: 0.65;
          letter-spacing: 0.5px;
        }

        .score-number {
          font-size: 26px;
          font-weight: 900;
          line-height: 1;
          margin-top: 2px;
        }

        .streak {
          font-size: 11px;
          font-weight: 800;
          margin-top: 4px;
          color: #f97316;
        }

        .power-ui {
          position: absolute;
          left: 16px;
          top: 16px;
          z-index: 7;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(17, 24, 39, 0.75);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 11px;
          font-weight: 900;
          color: #f3f4f6;
          box-shadow: 0 8px 20px rgba(0,0,0,0.2);
          font-family: 'Outfit', sans-serif;
        }

        .power-track {
          width: 100px;
          height: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }

        .power-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #10b981, #f59e0b, #ef4444);
        }

        .floating-text {
          position: absolute;
          z-index: 10;
          color: #10b981;
          font-size: 24px;
          font-weight: 900;
          pointer-events: none;
          font-family: 'Outfit', sans-serif;
          animation: floatUp 1.1s ease-out forwards;
          text-shadow: 0 2px 8px rgba(0,0,0,0.5);
        }

        .fire-text {
          color: #ef4444;
          font-size: 30px;
          letter-spacing: 1px;
        }

        .confetti-piece {
          position: absolute;
          z-index: 9;
          width: 7px;
          height: 12px;
          border-radius: 2px;
          background: #fb923c;
          animation: confettiBurst 0.9s ease-out forwards;
        }

        .confetti-piece:nth-child(3n) {
          background: #10b981;
        }

        .confetti-piece:nth-child(3n + 1) {
          background: #f59e0b;
        }

        .confetti-piece:nth-child(3n + 2) {
          background: #3b82f6;
        }

        .hint {
          position: absolute;
          z-index: 5;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(17, 24, 39, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #f3f4f6;
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 6px 16px rgba(0,0,0,0.25);
          pointer-events: none;
          animation: hintPulse 1.4s ease-in-out infinite;
          font-family: 'Outfit', sans-serif;
        }

        @keyframes playerJump {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          45% { transform: translateY(-24px) rotate(-1.5deg); }
        }

        @keyframes netRipple {
          0% { transform: scaleY(1) skewX(0deg); }
          35% { transform: scaleY(1.3) skewX(6deg); }
          70% { transform: scaleY(0.85) skewX(-4deg); }
          100% { transform: scaleY(1) skewX(0deg); }
        }

        @keyframes treeSway {
          from { transform: rotate(-0.5deg); }
          to { transform: rotate(1.2deg); }
        }

        @keyframes sunPulse {
          0%, 100% { opacity: 0.28; }
          50% { opacity: 0.38; }
        }

        @keyframes floatUp {
          from {
            opacity: 1;
            transform: translateY(0) scale(0.9);
          }
          to {
            opacity: 0;
            transform: translateY(-60px) scale(1.1);
          }
        }

        @keyframes confettiBurst {
          from {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg);
          }
          to {
            opacity: 0;
            transform: translate(var(--tx), var(--ty)) rotate(420deg);
          }
        }

        @keyframes skyCelebrate {
          0%, 100% { filter: saturate(1) brightness(1); }
          40% { filter: saturate(1.25) brightness(1.08); }
        }

        @keyframes hintPulse {
          0%, 100% { transform: translateY(0); opacity: 0.75; }
          50% { transform: translateY(-4px); opacity: 0.95; }
        }

        @media (max-width: 768px) {
          .basketball-widget {
            min-height: auto;
          }

          .basketball-mobile-button {
            display: block;
          }

          .basketball-widget:not(.expanded) .basketball-scene {
            display: none;
          }

          .basketball-scene {
            height: 320px;
            margin-top: 12px;
          }

          .hint {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
