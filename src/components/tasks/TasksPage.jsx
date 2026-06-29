// components/tasks/TasksPage.jsx
import BasketballGame from "../game/BasketballGame";
import { useState, useEffect, useRef } from "react";
import GlassCard from "../ui/GlassCard";
import { Plus, Sparkles, Clock, Trash2, Check, Zap, X, Users, AlertCircle, Calendar, RotateCcw } from "lucide-react";
import { prioritizeTasks, breakdownTask } from "../../lib/gemini";
import { generateAiBattlePlan } from "../../lib/planner";
import { getUserTasks, addTask, updateTask, deleteTask } from "../../lib/firestore";

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

function TaskRow({ task, onComplete, onDelete, onToggleExpand, isExpanded, bouncingId, flashingId }) {
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

  const priority = (task.priority || "med").toLowerCase();
  let badgeStyle = {};
  let priorityText = "MED";

  if (priority === "high") {
    badgeStyle = {
      background: "#f76a6a",
      color: "#ffffff",
      border: "none",
    };
    priorityText = "HIGH";
  } else if (priority === "low") {
    badgeStyle = {
      background: "#45d09e",
      color: "#ffffff",
      border: "none",
    };
    priorityText = "LOW";
  } else {
    badgeStyle = {
      background: "#f7c26a",
      color: "#ffffff",
      border: "none",
    };
    priorityText = "MED";
  }

  const badgeCommonStyle = {
    fontSize: "10px",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "4px",
    fontFamily: "monospace",
  };

  return (
    <div
      className="task-card-group relative flex items-center justify-between py-1.5 px-2 transition-all duration-150 hover:bg-black/[0.02] rounded-lg"
      style={{ animation: flashingId === task.id ? 'complete-flash 0.6s ease' : 'none' }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Square Checkbox */}
        <button
          onClick={() => onComplete(task.id, task.completed)}
          className={`w-[16px] h-[16px] rounded border-2 transition-all flex items-center justify-center flex-shrink-0 cursor-pointer ${task.completed
            ? "bg-[#64BDE3] border-[#64BDE3]"
            : "border-[#64BDE3] bg-transparent hover:scale-105"
            }`}
          style={{ animation: bouncingId === task.id ? 'checkbox-bounce 0.4s ease' : 'none' }}
          title={task.completed ? "Mark incomplete" : "Mark complete"}
        >
          {task.completed && <Check size={10} strokeWidth={4} className="text-white" />}
        </button>

        {/* Title and Deadline */}
        <div
          onClick={() => onToggleExpand && onToggleExpand(task.id, task.title, task.deadline)}
          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none"
        >
          <p
            className="text-[14px] font-semibold truncate transition-all duration-200"
            style={{
              color: task.completed ? "#4b5563" : "#111827",
              textDecoration: task.completed ? "line-through" : "none",
            }}
          >
            {task.title}
          </p>
          {task.deadline && (
            <span className="flex items-center gap-1 text-[10px] text-[#4b5563] flex-shrink-0 font-medium font-mono">
              <Clock size={10} />
              {task.deadline}
            </span>
          )}
        </div>
      </div>

      {/* Right Priority Badge & Swipe Trash Button */}
      <div className="flex items-center gap-2 pl-2">
        <span style={{ ...badgeCommonStyle, ...badgeStyle }}>
          {priorityText}
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
                border: isToday ? "1.5px solid #64BDE3" : "none",
                backgroundColor: isToday ? "rgba(100, 189, 227, 0.05)" : "transparent",
                color: isToday ? "#64BDE3" : "#ffffff",
              }}
            >
              <span>{d.getDate()}</span>
              {hasTask && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#64BDE3]" />
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
                <span className="absolute -top-6 bg-[#0c0e13] text-[#64BDE3] text-[10px] px-1.5 py-0.5 rounded border border-[#2a2d3a] opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                  {count}
                </span>
                {/* Bar */}
                <div
                  className="w-3 rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${barHeight}%`,
                    background: isToday ? "#64BDE3" : "rgba(100, 189, 227, 0.4)",
                    boxShadow: isToday ? "0 0 10px rgba(100, 189, 227, 0.3)" : "none",
                  }}
                />
              </div>
              <span
                className="text-[10px] font-bold font-mono"
                style={{ color: isToday ? "#64BDE3" : "#8b8fa8" }}
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

const DASHBOARD_QUOTES = [
  "Small actions, repeated daily, build remarkable results.",
  "Progress is a mosaic—one piece at a time.",
  "Focus on the next step, not the whole staircase.",
  "Consistency beats intensity.",
  "What you do today shapes tomorrow.",
  "Done is the foundation of better.",
  "Every minute invested has a story to tell.",
  "Clarity creates momentum.",
  "One task. Full attention.",
  "Tiny wins become big achievements.",
  "Make space for what matters.",
  "Your future is built in today's moments.",
  "Discipline creates freedom.",
  "Start before you're ready. Improve as you go.",
  "Momentum begins with a single action.",
  "Every focused moment is another tile in your masterpiece.",
  "Great days are assembled, not found.",
  "Your life is a mosaic—build it with intention.",
  "Each habit adds color to your bigger picture.",
  "Piece by piece, purpose takes shape.",
  "Today's effort becomes tomorrow's masterpiece."
];

export default function TasksPage({ user, userContext, isActive, viewMode = "dashboard", onViewAll, focusInputTrigger, onNavigate }) {
  const prioritizeRef = useRef(false);
  const inputRef = useRef(null);
  const [tasks, setTasks] = useState([]);
  const [dashboardQuote, setDashboardQuote] = useState("");
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * DASHBOARD_QUOTES.length);
    setDashboardQuote(DASHBOARD_QUOTES[randomIndex]);
  }, []);
  const [dismissedBanners, setDismissedBanners] = useState(new Set());
  const [newTask, setNewTask] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newCategory, setNewCategory] = useState("auto");
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [prioritizing, setPrioritizing] = useState(false);
  const [xpPopup, setXpPopup] = useState(null);

  // Checkbox and Row animations
  const [bouncingId, setBouncingId] = useState(null);
  const [flashingId, setFlashingId] = useState(null);

  // Subtask management states
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [subtasks, setSubtasks] = useState({});
  const [subtaskInputs, setSubtaskInputs] = useState({});
  const [checkedSubtasks, setCheckedSubtasks] = useState({});

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

      if (userContext?.battlePlan) {
        setBattlePlan(userContext.battlePlan);
        localStorage.setItem("battlePlanDate", todayStr);
        localStorage.setItem("battlePlanText", userContext.battlePlan);
        return;
      }

      setPlanLoading(true);
      try {
        const incomplete = tasks.filter(t => !t.completed);
        const { planText } = await generateAiBattlePlan(incomplete, user, userContext || {});
        setBattlePlan(planText);
        localStorage.setItem("battlePlanDate", todayStr);
        localStorage.setItem("battlePlanText", planText);
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
      const { planText } = await generateAiBattlePlan(incomplete, user, userContext || {});
      setBattlePlan(planText);
      const todayStr = new Date().toDateString();
      localStorage.setItem("battlePlanDate", todayStr);
      localStorage.setItem("battlePlanText", planText);
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
    const finalCategory = "General";

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
    setBouncingId(taskId);
    setTimeout(() => setBouncingId(null), 400);

    if (!currentlyDone) {
      setFlashingId(taskId);
      setTimeout(() => setFlashingId(null), 600);
    }

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

  }

  async function handleDelete(taskId) {
    await deleteTask(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }

  // Expanded panel handlers
  const handleToggleExpand = async (taskId, taskTitle, deadline) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) { next.delete(taskId); }
      else { next.add(taskId); }
      return next;
    });

    if (!subtasks[taskId]) {
      setSubtasks(prev => ({
        ...prev,
        [taskId]: { ai: [], manual: [], loading: true }
      }));
      try {
        const aiSteps = await breakdownTask(taskTitle, deadline);
        setSubtasks(prev => ({
          ...prev,
          [taskId]: { ai: Array.isArray(aiSteps) ? aiSteps : [], manual: [], loading: false }
        }));
      } catch (err) {
        console.error("Error breaking down task:", err);
        setSubtasks(prev => ({
          ...prev,
          [taskId]: { ai: [], manual: [], loading: false }
        }));
      }
    }
  };

  const handleRegenerate = async (taskId, taskTitle, deadline) => {
    setSubtasks(prev => ({
      ...prev,
      [taskId]: {
        ...(prev[taskId] || { manual: [] }),
        loading: true
      }
    }));
    try {
      const aiSteps = await breakdownTask(taskTitle, deadline);
      setSubtasks(prev => ({
        ...prev,
        [taskId]: {
          ai: Array.isArray(aiSteps) ? aiSteps : [],
          manual: (prev[taskId]?.manual) || [],
          loading: false
        }
      }));
    } catch (err) {
      console.error("Error regenerating subtasks:", err);
      setSubtasks(prev => ({
        ...prev,
        [taskId]: {
          ...(prev[taskId] || { manual: [] }),
          loading: false
        }
      }));
    }
  };

  const handleAddManualSubtask = (taskId) => {
    const val = subtaskInputs[taskId] || "";
    if (!val.trim()) return;

    setSubtasks(prev => {
      const current = prev[taskId] || { ai: [], manual: [] };
      return {
        ...prev,
        [taskId]: {
          ...current,
          manual: [...(current.manual || []), { subtask: val.trim(), estimatedMinutes: null, manual: true }]
        }
      };
    });

    setSubtaskInputs(prev => ({
      ...prev,
      [taskId]: ""
    }));
  };

  const toggleSubtaskCheck = (taskId, subtaskText) => {
    const key = `${taskId}-${subtaskText}`;
    setCheckedSubtasks(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleRemoveSubtask = (taskId, subtaskText, isManual) => {
    setSubtasks(prev => {
      const current = prev[taskId] || { ai: [], manual: [] };
      if (isManual) {
        return {
          ...prev,
          [taskId]: {
            ...current,
            manual: (current.manual || []).filter(s => s.subtask !== subtaskText)
          }
        };
      } else {
        return {
          ...prev,
          [taskId]: {
            ...current,
            ai: (current.ai || []).filter(s => s.subtask !== subtaskText)
          }
        };
      }
    });
  };

  const renderExpandedPanel = (task) => {
    const taskSubtasks = subtasks[task.id] || { ai: [], manual: [], loading: false };
    const manualInput = subtaskInputs[task.id] || "";

    return (
      <div
        className="ml-9 mr-2 mb-3 mt-1 p-3.5 rounded-xl border border-white/10 animate-fade-in"
        style={{ background: "rgba(255, 255, 255, 0.02)" }}
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-bold text-[#7a7a9a] uppercase tracking-wider font-mono">
            Subtasks Breakdown
          </span>
          <button
            onClick={() => handleRegenerate(task.id, task.title, task.deadline)}
            disabled={taskSubtasks.loading}
            className="flex items-center gap-1 text-[10px] font-bold text-[#64BDE3] hover:text-[#78C9EB] transition-colors outline-none cursor-pointer disabled:opacity-50"
          >
            <RotateCcw size={12} />
            {taskSubtasks.loading ? "Regenerating..." : "Regenerate"}
          </button>
        </div>

        {taskSubtasks.loading ? (
          <div className="py-4 text-center">
            <span className="inline-block animate-spin text-xs text-[#64BDE3]">⏳</span>
            <span className="text-xs text-[#7a7a9a] ml-2 font-mono">Breaking down task with AI...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {Array.isArray(taskSubtasks.ai) && taskSubtasks.ai.map((item, idx) => {
              if (!item || !item.subtask) return null;
              const key = `${task.id}-${item.subtask}`;
              const isChecked = !!checkedSubtasks[key];
              return (
                <div key={`ai-${idx}`} className="flex items-center justify-between py-1 group animate-slide-up">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => toggleSubtaskCheck(task.id, item.subtask)}
                      className={`w-[14px] h-[14px] rounded border transition-all flex items-center justify-center flex-shrink-0 cursor-pointer ${isChecked ? "bg-[#64BDE3] border-[#64BDE3]" : "border-[#64BDE3] bg-transparent"
                        }`}
                    >
                      {isChecked && <Check size={8} strokeWidth={4} className="text-white" />}
                    </button>
                    <span
                      className={`text-xs text-[#f0eeff] truncate ${isChecked ? "line-through opacity-50" : ""}`}
                    >
                      {item.subtask}
                    </span>
                    {item.estimatedMinutes && (
                      <span className="text-[10px] text-[#7a7a9a] font-mono">
                        ({item.estimatedMinutes}m)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveSubtask(task.id, item.subtask, false)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-red-400 hover:text-red-500 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}

            {taskSubtasks.manual && taskSubtasks.manual.length > 0 && (
              <div className="mt-2.5 mb-1 animate-page-enter">
                <div className="h-px bg-white/10 w-full mb-1.5" />
                <span className="text-[9px] font-bold text-[#7a7a9a] uppercase tracking-widest font-mono">
                  Your steps
                </span>
              </div>
            )}

            {Array.isArray(taskSubtasks.manual) && taskSubtasks.manual.map((item, idx) => {
              if (!item || !item.subtask) return null;
              const key = `${task.id}-${item.subtask}`;
              const isChecked = !!checkedSubtasks[key];
              return (
                <div key={`manual-${idx}`} className="flex items-center justify-between py-1 group animate-slide-up">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => toggleSubtaskCheck(task.id, item.subtask)}
                      className={`w-[14px] h-[14px] rounded border transition-all flex items-center justify-center flex-shrink-0 cursor-pointer ${isChecked ? "bg-[#64BDE3] border-[#64BDE3]" : "border-[#64BDE3] bg-transparent"
                        }`}
                    >
                      {isChecked && <Check size={8} strokeWidth={4} className="text-white" />}
                    </button>
                    <span
                      className={`text-xs text-[#f0eeff] truncate ${isChecked ? "line-through opacity-50" : ""}`}
                    >
                      {item.subtask}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveSubtask(task.id, item.subtask, true)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-red-400 hover:text-red-500 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}

            <div className="flex gap-2 items-center mt-3 pt-2 border-t border-white/5">
              <input
                type="text"
                className="input-glass flex-1 outline-none text-xs"
                style={{ fontSize: "12px", padding: "6px 10px", height: "30px" }}
                placeholder="Add a step..."
                value={manualInput}
                onChange={(e) => setSubtaskInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddManualSubtask(task.id);
                  }
                }}
              />
              <button
                onClick={() => handleAddManualSubtask(task.id)}
                className="flex items-center justify-center font-bold rounded-lg text-xs cursor-pointer"
                style={{
                  backgroundColor: "#64BDE3",
                  color: "#0c0e13",
                  width: "30px",
                  height: "30px",
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  async function handlePrioritize() {
    if (prioritizeRef.current) return;
    prioritizeRef.current = true;
    if (prioritizing || tasks.length === 0) {
      prioritizeRef.current = false;
      return;
    }

    setPrioritizing(true);
    setPlanLoading(true);

    try {
      const pending = tasks.filter(t => !t.completed);

      // 1. Generate the AI Battle Plan using current pending tasks list
      const { planText } = await generateAiBattlePlan(pending, user, userContext || {});
      setBattlePlan(planText);
      const todayStr = new Date().toDateString();
      localStorage.setItem("battlePlanDate", todayStr);
      localStorage.setItem("battlePlanText", planText);

      // 2. Perform the individual task priority updates in Firestore/state
      try {
        const result = await prioritizeTasks(pending, userContext ?? { role: "student" });
        const updates = {};
        result.forEach(r => {
          const task = pending[r.id];
          if (task) updates[task.id] = { priority: r.priority, reason: r.reason };
        });

        await Promise.all(
          Object.entries(updates).map(([taskId, data]) => updateTask(taskId, data))
        );

        const updatedTasks = tasks.map(t => updates[t.id] ? { ...t, ...updates[t.id] } : t);
        setTasks(updatedTasks);
        window.dispatchEvent(new CustomEvent('tasksReprioritized', { detail: updatedTasks }));
      } catch (reprioritizeErr) {
        console.error("Non-blocking error during task prioritization updates:", reprioritizeErr);
      }

    } catch (e) {
      console.error("AI Prioritize error:", e);
    } finally {
      setPrioritizing(false);
      setPlanLoading(false);
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

  const plan = (() => {
    if (!battlePlan) return null;
    try {
      return JSON.parse(battlePlan);
    } catch (e) {
      return null;
    }
  })();

  return (
    <div className="min-h-screen relative text-[#111827] h-screen overflow-hidden">
      <style>{`
        @keyframes checkbox-bounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.4); }
          50% { transform: scale(0.85); }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes complete-flash {
          0% { background: rgba(100,189,227,0.2); }
          100% { background: transparent; }
        }
      `}</style>
      {/* XP Popup overlay */}
      {xpPopup && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full font-mono font-bold text-sm"
          style={{
            background: "rgba(100, 189, 227,0.15)",
            color: "#64BDE3",
            border: "1px solid #64BDE3",
            transform: "translateX(-50%)",
          }}
        >
          {xpPopup}
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
                          <span className="text-base flex-shrink-0">{banner.isToday ? <AlertCircle size={16} /> : <Calendar size={16} />}</span>
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
                    <h1 className="font-display font-bold text-[26px] text-[#000000] leading-tight tracking-tight">
                      Good morning, {user?.displayName || "there"}
                    </h1>
                    <p className="text-xs font-semibold text-[#4b5563] mt-0.5 italic">
                      "{dashboardQuote}"
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
                      <div className="w-full">
                        <label className="block text-[9px] uppercase tracking-wider text-[#6B7280] mb-1 font-mono font-bold">
                          Deadline
                        </label>
                        <input
                          type="date"
                          onClick={(e) => e.target.showPicker && e.target.showPicker()}
                          className="w-full bg-white/30 rounded-lg px-3 py-1.5 text-xs text-[#374151] outline-none cursor-pointer"
                          value={newDeadline}
                          onChange={e => setNewDeadline(e.target.value)}
                        />
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
                      className="bg-[#64BDE3] hover:bg-[#78C9EB] transition-all text-[#0c0e13] flex items-center justify-center rounded-full w-8 h-8 flex-shrink-0"
                      title="Add task"
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                {/* Section Header */}
                <div className="flex items-center justify-between pb-2 mb-1.5 flex-shrink-0">
                  <h2 className="text-xs font-bold text-[#000000] uppercase tracking-wider font-mono">
                    Today's Tasks
                  </h2>
                  <button
                    onClick={onViewAll}
                    className="text-xs font-bold text-[#64BDE3] hover:text-[#78C9EB] transition-colors tracking-wide"
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
                        <div key={t.id} className="flex flex-col">
                          <TaskRow
                            task={t}
                            onComplete={handleComplete}
                            onDelete={handleDelete}
                            onToggleExpand={handleToggleExpand}
                            isExpanded={expandedIds.has(t.id)}
                            bouncingId={bouncingId}
                            flashingId={flashingId}
                          />
                          {expandedIds.has(t.id) && renderExpandedPanel(t)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#6B7280] text-sm py-6 italic text-center border-b border-[#6B7280]/20 border-dashed">
                      No pending tasks for today. Add one above or shoot some hoops!
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
          <div className="max-w-5xl mx-auto flex flex-row gap-6 w-full flex-1 min-h-0 mt-2 animate-page-enter">
            <div
              className="p-5 md:p-6 flex flex-col flex-1 min-h-0"
              style={{
                background: "rgba(255, 255, 255, 0.07)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                borderRadius: "28px",
              }}
            >
              {/* Top Greeting Header Row */}
              <div className="flex items-start justify-between mb-5 flex-shrink-0">
                <div>
                  <h1
                    className="font-display text-[26px] leading-tight tracking-tight"
                    style={{ color: "#000000", fontWeight: 800 }}
                  >
                    All Tasks
                  </h1>
                  <p className="text-xs font-semibold text-[#4b5563] mt-0.5 font-mono uppercase tracking-wide">
                    Pending: {pending.length} &nbsp;•&nbsp; Completed: {done.length}
                  </p>
                </div>
                <button
                  onClick={handlePrioritize}
                  disabled={prioritizing || pending.length === 0}
                  className="flex items-center gap-2 font-bold flex-shrink-0 transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    backgroundColor: "#64BDE3",
                    color: "white",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "13px",
                  }}
                >
                  <Sparkles size={13} className="mr-1" />
                  {prioritizing ? "Prioritizing..." : "AI Prioritize"}
                </button>
              </div>

              {/* Task Add permanently expanded form */}
              <GlassCard className="mb-6" style={{ padding: "16px", background: "rgba(255, 255, 255, 0.03)" }}>
                <div className="flex gap-3 items-center w-full">
                  <input
                    ref={inputRef}
                    type="text"
                    className="input-glass flex-1 outline-none text-xs"
                    style={{ height: "38px", padding: "8px 12px" }}
                    placeholder="What needs to get done?"
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        handleAdd();
                      }
                    }}
                  />
                  <input
                    type="date"
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    className="input-glass outline-none text-xs flex-shrink-0"
                    style={{ width: "160px", height: "38px", padding: "8px 12px" }}
                    value={newDeadline}
                    onChange={e => setNewDeadline(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        handleAdd();
                      }
                    }}
                  />
                  <button
                    onClick={handleAdd}
                    className="bg-[#64BDE3] hover:bg-[#78C9EB] transition-all text-[#0c0e13] font-bold px-4 rounded-lg flex items-center justify-center flex-shrink-0 text-xs"
                    style={{ height: "38px" }}
                    title="Add task"
                  >
                    + Add
                  </button>
                </div>
              </GlassCard>

              {/* Task list container (Only scrollable container) */}
              <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                {loadingTasks ? (
                  <p className="text-center text-sm py-8 text-[#4b5563]">Loading tasks…</p>
                ) : (
                  <>
                    {pending.length > 0 && (
                      <div className="mb-6">
                        <p
                          className="text-xs font-mono uppercase tracking-widest mb-2 font-bold"
                          style={{ color: "#374151" }}
                        >
                          Pending — {pending.length}
                        </p>
                        <div className="flex flex-col gap-1">
                          {pending.map(t => (
                            <div key={t.id} className="flex flex-col">
                              <TaskRow
                                task={t}
                                onComplete={handleComplete}
                                onDelete={handleDelete}
                                onToggleExpand={handleToggleExpand}
                                isExpanded={expandedIds.has(t.id)}
                                bouncingId={bouncingId}
                                flashingId={flashingId}
                              />
                              {expandedIds.has(t.id) && renderExpandedPanel(t)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {done.length > 0 && (
                      <div className="mb-6">
                        <p
                          className="text-xs font-mono uppercase tracking-widest mb-2 font-bold"
                          style={{ color: "#374151" }}
                        >
                          Completed — {done.length}
                        </p>
                        <div className="flex flex-col gap-1 opacity-90">
                          {done.map(t => (
                            <div key={t.id} className="flex flex-col">
                              <TaskRow
                                task={t}
                                onComplete={handleComplete}
                                onDelete={handleDelete}
                                onToggleExpand={handleToggleExpand}
                                isExpanded={expandedIds.has(t.id)}
                                bouncingId={bouncingId}
                                flashingId={flashingId}
                              />
                              {expandedIds.has(t.id) && renderExpandedPanel(t)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {tasks.length === 0 && (
                      <div className="p-8 text-center flex flex-col items-center justify-center">
                        <Sparkles size={32} className="text-[#64BDE3] mb-3 animate-pulse" />
                        <p className="text-sm font-bold mb-1 text-[#000000]">Your board is clear!</p>
                        <p className="text-xs max-w-xs text-[#4b5563]">Add tasks above to structure your workflow.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Daily Battle Plan */}
            <div
              className="p-5 md:p-6 flex flex-col w-[380px] shrink-0 min-h-0"
              style={{
                background: "rgba(255, 255, 255, 0.07)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                borderRadius: "28px",
                height: "100%",
              }}
            >
              <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                <Zap size={16} className="text-[#7eb8f7]" />
                <h2 className="font-display text-lg font-bold text-[#000000] tracking-tight">
                  Daily Battle Plan
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 text-[#111827] min-h-0">
                {planLoading ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center">
                    <span className="inline-block animate-spin text-xs text-[#7eb8f7] mb-2">⏳</span>
                    <span className="text-xs text-[#7a7a9a] font-mono">Generating daily plan...</span>
                  </div>
                ) : plan ? (
                  <div className="flex flex-col gap-4 text-left">
                    {plan.isLocal && (
                      <div className="text-[10px] font-bold font-mono px-2 py-1 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 text-center uppercase tracking-wider flex items-center justify-center gap-1.5 flex-shrink-0 animate-pulse">
                        ⚠️ Offline/Local Plan
                      </div>
                    )}

                    {/* Today's Mission */}
                    {plan.mission && (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-[#7a7a9a]">
                          Today's Mission
                        </span>
                        <p className="text-[13px] font-semibold leading-relaxed text-[#111827]">
                          {plan.mission}
                        </p>
                      </div>
                    )}

                    {/* Priorities */}
                    {plan.priorities && plan.priorities.length > 0 && (
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-[#7a7a9a]">
                          Priorities
                        </span>
                        <div className="flex flex-col gap-2">
                          {plan.priorities.map((item, idx) => (
                            <div key={idx} className="p-3 rounded-2xl border flex flex-col gap-0.5 bg-transparent border-[#111827]/10">
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-[13px] font-semibold leading-tight text-[#111827] truncate">
                                  {item.task}
                                </span>
                                {item.duration && (
                                  <span className="text-[10px] font-bold font-mono text-[#659eb8] shrink-0 pt-0.5">
                                    ⏱️ {item.duration}
                                  </span>
                                )}
                              </div>
                              {item.reason && (
                                <span className="text-[10px] leading-tight text-[#6f7d84] italic">
                                  {item.reason}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Focus Block & Estimated Time */}
                    {(plan.focusBlock || plan.estimatedTime) && (
                      <div className="grid grid-cols-2 gap-2 mt-1 flex-shrink-0">
                        {plan.focusBlock && (
                          <div className="p-3 rounded-2xl border flex flex-col gap-0.5 bg-transparent border-[#111827]/10">
                            <span className="text-[9px] font-bold uppercase tracking-wider font-mono text-[#7a7a9a]">
                              Focus Block
                            </span>
                            <span className="text-[11px] font-semibold leading-tight text-[#111827] truncate">
                              {plan.focusBlock}
                            </span>
                          </div>
                        )}
                        {plan.estimatedTime && (
                          <div className="p-3 rounded-2xl border flex flex-col gap-0.5 bg-transparent border-[#111827]/10">
                            <span className="text-[9px] font-bold uppercase tracking-wider font-mono text-[#7a7a9a]">
                              Total Time
                            </span>
                            <span className="text-[11px] font-semibold leading-tight text-[#111827] truncate">
                              {plan.estimatedTime}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Motivation */}
                    {plan.motivation && (
                      <div className="flex flex-col gap-1 border-t pt-3 mt-1 flex-shrink-0 border-[#111827]/10">
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-[#7a7a9a]">
                          Companion Tip
                        </span>
                        <p className="text-[11px] italic leading-relaxed text-[#111827] font-semibold">
                          "{plan.motivation}"
                        </p>
                      </div>
                    )}
                  </div>
                ) : battlePlan ? (
                  <div className="flex flex-col gap-3 text-left">
                    <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#4c5b63]">
                      {battlePlan}
                    </p>
                  </div>
                ) : (
                  <p className="text-[#7a7a9a] italic py-4">No plan generated yet.</p>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}