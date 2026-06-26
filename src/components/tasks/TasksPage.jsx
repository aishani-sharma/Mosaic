// components/tasks/TasksPage.jsx
import { useState, useEffect } from "react";
import GlassCard from "../ui/GlassCard";
import { Plus, Sparkles, Clock, Trash2, CheckCircle } from "lucide-react";
import { prioritizeTasks, breakdownTask } from "../../lib/gemini";
import { getUserTasks, addTask, updateTask, deleteTask, awardXP } from "../../lib/firestore";

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
          onClick={() => onComplete(task.id, task.completed)}
          className="mt-0.5 flex-shrink-0 transition-colors"
          style={{ color: task.completed ? "#3dd68c" : "#3a3a5a" }}
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

export default function TasksPage({ user, userContext }) {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [prioritizing, setPrioritizing] = useState(false);
  const [xpPopup, setXpPopup] = useState(null);

  // Load tasks from Firestore on mount
  useEffect(() => {
    if (!user?.uid) return;
    getUserTasks(user.uid)
      .then(setTasks)
      .finally(() => setLoadingTasks(false));
  }, [user?.uid]);

  async function handleAdd() {
    if (!newTask.trim() || !user?.uid) return;
    const ref = await addTask(user.uid, {
      title: newTask.trim(),
      deadline: newDeadline,
      category: "general",
    });
    setTasks(prev => [{
      id: ref.id,
      title: newTask.trim(),
      deadline: newDeadline,
      category: "general",
      completed: false,
      priority: "med",
    }, ...prev]);
    setNewTask("");
    setNewDeadline("");
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
    if (prioritizing || tasks.length === 0) return;
    setPrioritizing(true);
    try {
      const pending = tasks.filter(t => !t.completed);
      const result = await prioritizeTasks(pending, userContext ?? { role: "student" });

      // result[i].id is the index into the pending array
      const updates = {};
      result.forEach(r => {
        const task = pending[r.id];
        if (task) updates[task.id] = { priority: r.priority, reason: r.reason };
      });

      // Update Firestore + local state together
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
    }
  }

  const pending = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 relative">
      {/* XP popup */}
      {xpPopup && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full font-mono font-semibold text-sm animate-slide-up"
          style={{ background: "rgba(61,214,140,0.2)", color: "#3dd68c", border: "1px solid rgba(61,214,140,0.4)" }}
        >
          {xpPopup} 🎉
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-xl" style={{ color: "#f0eeff" }}>Tasks</h1>
        <button
          onClick={handlePrioritize}
          disabled={prioritizing || pending.length === 0}
          className="btn-primary flex items-center gap-2 text-xs"
        >
          <Sparkles size={13} />
          {prioritizing ? "Thinking…" : "AI Prioritize"}
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
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
          <div className="flex gap-2">
            <input
              className="input-glass flex-1"
              placeholder="Deadline (optional)"
              value={newDeadline}
              onChange={e => setNewDeadline(e.target.value)}
            />
            <button onClick={handleAdd} className="btn-primary flex items-center gap-1.5">
              <Plus size={15} /> Add
            </button>
          </div>
        </div>
      </GlassCard>

      {loadingTasks ? (
        <p className="text-center text-sm" style={{ color: "#7a7a9a" }}>Loading tasks…</p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "#7a7a9a" }}>
                Pending — {pending.length}
              </p>
              <div className="flex flex-col gap-3">
                {pending.map(t => <TaskCard key={t.id} task={t} onComplete={handleComplete} onDelete={handleDelete} />)}
              </div>
            </div>
          )}
          {done.length > 0 && (
            <div>
              <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "#7a7a9a" }}>
                Completed — {done.length}
              </p>
              <div className="flex flex-col gap-3">
                {done.map(t => <TaskCard key={t.id} task={t} onComplete={handleComplete} onDelete={handleDelete} />)}
              </div>
            </div>
          )}
          {tasks.length === 0 && (
            <GlassCard className="p-8 text-center">
              <p className="text-sm mb-1" style={{ color: "#f0eeff" }}>No tasks yet</p>
              <p className="text-xs" style={{ color: "#7a7a9a" }}>Add something above to get started</p>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}