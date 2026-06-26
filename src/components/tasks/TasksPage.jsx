// components/tasks/TasksPage.jsx
import { useState } from "react";
import GlassCard from "../ui/GlassCard";
import { Plus, Sparkles, Clock, Trash2, CheckCircle } from "lucide-react";
import { prioritizeTasks, breakdownTask } from "../../lib/gemini";

const MOCK_TASKS = [
  { id: 1, title: "Submit OS assignment", deadline: "Today 11:59pm", category: "academics", completed: false, priority: "high" },
  { id: 2, title: "Buy wedding outfit", deadline: "2 weeks", category: "personal", completed: false, priority: "low" },
  { id: 3, title: "Email professor about project", deadline: "Tomorrow", category: "academics", completed: false, priority: "med" },
];

function PriorityBadge({ priority }) {
  if (priority === "high") return <span className="priority-high">High</span>;
  if (priority === "med") return <span className="priority-med">Medium</span>;
  return <span className="priority-low">Low</span>;
}

function TaskCard({ task, onComplete, onDelete }) {
  return (
    <GlassCard className={`p-4 transition-opacity ${task.completed ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onComplete(task.id)}
          className="mt-0.5 flex-shrink-0 transition-colors"
          style={{ color: task.completed ? "#4ade80" : "#3a3a5a" }}
        >
          <CheckCircle size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium mb-1"
            style={{ color: "#f0eeff", textDecoration: task.completed ? "line-through" : "none" }}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <PriorityBadge priority={task.priority} />
            {task.deadline && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "#7a7a9a" }}>
                <Clock size={11} />
                {task.deadline}
              </span>
            )}
            {task.reason && (
              <span className="text-xs italic" style={{ color: "#5a5a7a" }}>
                {task.reason}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="transition-colors hover:text-red-400 flex-shrink-0"
          style={{ color: "#3a3a5a" }}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </GlassCard>
  );
}

export default function TasksPage({ userContext }) {
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [newTask, setNewTask] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [dailyPlan, setDailyPlan] = useState("");

  function addTask() {
    if (!newTask.trim()) return;
    setTasks([
      ...tasks,
      {
        id: Date.now(),
        title: newTask.trim(),
        deadline: newDeadline,
        category: "general",
        completed: false,
        priority: "med",
      },
    ]);
    setNewTask("");
    setNewDeadline("");
  }

  async function handlePrioritize() {
    setLoading(true);
    try {
      const result = await prioritizeTasks(tasks, userContext ?? { role: "student" });
      setTasks((prev) =>
        prev.map((t, i) => {
          const match = result.find((r) => r.id === i);
          return match ? { ...t, priority: match.priority, reason: match.reason } : t;
        })
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function completeTask(id) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }

  function deleteTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const pending = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-xl" style={{ color: "#f0eeff" }}>
          Tasks
        </h1>
        <button
          onClick={handlePrioritize}
          disabled={loading || pending.length === 0}
          className="btn-primary flex items-center gap-2 text-xs"
        >
          <Sparkles size={13} />
          {loading ? "Thinking…" : "AI Prioritize"}
        </button>
      </div>

      {/* Add task */}
      <GlassCard className="p-4 mb-6">
        <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "#7a7a9a" }}>
          Add task
        </p>
        <div className="flex flex-col gap-2">
          <input
            className="input-glass"
            placeholder="What needs to get done?"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
          />
          <div className="flex gap-2">
            <input
              className="input-glass flex-1"
              placeholder="Deadline (optional)"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
            />
            <button onClick={addTask} className="btn-primary flex items-center gap-1.5">
              <Plus size={15} />
              Add
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Pending tasks */}
      {pending.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "#7a7a9a" }}>
            Pending — {pending.length}
          </p>
          <div className="flex flex-col gap-3">
            {pending.map((t) => (
              <TaskCard key={t.id} task={t} onComplete={completeTask} onDelete={deleteTask} />
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {done.length > 0 && (
        <div>
          <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "#7a7a9a" }}>
            Completed — {done.length}
          </p>
          <div className="flex flex-col gap-3">
            {done.map((t) => (
              <TaskCard key={t.id} task={t} onComplete={completeTask} onDelete={deleteTask} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
