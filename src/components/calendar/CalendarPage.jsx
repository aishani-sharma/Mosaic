// components/calendar/CalendarPage.jsx
import { useState } from "react";
import GlassCard from "../ui/GlassCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MOCK_TASKS = [
  { title: "Submit OS assignment", date: new Date().toDateString(), priority: "high" },
  { title: "Email professor", date: new Date(Date.now() + 86400000).toDateString(), priority: "med" },
  { title: "Buy wedding outfit", date: new Date(Date.now() + 14 * 86400000).toDateString(), priority: "low" },
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDay(year, month) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function CalendarPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(today.toDateString());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function taskDatesInMonth() {
    const map = {};
    MOCK_TASKS.forEach(t => {
      const d = new Date(t.date);
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(t);
      }
    });
    return map;
  }
  const taskMap = taskDatesInMonth();

  const selectedTasks = MOCK_TASKS.filter(t => t.date === selected);

  const priorityColor = { high: "#f76a6a", med: "#a8f0c6", low: "#3dd68c" };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="font-display font-bold text-xl mb-6" style={{ color: "#f0eeff" }}>Calendar</h1>

      <GlassCard className="p-5 mb-5">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="nav-icon"><ChevronLeft size={18} /></button>
          <span className="font-display font-semibold" style={{ color: "#f0eeff" }}>
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} className="nav-icon"><ChevronRight size={18} /></button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-mono py-1" style={{ color: "#7a7a9a" }}>{d}</div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = new Date(viewYear, viewMonth, day).toDateString();
            const isToday = dateStr === today.toDateString();
            const isSel = dateStr === selected;
            const dots = taskMap[day] ?? [];
            return (
              <button
                key={day}
                onClick={() => setSelected(dateStr)}
                className="flex flex-col items-center py-1.5 rounded-lg transition-all"
                style={{
                  background: isSel ? "rgba(61,214,140,0.2)" : isToday ? "rgba(255,255,255,0.05)" : "transparent",
                  border: isSel ? "1px solid rgba(61,214,140,0.4)" : "1px solid transparent",
                }}
              >
                <span className="text-sm font-mono" style={{ color: isToday ? "#3dd68c" : "#f0eeff", fontWeight: isToday ? 600 : 400 }}>
                  {day}
                </span>
                <div className="flex gap-0.5 mt-0.5">
                  {dots.slice(0, 3).map((t, j) => (
                    <div key={j} className="w-1 h-1 rounded-full" style={{ background: priorityColor[t.priority] }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Selected day tasks */}
      <div>
        <p className="text-xs font-mono uppercase tracking-widest mb-3" style={{ color: "#7a7a9a" }}>
          {selected === today.toDateString() ? "Today" : selected}
        </p>
        {selectedTasks.length === 0 ? (
          <GlassCard className="p-4 text-center">
            <p className="text-sm" style={{ color: "#7a7a9a" }}>No tasks on this day</p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-3">
            {selectedTasks.map((t, i) => (
              <GlassCard key={i} className="p-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: priorityColor[t.priority] }} />
                <span className="text-sm" style={{ color: "#f0eeff" }}>{t.title}</span>
                <span className="ml-auto text-xs capitalize" style={{ color: priorityColor[t.priority] }}>{t.priority}</span>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
