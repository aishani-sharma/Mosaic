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

function TaskRow({ task, onComplete, onDelete }) {
  const category = task.category || "General";

  const getTagStyle = (cat) => {
    switch (cat) {
      case "Academic":
        return { backgroundColor: "#3b4fd8", color: "#8b9dff" };
      case "Work":
        return { backgroundColor: "#2d5a3d", color: "#3dd68c" };
      case "Personal":
        return { backgroundColor: "#5a2d4a", color: "#d68bc4" };
      default:
        return { backgroundColor: "#2a2d3a", color: "#8b8fa8" };
    }
  };

  const tagStyle = getTagStyle(category);

  return (
    <div className="task-card-group relative flex items-center justify-between py-3.5 border-b border-[#2a2d3a] transition-all duration-150 hover:bg-white/[0.01] px-2">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Square Checkbox */}
        <button
          onClick={() => onComplete(task.id, task.completed)}
          className={`w-[18px] h-[18px] rounded border-2 transition-all flex items-center justify-center flex-shrink-0 cursor-pointer ${task.completed
            ? "bg-[#3dd68c] border-[#3dd68c]"
            : "border-[#3dd68c] bg-transparent hover:scale-105"
            }`}
          title={task.completed ? "Mark incomplete" : "Mark complete"}
        >
          {task.completed && <Check size={12} strokeWidth={4} className="text-[#0c0e13]" />}
        </button>

        {/* Title and Deadline */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <p
            className="text-[15px] font-semibold truncate transition-all duration-200"
            style={{
              color: task.completed ? "#8b8fa8" : "#ffffff",
              textDecoration: task.completed ? "line-through" : "none",
            }}
          >
            {task.title}
          </p>
          {task.deadline && (
            <span className="flex items-center gap-1 text-[11px] text-[#8b8fa8] flex-shrink-0 font-medium font-mono">
              <Clock size={11} />
              {task.deadline}
            </span>
          )}
        </div>
      </div>

      {/* Right Category Pill & Swipe Trash Button */}
      <div className="flex items-center gap-3 pl-2">
        <span
          className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
          style={tagStyle}
        >
          {category}
        </span>
        <button
          onClick={() => onDelete(task.id)}
          className="trash-hover-btn p-1.5 rounded-md hover:bg-red-500/10 text-red-400 transition-colors flex-shrink-0"
          title="Delete task"
        >
          <Trash2 size={13} />
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

    const ref = await addTask(user.uid, {
      title: newTask.trim(),
      deadline: newDeadline,
      category: finalCategory,
    });

    setTasks(prev => [
      {
        id: ref.id,
        title: newTask.trim(),
        deadline: newDeadline,
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
    await updateTask(taskId, { completed: newDone });
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: newDone } : t));

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
    <div className="min-h-screen relative bg-[#0f1117] text-white">
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

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-6 py-8 relative">

        {/* Top Greeting Header Row */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display font-bold text-[32px] text-white leading-tight tracking-tight">
              Good morning, {user?.displayName || "there"}
            </h1>
            <p className="text-sm font-semibold text-[#8b8fa8] mt-1 font-mono uppercase tracking-wide">
              You have {pending.length} tasks today
            </p>
          </div>
          <button
            onClick={handlePrioritize}
            disabled={prioritizing || pending.length === 0}
            className="btn-primary flex items-center gap-2 text-xs py-2 px-3.5 h-9 rounded-lg font-bold"
          >
            <Sparkles size={13} strokeWidth={2.5} />
            {prioritizing ? "Prioritizing..." : "AI Prioritize"}
          </button>
        </div>

        {viewMode === "dashboard" ? (
          /* =======================================================
             TWO COLUMN DASHBOARD LAYOUT (Dashboard Tab)
             ======================================================= */
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* Left Column (60%): Tasks and Input */}
            <div className="w-full lg:w-[60%] flex flex-col">

              {/* Task Add search style input */}
              <div
                className="mb-6 relative"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget) && !newTask.trim()) {
                    setIsExpanded(false);
                  }
                }}
              >
                <div
                  className={`rounded-xl bg-[#1a1d27] border transition-all duration-200 ${isExpanded || newTask.trim()
                    ? "border-[#3dd68c]"
                    : "border-[#2a2d3a]"
                    } p-3 flex flex-col gap-3`}
                >
                  {(isExpanded || newTask.trim() !== "") && (
                    <div className="flex gap-3 items-center animate-page-enter">
                      <div className="flex-1">
                        <label className="block text-[9px] uppercase tracking-wider text-[#8b8fa8] mb-1 font-mono font-bold">
                          Deadline
                        </label>
                        <input
                          type="text"
                          className="w-full bg-[#0c0e13] border border-[#2a2d3a] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#3dd68c]"
                          placeholder="e.g. Today, 5:00 PM"
                          value={newDeadline}
                          onChange={e => setNewDeadline(e.target.value)}
                        />
                      </div>
                      <div className="w-1/3">
                        <label className="block text-[9px] uppercase tracking-wider text-[#8b8fa8] mb-1 font-mono font-bold">
                          Category
                        </label>
                        <select
                          className="w-full bg-[#0c0e13] border border-[#2a2d3a] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#3dd68c] cursor-pointer"
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

                  <div className="flex gap-2 items-center">
                    <input
                      ref={inputRef}
                      type="text"
                      className="bg-transparent flex-1 py-1 px-2 text-sm text-white placeholder-[#8b8fa8] outline-none"
                      placeholder="Add new task..."
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
                      className="bg-[#3dd68c] hover:bg-[#5ce2a7] transition-all text-[#0c0e13] flex items-center justify-center rounded-lg w-8 h-8 flex-shrink-0"
                      title="Add task"
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-[#2a2d3a] pb-3 mb-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
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
              {loadingTasks ? (
                <p className="text-[#8b8fa8] text-sm py-4 italic">Loading tasks...</p>
              ) : displayTasks.length > 0 ? (
                <div className="flex flex-col">
                  {displayTasks.map(t => (
                    <TaskRow key={t.id} task={t} onComplete={handleComplete} onDelete={handleDelete} />
                  ))}
                </div>
              ) : (
                <p className="text-[#8b8fa8] text-sm py-6 italic text-center border-b border-[#2a2d3a] border-dashed">
                  No pending tasks for today. Add one above or shoot some hoops! 🏀
                </p>
              )}

              {/* Gemini plan card in dashboard Mode */}
              <div className="mt-8">
                <div
                  className="bg-[#1a1d27] border border-[#2a2d3a] p-5 rounded-2xl relative overflow-hidden"
                  style={{ borderLeft: "4px solid #3dd68c" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={16} className="text-[#3dd68c]" />
                    <span className="font-display font-bold text-xs text-white uppercase tracking-wider">
                      Today's Battle Plan
                    </span>
                  </div>
                  {planLoading ? (
                    <div className="flex items-center gap-2 text-xs font-mono text-[#8b8fa8] py-2">
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-t-transparent border-[#3dd68c]" />
                      Generating your plan...
                    </div>
                  ) : battlePlan ? (
                    <p className="text-sm whitespace-pre-line leading-relaxed text-[#8b8fa8]">
                      {battlePlan}
                    </p>
                  ) : (
                    <p className="text-sm text-[#8b8fa8] italic py-1">
                      No active tasks to review. Add tasks to start planning.
                    </p>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column (40%): compact calendar, bar chart, quick actions */}
            <div className="w-full lg:w-[40%] flex flex-col">
              <MiniCalendar tasks={tasks} />

              <ProductivityChart tasks={tasks} />

              {/* Quick Actions Panel */}
              <div className="bg-[#1a1d27] border border-[#2a2d3a] rounded-2xl p-4 mt-5">
                <h3 className="text-[12px] font-bold text-white uppercase tracking-wider mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    onClick={handleDailyRecap}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#0c0e13] border border-[#2a2d3a] hover:border-[#3dd68c] hover:text-[#3dd68c] transition-all text-[11px] font-bold text-[#8b8fa8]"
                  >
                    <Zap size={15} className="mb-1.5" />
                    Daily Recap
                  </button>
                  <button
                    onClick={handleQuickAddFocus}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#0c0e13] border border-[#2a2d3a] hover:border-[#3dd68c] hover:text-[#3dd68c] transition-all text-[11px] font-bold text-[#8b8fa8]"
                  >
                    <Plus size={15} className="mb-1.5" />
                    Quick Add
                  </button>
                  <button
                    onClick={() => onNavigate && onNavigate("feed")}
                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#0c0e13] border border-[#2a2d3a] hover:border-[#3dd68c] hover:text-[#3dd68c] transition-all text-[11px] font-bold text-[#8b8fa8]"
                  >
                    <Users size={15} className="mb-1.5" />
                    Collaborate
                  </button>
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* =======================================================
             ALL TASKS VIEW LAYOUT (Tasks Tab)
             ======================================================= */
          <div className="max-w-2xl mx-auto flex flex-col">

            {/* Task Add search style input */}
            <div
              className="mb-8 relative"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget) && !newTask.trim()) {
                  setIsExpanded(false);
                }
              }}
            >
              <div
                className={`rounded-xl bg-[#1a1d27] border transition-all duration-200 ${isExpanded || newTask.trim()
                  ? "border-[#3dd68c]"
                  : "border-[#2a2d3a]"
                  } p-3 flex flex-col gap-3`}
              >
                {(isExpanded || newTask.trim() !== "") && (
                  <div className="flex gap-3 items-center animate-page-enter">
                    <div className="flex-1">
                      <label className="block text-[9px] uppercase tracking-wider text-[#8b8fa8] mb-1 font-mono font-bold">
                        Deadline
                      </label>
                      <input
                        type="text"
                        className="w-full bg-[#0c0e13] border border-[#2a2d3a] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#3dd68c]"
                        placeholder="e.g. Today, 5:00 PM"
                        value={newDeadline}
                        onChange={e => setNewDeadline(e.target.value)}
                      />
                    </div>
                    <div className="w-1/3">
                      <label className="block text-[9px] uppercase tracking-wider text-[#8b8fa8] mb-1 font-mono font-bold">
                        Category
                      </label>
                      <select
                        className="w-full bg-[#0c0e13] border border-[#2a2d3a] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#3dd68c] cursor-pointer"
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

                <div className="flex gap-2 items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    className="bg-transparent flex-1 py-1 px-2 text-sm text-white placeholder-[#8b8fa8] outline-none"
                    placeholder="Add new task..."
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
                    className="bg-[#3dd68c] hover:bg-[#5ce2a7] transition-all text-[#0c0e13] flex items-center justify-center rounded-lg w-8 h-8 flex-shrink-0"
                    title="Add task"
                  >
                    <Plus size={16} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>

            {loadingTasks ? (
              <p className="text-center text-sm py-8 text-[#8b8fa8]">Loading tasks…</p>
            ) : (
              <>
                {pending.length > 0 && (
                  <div className="mb-8">
                    <p className="text-xs font-mono uppercase tracking-widest mb-3 text-[#8b8fa8] font-bold">
                      Pending — {pending.length}
                    </p>
                    <div className="flex flex-col">
                      {pending.map(t => (
                        <TaskRow key={t.id} task={t} onComplete={handleComplete} onDelete={handleDelete} />
                      ))}
                    </div>
                  </div>
                )}

                {done.length > 0 && (
                  <div className="mb-8">
                    <p className="text-xs font-mono uppercase tracking-widest mb-3 text-[#8b8fa8] font-bold">
                      Completed — {done.length}
                    </p>
                    <div className="flex flex-col opacity-65">
                      {done.map(t => (
                        <TaskRow key={t.id} task={t} onComplete={handleComplete} onDelete={handleDelete} />
                      ))}
                    </div>
                  </div>
                )}

                {tasks.length === 0 && (
                  <div className="bg-[#1a1d27] border border-[#2a2d3a] p-10 text-center rounded-2xl flex flex-col items-center justify-center">
                    <span className="text-4xl mb-4 animate-pulse">✨</span>
                    <p className="text-base font-bold mb-1 text-white">Your board is clear!</p>
                    <p className="text-xs max-w-xs text-[#8b8fa8]">Add tasks above to structure your workflow.</p>
                  </div>
                )}
              </>
            )}

            <div style={{ marginTop: 24 }}>
              <BasketballGame />
            </div>
          </div>
        )}

      </div>

      {/* Basketball Easter Egg Hoop */}
      <div
        className={`absolute top-6 right-6 z-40 p-2 border-2 border-transparent transition-all duration-300 ${hoopGlow ? "hoop-glow" : ""
          }`}
        style={{ pointerEvents: "none" }}
      >
        <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
          <line x1="12" y1="16" x2="36" y2="16" stroke="#3dd68c" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="14" y1="18" x2="34" y2="18" stroke="#3dd68c" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M14,18 L18,36 M34,18 L30,36 M18,36 L30,36" stroke="#3dd68c" strokeWidth="1.5" strokeDasharray="2,2" />
          <path d="M19,18 L24,36 M29,18 L24,36" stroke="#3dd68c" strokeWidth="1" strokeOpacity="0.7" />
          <path d="M14,24 Q24,28 34,24 M16,30 Q24,34 32,30" stroke="#3dd68c" strokeWidth="1" strokeOpacity="0.5" />
        </svg>
      </div>

      {/* Basketball Easter Egg button */}
      <button
        onClick={triggerBasketballAnimation}
        className={`absolute top-[324px] right-[124px] z-50 text-2xl cursor-pointer select-none transition-transform hover:scale-110 active:scale-95 outline-none bg-none border-none p-0 m-0 ${isAnimating ? "animate-basketball-new" : ""
          }`}
        style={{ background: "none", border: "none" }}
        title="Shoot a hoop!"
      >
        🏀
      </button>

      <div style={{ marginTop: 24 }}>
        <BasketballGame />
      </div>
    </div>
  );
}