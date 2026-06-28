// components/tasks/TasksPage.jsx
import BasketballGame from "../game/BasketballGame";
import { useState, useEffect, useRef } from "react";
import GlassCard from "../ui/GlassCard";
import { Plus, Sparkles, Clock, Trash2, Check, Zap, X, Users } from "lucide-react";
import { prioritizeTasks, generateDailyPlan } from "../../lib/gemini";
import { getUserTasks, addTask, updateTask, deleteTask, awardXP } from "../../lib/firestore";

function parseTaskDate(t) {
  if (t.deadline) {
    const trimmed = t.deadline.trim().toLowerCase();
    if (trimmed.includes("today")) {
      return new Date();
    }
    if (trimmed.includes("tomorrow")) {
      return new Date(Date.now() + 86400000);
    }
    const parsed = new Date(t.deadline);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  if (t.createdAt) {
    return typeof t.createdAt.toDate === "function" ? t.createdAt.toDate() : new Date(t.createdAt);
  }
  return new Date();
}

function parseDeadlineDate(deadline) {
  if (!deadline) return null;
  const clean = deadline.trim().toLowerCase();
  if (clean.includes("today")) {
    return new Date();
  }
  if (clean.includes("tomorrow")) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  const normalized = clean.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
  const parsed = new Date(normalized);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
}

function isDueToday(deadline) {
  const parsed = parseDeadlineDate(deadline);
  if (!parsed) return false;
  return parsed.toDateString() === new Date().toDateString();
}

function isDueTomorrow(deadline) {
  const parsed = parseDeadlineDate(deadline);
  if (!parsed) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return parsed.toDateString() === tomorrow.toDateString();
}

function TaskRow({ task, onComplete, onDelete }) {
  const category = task.category || "General";

  const getTagStyle = (cat) => {
    switch (cat) {
      case "Academic":
        return { backgroundColor: "#e0e7ff", color: "#4f46e5" };
      case "Work":
        return { backgroundColor: "#dcfce7", color: "#16a34a" };
      case "Personal":
        return { backgroundColor: "#fce7f3", color: "#db2777" };
      default:
        return { backgroundColor: "#f3f4f6", color: "#4b5563" };
    }
  };

  const tagStyle = getTagStyle(category);

  return (
    <div className="task-card-group relative flex items-center justify-between py-1.5 px-2 transition-all duration-150 hover:bg-black/[0.02] rounded-lg">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Square Checkbox */}
        <button
          onClick={() => onComplete(task.id, task.completed)}
          className={`w-[16px] h-[16px] rounded border-2 transition-all flex items-center justify-center flex-shrink-0 cursor-pointer ${task.completed
            ? "bg-[#3dd68c] border-[#3dd68c]"
            : "border-[#3dd68c] bg-transparent hover:scale-105"
            }`}
          title={task.completed ? "Mark incomplete" : "Mark complete"}
        >
          {task.completed && <Check size={10} strokeWidth={4} className="text-white" />}
        </button>

        {/* Title and Deadline */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <p
            className="text-[14px] font-semibold truncate transition-all duration-200"
            style={{
              color: task.completed ? "#6B7280" : "#374151",
              textDecoration: task.completed ? "line-through" : "none",
            }}
          >
            {task.title}
          </p>
          {task.deadline && (
            <span className="flex items-center gap-1 text-[10px] text-[#6B7280] flex-shrink-0 font-medium font-mono">
              <Clock size={10} />
              {task.deadline}
            </span>
          )}
        </div>
      </div>

      {/* Right Category Pill & Swipe Trash Button */}
      <div className="flex items-center gap-2 pl-2">
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={tagStyle}
        >
          {category}
        </span>
        <button
          onClick={() => onDelete(task.id)}
          className="trash-hover-btn p-1.5 rounded-md hover:bg-red-500/10 text-red-500/80 hover:text-red-600 transition-colors flex-shrink-0"
          title="Delete task"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// Mini Calendar Component
function MiniCalendar({ tasks }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y, m) => new Date(y, m, 1).getDay();

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"];

  const handlePrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const daysCount = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysCount; i++) {
    days.push(new Date(year, month, i));
  }

  const hasTasksOnDate = (date) => {
    if (!date) return false;
    const dateString = date.toDateString();
    return tasks.some(t => parseTaskDate(t).toDateString() === dateString);
  };

  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">
          {monthNames[month]} {year}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={handlePrev}
            className="p-1 rounded hover:bg-[#2a2d3a] text-[#8b8fa8] hover:text-white transition-colors text-xs"
          >
            &lt;
          </button>
          <button
            onClick={handleNext}
            className="p-1 rounded hover:bg-[#2a2d3a] text-[#8b8fa8] hover:text-white transition-colors text-xs"
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] mb-1 font-mono font-bold text-[#8b8fa8]">
        {dayNames.map((n, idx) => (
          <div key={idx} className="w-7 h-5 flex items-center justify-center">
            {n}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {days.map((d, idx) => {
          if (!d) return <div key={idx} className="w-7 h-7" />;
          const isToday = d.toDateString() === today.toDateString();
          const hasTask = hasTasksOnDate(d);
          return (
            <div
              key={idx}
              className="relative w-7 h-7 flex items-center justify-center rounded-md font-medium"
              style={{
                border: isToday ? "1.5px solid #3dd68c" : "none",
                backgroundColor: isToday ? "rgba(61, 214, 140, 0.05)" : "transparent",
                color: isToday ? "#3dd68c" : "#ffffff",
              }}
            >
              <span>{d.getDate()}</span>
              {hasTask && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#3dd68c]" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// SVG/CSS Completed Tasks Chart Component
function ProductivityChart({ tasks }) {
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
  const now = new Date();
  const todayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1; // Mon=0, Sun=6

  const getCompletedCounts = () => {
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() + distanceToMonday);

    const counts = [0, 0, 0, 0, 0, 0, 0];
    tasks.forEach(t => {
      if (t.completed) {
        const tDate = parseTaskDate(t);
        tDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((tDate - monday) / 86400000);
        if (diffDays >= 0 && diffDays < 7) {
          counts[diffDays]++;
        }
      }
    });
    return counts;
  };

  const counts = getCompletedCounts();
  const maxCount = Math.max(...counts, 1);

  return (
    <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-2xl p-4 mt-5">
      <h3 className="text-[12px] font-bold text-white uppercase tracking-wider mb-4">Productivity Score</h3>
      <div className="flex justify-between items-end h-[90px] gap-2 px-1">
        {counts.map((count, index) => {
          const isToday = index === todayIndex;
          const percent = (count / maxCount) * 80;
          const barHeight = Math.max(percent, count > 0 ? 10 : 4);

          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer">
              <div className="relative w-full flex items-end justify-center h-[60px]">
                {/* Tooltip */}
                <span className="absolute -top-6 bg-[#0c0e13] text-[#3dd68c] text-[10px] px-1.5 py-0.5 rounded border border-[#2a2d3a] opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                  {count}
                </span>
                {/* Bar */}
                <div
                  className="w-3 rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${barHeight}%`,
                    background: isToday ? "#3dd68c" : "rgba(61, 214, 140, 0.4)",
                    boxShadow: isToday ? "0 0 10px rgba(61, 214, 140, 0.3)" : "none",
                  }}
                />
              </div>
              <span
                className="text-[10px] font-bold font-mono"
                style={{ color: isToday ? "#3dd68c" : "#8b8fa8" }}
              >
                {weekDays[index]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TasksPage({ user, userContext, isActive, viewMode = "dashboard", onViewAll, focusInputTrigger, onNavigate }) {
  const prioritizeRef = useRef(false);
  const inputRef = useRef(null);
  const [tasks, setTasks] = useState([]);
  const [dismissedBanners, setDismissedBanners] = useState(new Set());
  const [newTask, setNewTask] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newCategory, setNewCategory] = useState("auto");
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [prioritizing, setPrioritizing] = useState(false);
  const [xpPopup, setXpPopup] = useState(null);

  // Daily Battle Plan states
  const [battlePlan, setBattlePlan] = useState("");
  const [planLoading, setPlanLoading] = useState(false);

  // Basketball easter egg states
  const [isAnimating, setIsAnimating] = useState(false);
  const [hoopGlow, setHoopGlow] = useState(false);

  // Load tasks from Firestore on mount
  useEffect(() => {
    if (!isActive) return;
    if (!user?.uid) return;
    getUserTasks(user.uid)
      .then(setTasks)
      .finally(() => setLoadingTasks(false));
  }, [user?.uid, isActive]);

  // Load daily plan
  useEffect(() => {
    if (!isActive || !user?.uid || loadingTasks) return;

    const getPlan = async () => {
      const todayStr = new Date().toDateString();
      const cachedDate = localStorage.getItem("battlePlanDate");
      const cachedText = localStorage.getItem("battlePlanText");

      if (cachedDate === todayStr && cachedText) {
        setBattlePlan(cachedText);
        return;
      }

      setPlanLoading(true);
      try {
        const incomplete = tasks.filter(t => !t.completed);
        const plan = await generateDailyPlan(incomplete, userContext || {});
        setBattlePlan(plan);
        localStorage.setItem("battlePlanDate", todayStr);
        localStorage.setItem("battlePlanText", plan);
      } catch (err) {
        console.error("Error generating daily battle plan:", err);
      } finally {
        setPlanLoading(false);
      }
    };

    getPlan();
  }, [isActive, user?.uid, userContext, loadingTasks]);

  // Handle focus triggers
  useEffect(() => {
    if (focusInputTrigger > 0) {
      handleQuickAddFocus();
    }
  }, [focusInputTrigger]);

  const handleQuickAddFocus = () => {
    if (inputRef.current) {
      inputRef.current.focus();
      setIsExpanded(true);
    }
  };

  const handleDailyRecap = async () => {
    localStorage.removeItem("battlePlanDate");
    localStorage.removeItem("battlePlanText");
    setBattlePlan("");
    setPlanLoading(true);
    try {
      const incomplete = tasks.filter(t => !t.completed);
      const plan = await generateDailyPlan(incomplete, userContext || {});
      setBattlePlan(plan);
      const todayStr = new Date().toDateString();
      localStorage.setItem("battlePlanDate", todayStr);
      localStorage.setItem("battlePlanText", plan);
    } catch (err) {
      console.error("Error regenerating battle plan:", err);
    } finally {
      setPlanLoading(false);
    }
  };

  // Keyword auto-assign logic
  const getCategoryFromTitle = (title) => {
    const t = (title || "").toLowerCase();
    if (t.includes("homework") || t.includes("assignment") || t.includes("exam")) {
      return "Academic";
    }
    if (t.includes("shop") || t.includes("buy") || t.includes("mall")) {
      return "Personal";
    }
    if (t.includes("work") || t.includes("meeting") || t.includes("email")) {
      return "Work";
    }
    return "General";
  };

  const detectedCategory = getCategoryFromTitle(newTask);

  async function handleAdd() {
    if (!newTask.trim() || !user?.uid) return;
    const finalCategory = newCategory === "auto" ? detectedCategory : newCategory;

    let formattedDeadline = "";
    if (newDeadline) {
      const dateObj = new Date(newDeadline);
      if (!isNaN(dateObj.getTime())) {
        // Format to a clean date string, e.g. "Jun 29, 2026"
        formattedDeadline = dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      } else {
        formattedDeadline = newDeadline;
      }
    }

    const ref = await addTask(user.uid, {
      title: newTask.trim(),
      deadline: formattedDeadline,
      category: finalCategory,
    });

    setTasks(prev => [
      {
        id: ref.id,
        title: newTask.trim(),
        deadline: formattedDeadline,
        category: finalCategory,
        completed: false,
        priority: "med",
      },
      ...prev,
    ]);

    setNewTask("");
    setNewDeadline("");
    setNewCategory("auto");
    setIsExpanded(false);
  }

  async function handleComplete(taskId, currentlyDone) {
    const newDone = !currentlyDone;
    const now = new Date().toISOString();
    await updateTask(taskId, {
      completed: newDone,
      completedAt: newDone ? now : null,
      updatedAt: now
    });
    setTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      completed: newDone,
      completedAt: newDone ? now : null,
      updatedAt: now
    } : t));

    if (newDone && user?.uid) {
      const result = await awardXP(user.uid);
      if (result) {
        setXpPopup(`+50 XP`);
        setTimeout(() => setXpPopup(null), 2000);
      }
    }
  }

  async function handleDelete(taskId) {
    await deleteTask(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }

  async function handlePrioritize() {
    if (prioritizeRef.current) return;
    prioritizeRef.current = true;
    if (prioritizing || tasks.length === 0) {
      prioritizeRef.current = false;
      return;
    }
    setPrioritizing(true);
    try {
      const pending = tasks.filter(t => !t.completed);
      const result = await prioritizeTasks(pending, userContext ?? { role: "student" });

      const updates = {};
      result.forEach(r => {
        const task = pending[r.id];
        if (task) updates[task.id] = { priority: r.priority, reason: r.reason };
      });

      await Promise.all(
        Object.entries(updates).map(([taskId, data]) => updateTask(taskId, data))
      );

      setTasks(prev =>
        prev.map(t => updates[t.id] ? { ...t, ...updates[t.id] } : t)
      );
    } catch (e) {
      console.error(e);
    } finally {
      setPrioritizing(false);
      prioritizeRef.current = false;
    }
  }

  const triggerBasketballAnimation = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    // glow when ball goes through hoop at 0.8s
    setTimeout(() => {
      setHoopGlow(true);
    }, 800);

    setTimeout(() => {
      setHoopGlow(false);
    }, 1300);

    setTimeout(() => {
      setIsAnimating(false);
    }, 1000);
  };

  const pending = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);

  const displayTasks = viewMode === "dashboard" ? pending : tasks;


  return (
    <div className="min-h-screen relative text-[#374151] h-screen overflow-hidden">
      {/* XP Popup overlay */}
      {xpPopup && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full font-mono font-bold text-sm"
          style={{
            background: "rgba(61,214,140,0.15)",
            color: "#3dd68c",
            border: "1px solid #3dd68c",
            transform: "translateX(-50%)",
          }}
        >
          {xpPopup} 🎉
        </div>
      )}

      {/* Background Basketball Game */}
      {viewMode === "dashboard" && (
        <BasketballGame />
      )}

      {/* Main Container */}
      <div
        className={`max-w-6xl mx-auto px-6 relative h-full py-4 flex flex-col min-h-0 z-10 ${viewMode === "dashboard" ? "pointer-events-none" : ""
          }`}
      >

        {viewMode === "dashboard" ? (
          <>
            <div className="max-w-2xl mx-auto flex flex-col w-full mt-2 animate-page-enter pointer-events-auto">
              <div
                className="p-5 md:p-6 flex flex-col w-full"
                style={{
                  background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04))",
                  backdropFilter: "blur(28px)",
                  WebkitBackdropFilter: "blur(28px)",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  borderRadius: "28px",
                }}
              >
                {/* Reminder Banner System */}
                {(() => {
                  const getTaskPriorityValue = (p) => {
                    if (p === "high") return 3;
                    if (p === "med") return 2;
                    if (p === "low") return 1;
                    return 0;
                  };

                  const activeBanners = pending
                    .filter(t => !dismissedBanners.has(t.id))
                    .filter(t => isDueToday(t.deadline) || isDueTomorrow(t.deadline))
                    .map(t => ({
                      ...t,
                      isToday: isDueToday(t.deadline),
                      isTomorrow: isDueTomorrow(t.deadline),
                    }))
                    .sort((a, b) => {
                      if (a.isToday && !b.isToday) return -1;
                      if (!a.isToday && b.isToday) return 1;
                      const pA = getTaskPriorityValue(a.priority);
                      const pB = getTaskPriorityValue(b.priority);
                      if (pA !== pB) return pB - pA;
                      return a.title.localeCompare(b.title);
                    })
                    .slice(0, 2);

                  return activeBanners.map(banner => {
                    const bannerStyle = banner.isToday
                      ? {
                        background: "rgba(247,106,106,0.15)",
                        border: "1px solid rgba(247,106,106,0.4)",
                        color: "#f76a6a",
                        padding: "12px 16px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        borderRadius: "16px",
                        marginBottom: "12px",
                        justifyContent: "space-between",
                        gap: "12px",
                        pointerEvents: "auto"
                      }
                      : {
                        background: "rgba(247,194,106,0.15)",
                        border: "1px solid rgba(247,194,106,0.4)",
                        color: "#f7c26a",
                        padding: "12px 16px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        borderRadius: "16px",
                        marginBottom: "12px",
                        justifyContent: "space-between",
                        gap: "12px",
                        pointerEvents: "auto"
                      };

                    return (
                      <GlassCard key={banner.id} style={bannerStyle} className="flex-shrink-0">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-base flex-shrink-0">{banner.isToday ? "⚠️" : "📅"}</span>
                          <span className="text-sm font-semibold truncate flex-1 leading-none pt-[1px]">
                            {banner.isToday
                              ? `${banner.title} is due TODAY — don't miss it!`
                              : `${banner.title} is due tomorrow — plan ahead!`}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setDismissedBanners(prev => {
                              const next = new Set(prev);
                              next.add(banner.id);
                              return next;
                            });
                          }}
                          className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0 text-current opacity-70 hover:opacity-100"
                          title="Dismiss banner"
                        >
                          <X size={14} />
                        </button>
                      </GlassCard>
                    );
                  });
                })()}

                {/* Top Greeting Header Row */}
                <div className="flex items-start justify-between mb-5 flex-shrink-0">
                  <div>
                    <h1 className="font-display font-bold text-[26px] text-[#111827] leading-tight tracking-tight">
                      Good morning, {user?.displayName || "there"}
                    </h1>
                    <p className="text-xs font-semibold text-[#6B7280] mt-0.5 font-mono uppercase tracking-wide">
                      You have {pending.length} tasks today
                    </p>
                  </div>
                  <button
                    onClick={handlePrioritize}
                    disabled={prioritizing || pending.length === 0}
                    className="btn-primary flex items-center gap-2 text-xs py-1.5 px-3 h-8.5 rounded-lg font-bold flex-shrink-0"
                  >
                    <Sparkles size={12} strokeWidth={2.5} />
                    {prioritizing ? "Prioritizing..." : "AI Prioritize"}
                  </button>
                </div>

                {/* Task Add search style input */}
                <div
                  className={`transition-all duration-300 bg-white/15 backdrop-blur-[28px] border border-white/20 flex flex-col gap-3 mb-4 relative flex-shrink-0 ${isExpanded || newTask.trim() ? "rounded-2xl p-4" : "rounded-full py-2 px-4"
                    }`}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget) && !newTask.trim()) {
                      setIsExpanded(false);
                    }
                  }}
                >
                  {(isExpanded || newTask.trim() !== "") && (
                    <div className="flex gap-3 items-center animate-page-enter">
                      <div className="flex-1">
                        <label className="block text-[9px] uppercase tracking-wider text-[#6B7280] mb-1 font-mono font-bold">
                          Deadline
                        </label>
                        <input
                          type="date"
                          className="w-full bg-white/30 rounded-lg px-3 py-1.5 text-xs text-[#374151] outline-none cursor-pointer"
                          value={newDeadline}
                          onChange={e => setNewDeadline(e.target.value)}
                        />
                      </div>
                      <div className="w-1/3">
                        <label className="block text-[9px] uppercase tracking-wider text-[#6B7280] mb-1 font-mono font-bold">
                          Category
                        </label>
                        <select
                          className="w-full bg-white/30 rounded-lg px-3 py-1.5 text-xs text-[#374151] outline-none cursor-pointer"
                          value={newCategory}
                          onChange={e => setNewCategory(e.target.value)}
                        >
                          <option value="auto">Auto ({detectedCategory})</option>
                          <option value="Academic">Academic</option>
                          <option value="Personal">Personal</option>
                          <option value="Work">Work</option>
                          <option value="General">General</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 items-center w-full">
                    <input
                      ref={inputRef}
                      type="text"
                      className="bg-transparent flex-1 py-1 px-1 text-sm text-[#374151] placeholder-[#6B7280] outline-none"
                      placeholder="+ Add new task..."
                      value={newTask}
                      onFocus={() => setIsExpanded(true)}
                      onChange={e => {
                        setNewTask(e.target.value);
                        if (!isExpanded) setIsExpanded(true);
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          handleAdd();
                        }
                      }}
                    />
                    <button
                      onClick={handleAdd}
                      className="bg-[#3dd68c] hover:bg-[#5ce2a7] transition-all text-[#0c0e13] flex items-center justify-center rounded-full w-8 h-8 flex-shrink-0"
                      title="Add task"
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                {/* Section Header */}
                <div className="flex items-center justify-between pb-2 mb-1.5 flex-shrink-0">
                  <h2 className="text-xs font-bold text-[#111827] uppercase tracking-wider font-mono">
                    Today's Tasks
                  </h2>
                  <button
                    onClick={onViewAll}
                    className="text-xs font-bold text-[#3dd68c] hover:text-[#5ce2a7] transition-colors tracking-wide"
                  >
                    VIEW ALL
                  </button>
                </div>

                {/* Task rows */}
                <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                  {loadingTasks ? (
                    <p className="text-[#6B7280] text-sm py-4 italic">Loading tasks...</p>
                  ) : displayTasks.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {displayTasks.map(t => (
                        <TaskRow key={t.id} task={t} onComplete={handleComplete} onDelete={handleDelete} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#6B7280] text-sm py-6 italic text-center border-b border-[#6B7280]/20 border-dashed">
                      No pending tasks for today. Add one above or shoot some hoops! 🏀
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* =======================================================
             ALL TASKS VIEW LAYOUT (Tasks Tab)
             ======================================================= */
          <div className="max-w-2xl mx-auto flex flex-col w-full flex-1 min-h-0 mt-2 animate-page-enter">
            <div
              className="p-5 md:p-6 flex flex-col w-full flex-1 min-h-0"
              style={{
                background: "linear-gradient(to bottom, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04))",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                borderRadius: "28px",
              }}
            >
              {/* Top Greeting Header Row */}
              <div className="flex items-start justify-between mb-5 flex-shrink-0">
                <div>
                  <h1 className="font-display font-bold text-[26px] text-[#111827] leading-tight tracking-tight">
                    All Tasks
                  </h1>
                  <p className="text-xs font-semibold text-[#6B7280] mt-0.5 font-mono uppercase tracking-wide">
                    Pending: {pending.length} &nbsp;•&nbsp; Completed: {done.length}
                  </p>
                </div>
              </div>

              {/* Task Add search style input */}
              <div
                className={`transition-all duration-300 bg-white/15 backdrop-blur-[28px] border border-white/20 flex flex-col gap-3 mb-4 relative flex-shrink-0 ${isExpanded || newTask.trim() ? "rounded-2xl p-4" : "rounded-full py-2 px-4"
                  }`}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget) && !newTask.trim()) {
                    setIsExpanded(false);
                  }
                }}
              >
                {(isExpanded || newTask.trim() !== "") && (
                  <div className="flex gap-3 items-center animate-page-enter">
                    <div className="flex-1">
                      <label className="block text-[9px] uppercase tracking-wider text-[#6B7280] mb-1 font-mono font-bold">
                        Deadline
                      </label>
                      <input
                        type="date"
                        className="w-full bg-white/30 rounded-lg px-3 py-1.5 text-xs text-[#374151] outline-none cursor-pointer"
                        value={newDeadline}
                        onChange={e => setNewDeadline(e.target.value)}
                      />
                    </div>
                    <div className="w-1/3">
                      <label className="block text-[9px] uppercase tracking-wider text-[#6B7280] mb-1 font-mono font-bold">
                        Category
                      </label>
                      <select
                        className="w-full bg-white/30 rounded-lg px-3 py-1.5 text-xs text-[#374151] outline-none cursor-pointer"
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                      >
                        <option value="auto">Auto ({detectedCategory})</option>
                        <option value="Academic">Academic</option>
                        <option value="Personal">Personal</option>
                        <option value="Work">Work</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 items-center w-full">
                  <input
                    ref={inputRef}
                    type="text"
                    className="bg-transparent flex-1 py-1 px-1 text-sm text-[#374151] placeholder-[#6B7280] outline-none"
                    placeholder="+ Add new task..."
                    value={newTask}
                    onFocus={() => setIsExpanded(true)}
                    onChange={e => {
                      setNewTask(e.target.value);
                      if (!isExpanded) setIsExpanded(true);
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        handleAdd();
                      }
                    }}
                  />
                  <button
                    onClick={handleAdd}
                    className="bg-[#3dd68c] hover:bg-[#5ce2a7] transition-all text-[#0c0e13] flex items-center justify-center rounded-full w-8 h-8 flex-shrink-0"
                    title="Add task"
                  >
                    <Plus size={16} strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* Task list container (Only scrollable container) */}
              <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                {loadingTasks ? (
                  <p className="text-center text-sm py-8 text-[#6B7280]">Loading tasks…</p>
                ) : (
                  <>
                    {pending.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs font-mono uppercase tracking-widest mb-2 text-[#6B7280] font-bold">
                          Pending — {pending.length}
                        </p>
                        <div className="flex flex-col gap-1">
                          {pending.map(t => (
                            <TaskRow key={t.id} task={t} onComplete={handleComplete} onDelete={handleDelete} />
                          ))}
                        </div>
                      </div>
                    )}

                    {done.length > 0 && (
                      <div className="mb-6">
                        <p className="text-xs font-mono uppercase tracking-widest mb-2 text-[#6B7280] font-bold">
                          Completed — {done.length}
                        </p>
                        <div className="flex flex-col gap-1 opacity-65">
                          {done.map(t => (
                            <TaskRow key={t.id} task={t} onComplete={handleComplete} onDelete={handleDelete} />
                          ))}
                        </div>
                      </div>
                    )}

                    {tasks.length === 0 && (
                      <div className="p-8 text-center flex flex-col items-center justify-center">
                        <span className="text-3xl mb-3 animate-pulse">✨</span>
                        <p className="text-sm font-bold mb-1 text-[#111827]">Your board is clear!</p>
                        <p className="text-xs max-w-xs text-[#6B7280]">Add tasks above to structure your workflow.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}