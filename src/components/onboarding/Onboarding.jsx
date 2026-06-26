// components/onboarding/Onboarding.jsx
import { useState } from "react";
import GlassCard from "../ui/GlassCard";
import { ArrowRight, Sparkles } from "lucide-react";

const ROLES = ["Engineering Student", "Medical Student", "Working Professional", "Entrepreneur", "Other"];
const FOCUS_AREAS = ["Academics", "Work Projects", "Personal Goals", "Health & Fitness", "Finance", "Side Projects"];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ role: "", focusAreas: [], workHours: "", stressors: "" });

  function toggle(field, value) {
    setData(d => ({
      ...d,
      [field]: d[field].includes(value)
        ? d[field].filter(v => v !== value)
        : [...d[field], value],
    }));
  }

  const steps = [
    {
      title: "What's your role?",
      subtitle: "Clutch tailors priorities based on who you are",
      content: (
        <div className="flex flex-col gap-2">
          {ROLES.map(r => (
            <button
              key={r}
              onClick={() => setData(d => ({ ...d, role: r }))}
              className="px-4 py-3 rounded-xl text-sm text-left transition-all"
              style={{
                background: data.role === r ? "rgba(124,106,247,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${data.role === r ? "rgba(124,106,247,0.5)" : "rgba(255,255,255,0.08)"}`,
                color: data.role === r ? "#f0eeff" : "#7a7a9a",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      ),
      canNext: !!data.role,
    },
    {
      title: "What do you want to focus on?",
      subtitle: "Pick everything that applies",
      content: (
        <div className="flex flex-wrap gap-2">
          {FOCUS_AREAS.map(f => (
            <button
              key={f}
              onClick={() => toggle("focusAreas", f)}
              className="px-3 py-2 rounded-lg text-sm transition-all"
              style={{
                background: data.focusAreas.includes(f) ? "rgba(124,106,247,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${data.focusAreas.includes(f) ? "rgba(124,106,247,0.5)" : "rgba(255,255,255,0.08)"}`,
                color: data.focusAreas.includes(f) ? "#f0eeff" : "#7a7a9a",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      ),
      canNext: data.focusAreas.length > 0,
    },
    {
      title: "When do you usually work?",
      subtitle: "Helps Clutch suggest optimal schedules",
      content: (
        <div className="flex flex-col gap-3">
          <input
            className="input-glass"
            placeholder='e.g. "9am–6pm weekdays" or "mostly evenings"'
            value={data.workHours}
            onChange={e => setData(d => ({ ...d, workHours: e.target.value }))}
          />
          <textarea
            className="input-glass resize-none"
            rows={3}
            placeholder="Anything that usually stresses you out? (optional)"
            value={data.stressors}
            onChange={e => setData(d => ({ ...d, stressors: e.target.value }))}
          />
        </div>
      ),
      canNext: !!data.workHours,
    },
  ];

  const current = steps[step];

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#0a0a0f" }}>
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 40%, rgba(124,106,247,0.08) 0%, transparent 60%)"
      }} />

      <div className="w-full max-w-md relative">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 32 : 8,
                background: i <= step ? "#7c6af7" : "rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </div>

        <GlassCard className="p-7">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} style={{ color: "#7c6af7" }} />
              <span className="text-xs font-mono" style={{ color: "#7c6af7" }}>
                Step {step + 1} of {steps.length}
              </span>
            </div>
            <h2 className="font-display font-bold text-xl mb-1" style={{ color: "#f0eeff" }}>
              {current.title}
            </h2>
            <p className="text-sm" style={{ color: "#7a7a9a" }}>{current.subtitle}</p>
          </div>

          {current.content}

          <div className="flex justify-between mt-7">
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)} className="btn-ghost text-sm">Back</button>
            ) : <div />}
            <button
              onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : onComplete(data)}
              disabled={!current.canNext}
              className="btn-primary flex items-center gap-2"
              style={{ opacity: current.canNext ? 1 : 0.4 }}
            >
              {step < steps.length - 1 ? "Next" : "Let's go"}
              <ArrowRight size={15} />
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
