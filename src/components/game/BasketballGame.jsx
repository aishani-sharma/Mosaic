import React, { useEffect, useMemo, useRef, useState } from "react";

const BALL_R = 13;
const GRAVITY = 0.20;
const AIR = 0.999;
const MAX_PULL = 90;

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
  const [squashing, setSquashing] = useState(false);
  const [groundBouncing, setGroundBouncing] = useState(false);
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

  const POWER = Math.max(0.15, size.w * 0.00022);

  function groundY(x) {
    const t = Math.max(0, Math.min(1, x / size.w));
    return size.h - 125 + Math.sin(t * Math.PI) * 25;
  }

  const startPoint = useMemo(() => {
    // Keep the boy 5% off the left edge, but minimum 85px to avoid arm/drag-line clipping
    const x = Math.max(85, size.w * 0.05);
    const y = groundY(x) - 22;
    return { x, y };
  }, [size]);

  const hoop = useMemo(() => {
    // Keep the hoop's backboard right edge 2% off the right edge (minimum 25px to avoid clipping)
    const backboardOffset = Math.max(25, size.w * 0.02);
    const backboardW = 58;
    const backboardH = 44;
    const backboardX = size.w - backboardOffset - backboardW;
    const rimR = backboardX - 10;
    const rimL = rimR - 80; // Widened rim from 70px to 80px to make it easier to score!

    const basketX = (rimL + rimR) / 2;
    const rimY = Math.max(90, groundY(basketX) - 130); // 130px above the ground curve, clamped to min 90px

    return {
      rimY,
      rimL,
      rimR,
      leftRim: { x: rimL, y: rimY },
      rightRim: { x: rimR, y: rimY },
      backboard: {
        x: backboardX,
        y: rimY - 85,
        w: backboardW,
        h: backboardH,
      },
    };
  }, [size]);

  const groundPath = useMemo(() => {
    let d = `M 0 ${size.h}`;
    for (let x = 0; x <= size.w; x += 10) {
      d += ` L ${x} ${groundY(x)}`;
    }
    d += ` L ${size.w} ${size.h} Z`;
    return d;
  }, [size]);

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

    setSquashing(true);
    delay(() => setSquashing(false), 150);

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

    const burst = Array.from({ length: 8 }).map((_, i) => ({
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
        setFloatingText("ON FIRE!");

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
    resetToHands(600);
  }

  function triggerMiss() {
    cancelAnimationFrame(rafRef.current);
    setStreak(0);
    resetToHands(400);
  }

  function bounceFromRim(point, nextBall, velocity, collisionR = BALL_R + 2) {
    const dx = nextBall.x - point.x;
    const dy = nextBall.y - point.y;
    const d = Math.hypot(dx, dy) || 1;

    const nx = dx / d;
    const ny = dy / d;

    const dot = velocity.x * nx + velocity.y * ny;

    if (dot < 0) {
      velocity.x = (velocity.x - 2 * dot * nx) * 0.8;
      velocity.y = (velocity.y - 2 * dot * ny) * 0.8;

      nextBall.x = point.x + nx * collisionR;
      nextBall.y = point.y + ny * collisionR;
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
      rot: prev.rot + Math.hypot(v.x, v.y) * 4.5,
    };

    // Bounce off left wall
    if (next.x - BALL_R < 0) {
      next.x = BALL_R;
      v.x = Math.abs(v.x) * 0.72;
    }
    // Bounce off right wall
    if (next.x + BALL_R > size.w) {
      next.x = size.w - BALL_R;
      v.x = -Math.abs(v.x) * 0.72;
    }
    // Bounce off ceiling
    if (next.y - BALL_R < 0) {
      next.y = BALL_R;
      v.y = Math.abs(v.y) * 0.5;
    }

    const crossedRimPlane =
      prev.y < hoop.rimY - BALL_R * 0.3 &&
      next.y >= hoop.rimY - BALL_R * 0.3;

    const fallingDown = v.y > 0;

    let insideHoop = false;
    if (crossedRimPlane) {
      const fraction = (hoop.rimY - BALL_R * 0.3 - prev.y) / (next.y - prev.y || 1);
      const crossX = prev.x + (next.x - prev.x) * fraction;
      insideHoop = crossX > hoop.rimL + BALL_R * 0.05 && crossX < hoop.rimR - BALL_R * 0.05;
    }

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
        v.x = -Math.abs(v.x) * 0.8;
      } else {
        next.x = hoop.backboard.x + hoop.backboard.w + BALL_R + 1;
        v.x = Math.abs(v.x) * 0.8;
      }

      v.y *= 0.88;
    }

    if (distance(next, hoop.leftRim) < BALL_R + 2) {
      bounceFromRim(hoop.leftRim, next, v, BALL_R + 2);
    }

    if (distance(next, hoop.rightRim) < BALL_R + 2) {
      bounceFromRim(hoop.rightRim, next, v, BALL_R + 2);
    }

    const gY = groundY(next.x);

    if (next.y + BALL_R > gY) {
      next.y = gY - BALL_R;
      v.y = -Math.abs(v.y) * 0.72;
      v.x *= 0.85;

      setGroundBouncing(true);
      delay(() => setGroundBouncing(false), 120);

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
    <div className="basketball-widget">

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
          {/* Ground Court Area */}
          <path
            d={groundPath}
            fill="rgba(255, 255, 255, 0.04)"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="2"
          />

          {/* Cartoon Basketball Player */}
          <g
            className={`player ${celebrating ? "jump" : ""}`}
            transform={`translate(${startPoint.x - 50}, ${startPoint.y - 94})`}
            filter="url(#softShadow)"
          >
            {/* Legs (Skin-colored lines) */}
            <line x1="40" y1="90" x2="38" y2="108" stroke="#f2c39b" strokeWidth="8" strokeLinecap="round" />
            <line x1="56" y1="90" x2="58" y2="108" stroke="#f2c39b" strokeWidth="8" strokeLinecap="round" />

            {/* Sneakers (Red and white cute chibi sneakers) */}
            {/* Left Sneaker */}
            <rect x="30" y="106" width="16" height="8" rx="3" fill="#ef4444" />
            <rect x="30" y="112" width="16" height="3" rx="1" fill="#ffffff" />
            <circle cx="34" cy="109" r="1.5" fill="#ffffff" />

            {/* Right Sneaker */}
            <rect x="50" y="106" width="16" height="8" rx="3" fill="#ef4444" />
            <rect x="50" y="112" width="16" height="3" rx="1" fill="#ffffff" />
            <circle cx="54" cy="109" r="1.5" fill="#ffffff" />

            {/* Red Shorts */}
            <rect x="33" y="78" width="14" height="12" rx="2" fill="#ef4444" />
            <rect x="49" y="78" width="14" height="12" rx="2" fill="#ef4444" />

            {/* Torso/Hoodie body */}
            <rect x="31" y="38" width="34" height="42" rx="10" fill="#1a3a9f" />

            {/* Hoodie pocket */}
            <rect x="37" y="60" width="22" height="12" rx="3" fill="none" stroke="#4a6fd4" strokeWidth="1.5" />
            <path d="M 37 66 L 41 60 M 59 66 L 55 60" stroke="#4a6fd4" strokeWidth="1.5" />

            {/* Hood behind neck */}
            <ellipse cx="48" cy="40" rx="13" ry="5" fill="#0f2d6b" />

            {/* Drawstring details */}
            <path d="M 45 42 L 45 50 M 51 42 L 51 50" stroke="#4a6fd4" strokeWidth="1.5" strokeLinecap="round" />

            {/* Neck */}
            <rect x="45" y="33" width="6" height="7" fill="#f2c39b" />

            {/* Head */}
            <circle cx="48" cy="19" r="20" fill="#f2c39b" />

            {/* Messy Hair */}
            <path d="M 25 18 C 25 0, 71 0, 71 18 C 65 8, 55 6, 48 8 C 41 6, 31 8, 25 18 Z" fill="#2d1b12" />
            <path d="M 32 6 L 35 -1 L 40 4 L 46 -3 L 52 3 L 58 -2 L 64 5" stroke="#2d1b12" strokeWidth="3" strokeLinecap="round" />

            {/* Face Details: Eyes */}
            <circle cx="40" cy="18" r="3" fill="#111827" />
            <circle cx="56" cy="18" r="3" fill="#111827" />
            {/* Eye shines */}
            <circle cx="39" cy="17" r="1" fill="#ffffff" />
            <circle cx="55" cy="17" r="1" fill="#ffffff" />

            {/* Blush cheeks */}
            <circle cx="35" cy="24" r="3.5" fill="#f87171" opacity="0.5" />
            <circle cx="61" cy="24" r="3.5" fill="#f87171" opacity="0.5" />

            {/* Smile */}
            <path d="M 44 24 Q 48 29 52 24" stroke="#7c2d12" strokeWidth="2.5" fill="none" strokeLinecap="round" />

            {/* Dynamic Arms */}
            <line x1={leftArm.x1} y1={leftArm.y1} x2={leftArm.x2} y2={leftArm.y2} stroke="#f2c39b" strokeWidth="8" strokeLinecap="round" />
            <line x1={rightArm.x1} y1={rightArm.y1} x2={rightArm.x2} y2={rightArm.y2} stroke="#f2c39b" strokeWidth="8" strokeLinecap="round" />

            {/* Sleeve joint cuffs */}
            <circle cx={leftArm.x1} cy={leftArm.y1} r="4" fill="#0f2d6b" />
            <circle cx={rightArm.x1} cy={rightArm.y1} r="4" fill="#0f2d6b" />
          </g>

          {/* Basketball Hoop */}
          <g className="hoop" filter="url(#softShadow)">
            {/* Shorter Support pole */}
            <line
              x1={hoop.backboard.x + hoop.backboard.w / 2}
              y1={hoop.rimY - 25}
              x2={hoop.backboard.x + hoop.backboard.w / 2}
              y2={groundY(hoop.backboard.x + hoop.backboard.w / 2)}
              stroke="#4b5563"
              strokeWidth="7"
              strokeLinecap="round"
            />
            {/* Backboard attachment arm */}
            <line
              x1={hoop.backboard.x + 30}
              y1={hoop.rimY - 40}
              x2={hoop.backboard.x + hoop.backboard.w / 2}
              y2={hoop.rimY - 40}
              stroke="#374151"
              strokeWidth="5"
            />

            {/* Backboard */}
            <rect
              x={hoop.backboard.x}
              y={hoop.backboard.y}
              width="58"
              height="44"
              rx="5"
              fill="#ffffff"
              opacity="0.9"
              stroke="#374151"
              strokeWidth="3.5"
            />

            <rect
              x={hoop.backboard.x + 14}
              y={hoop.backboard.y + 12}
              width="24"
              height="18"
              rx="2"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="2.5"
            />

            {/* Net mesh */}
            <g className={netRipple ? "net ripple" : "net"}>
              <path
                d={`M ${hoop.rimL + 5} ${hoop.rimY + 2}
                    L ${hoop.rimL + 12} ${hoop.rimY + 40}
                    L ${hoop.rimR - 12} ${hoop.rimY + 40}
                    L ${hoop.rimR - 5} ${hoop.rimY + 2} Z`}
                fill="rgba(255, 255, 255, 0.15)"
                stroke="#ffffff"
                strokeWidth="1.8"
                strokeLinejoin="round"
                opacity="0.85"
              />
              {/* Crossed Net pattern */}
              <path
                d={`M ${hoop.rimL + 8} ${hoop.rimY + 2} L ${hoop.rimR - 18} ${hoop.rimY + 40}
                    M ${hoop.rimL + 20} ${hoop.rimY + 2} L ${hoop.rimR - 12} ${hoop.rimY + 40}
                    M ${hoop.rimR - 8} ${hoop.rimY + 2} L ${hoop.rimL + 18} ${hoop.rimY + 40}
                    M ${hoop.rimR - 20} ${hoop.rimY + 2} L ${hoop.rimL + 12} ${hoop.rimY + 40}`}
                stroke="#ffffff"
                strokeWidth="1.2"
                opacity="0.75"
              />
            </g>

            {/* Orange Rim */}
            <line
              x1={hoop.rimL}
              y1={hoop.rimY}
              x2={hoop.rimR}
              y2={hoop.rimY}
              stroke="#ff5e00"
              strokeWidth="4"
              strokeLinecap="round"
            />

            <circle cx={hoop.rimL} cy={hoop.rimY} r="3.5" fill="#ea580c" />
            <circle cx={hoop.rimR} cy={hoop.rimY} r="3.5" fill="#ea580c" />
          </g>
        </svg>

        {/* Score & Streak HUD Badge */}
        <div className="score-card">
          Score: {score} &nbsp;•&nbsp; Streak: {streak}
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
          className={`basketball-ball ${mode === "scored" || mode === "resetting" ? "fade" : ""}`}
          onPointerDown={handleBallPointerDown}
          style={{
            transform: `translate(${ball.x - BALL_R}px, ${ball.y - BALL_R}px) rotate(${ball.rot}deg) ${squashing ? "scale(1.2, 0.8)" : groundBouncing ? "scale(1.15, 0.85)" : ""
              }`,
            width: `${BALL_R * 2}px`,
            height: `${BALL_R * 2}px`,
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 32 32">
            <defs>
              <radialGradient id="ballGrad" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#ff9f43" />
                <stop offset="70%" stopColor="#ee5253" />
                <stop offset="100%" stopColor="#a61b1b" />
              </radialGradient>
            </defs>
            {/* Base orange sphere with gradient */}
            <circle cx="16" cy="16" r="14.5" fill="url(#ballGrad)" stroke="#7c2d12" strokeWidth="1.5" />
            {/* Ribs */}
            <path d="M 16 1.5 A 14.5 14.5 0 0 0 16 30.5" fill="none" stroke="#7c2d12" strokeWidth="1.2" />
            <path d="M 1.5 16 A 14.5 14.5 0 0 0 30.5 16" fill="none" stroke="#7c2d12" strokeWidth="1.2" />
            <path d="M 5.5 6 C 11 12, 21 12, 26.5 6" fill="none" stroke="#7c2d12" strokeWidth="1.2" />
            <path d="M 5.5 26 C 11 20, 21 20, 26.5 26" fill="none" stroke="#7c2d12" strokeWidth="1.2" />
          </svg>
        </div>
      </div>

      <style>{`
        .basketball-widget {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
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
          overflow: hidden;
          background: transparent;
          user-select: none;
          touch-action: none;
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
          top: 0;
          left: 0;
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

        .score-card {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 6;
          padding: 6px 10.5px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(28px);
          WebkitBackdropFilter: "blur(28px)";
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #111827;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Outfit', sans-serif;
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
          .hint {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
