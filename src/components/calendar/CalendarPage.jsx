// components/calendar/CalendarPage.jsx
import { useState, useEffect, useMemo } from "react";
import GlassCard from "../ui/GlassCard";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { getUserTasks } from "../../lib/firestore";
import { requestCalendarAccess, fetchCalendarEvents, createCalendarEvent } from "../../lib/googleCalendar";

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

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDay(year, month) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function CalendarPage({ user, isActive }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(today.toDateString());
  const [dbTasks, setDbTasks] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const tasks = useMemo(() => {
    const mappedTasks = dbTasks.map(t => ({
      ...t,
      date: parseTaskDate(t).toDateString(),
      type: "task",
    }));

    const deduplicatedCalendarEvents = calendarEvents.filter(event => 
      !dbTasks.some(task => 
        (task.title || "").toLowerCase().trim() === (event.title || "").toLowerCase().trim()
      )
    );

    const mappedCalendar = deduplicatedCalendarEvents.map(e => ({
      ...e,
      date: new Date(e.date).toDateString(),
      type: "calendar",
    }));

    return [...mappedTasks, ...mappedCalendar];
  }, [dbTasks, calendarEvents]);

  useEffect(() => {
    if (!isActive) return;
    if (!user?.uid) {
      setDbTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getUserTasks(user.uid)
      .then(fetchedTasks => {
        setDbTasks(fetchedTasks);
      })
      .catch(err => {
        console.error("Error loading calendar tasks:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.uid, isActive]);

  async function handleConnectCalendar() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === "your_client_id") {
      alert("Please configure VITE_GOOGLE_CLIENT_ID in your .env file with a valid Client ID.");
      return;
    }
    try {
      const token = await requestCalendarAccess(clientId);
      setAccessToken(token);
      const events = await fetchCalendarEvents(token);
      setCalendarEvents(events);
    } catch (err) {
      console.error("Google Calendar connection failed:", err);
      alert("Failed to connect to Google Calendar: " + (err.message || err));
    }
  }

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
    tasks.forEach(t => {
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

  const selectedTasks = tasks.filter(t => t.date === selected);

  const priorityColor = { high: "#f76a6a", med: "#bdd9fb", low: "#64BDE3" };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-sm font-mono" style={{ color: "#7a7a9a" }}>Loading calendar tasks...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl" style={{ color: "var(--text-strong)" }}>Calendar</h1>
        {!accessToken ? (
          <button
            onClick={handleConnectCalendar}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
          >
            Connect Google Calendar
          </button>
        ) : (
          <span className="text-xs font-mono py-1 px-2.5 rounded-full" style={{ background: "rgba(126, 184, 211,0.12)", color: "var(--accent-strong)", border: "1px solid rgba(126, 184, 211,0.2)" }}>
            Google Calendar Connected
          </span>
        )}
      </div>

      <GlassCard className="p-5 mb-5">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="nav-icon"><ChevronLeft size={18} /></button>
          <span className="font-display font-semibold" style={{ color: "var(--text-strong)" }}>
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
                  background: isSel ? "rgba(100, 189, 227,0.2)" : isToday ? "rgba(255,255,255,0.05)" : "transparent",
                  border: isSel ? "1px solid rgba(100, 189, 227,0.4)" : "1px solid transparent",
                }}
              >
                <span className="text-sm font-mono" style={{ color: isToday ? "#64BDE3" : "#f0eeff", fontWeight: isToday ? 600 : 400 }}>
                  {day}
                </span>
                <div className="flex gap-0.5 mt-0.5">
                  {dots.slice(0, 3).map((t, j) => {
                    if (t.type === "calendar") {
                      return <span key={j} className="text-[8px] flex items-center" title={t.title}><Calendar size={10} className="text-[#64BDE3]" /></span>;
                    }
                    return (
                      <div key={j} className="w-1.5 h-1.5 rounded-full" style={{ background: priorityColor[t.priority] || "#64BDE3" }} title={t.title} />
                    );
                  })}
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
              <GlassCard key={i} className="p-3 flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {t.type === "calendar" ? (
                    <Calendar size={14} className="text-[#64BDE3] flex-shrink-0" />
                  ) : (
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: priorityColor[t.priority] || "#64BDE3" }} />
                  )}
                  <span className="text-sm truncate" style={{ color: "#f0eeff" }}>{t.title}</span>
                </div>
                
                <div className="flex items-center gap-3 flex-shrink-0">
                  {t.type !== "calendar" ? (
                    <>
                      <span className="text-xs capitalize font-medium" style={{ color: priorityColor[t.priority] || "#64BDE3" }}>
                        {t.priority}
                      </span>
                      {accessToken && (
                        <button
                          onClick={async () => {
                            try {
                              const dateObj = parseTaskDate(t);
                              await createCalendarEvent(accessToken, t.title, dateObj.toISOString());
                              alert("Event added to Google Calendar!");
                              const events = await fetchCalendarEvents(accessToken);
                              setCalendarEvents(events);
                            } catch (err) {
                              console.error("Failed to add event:", err);
                              alert("Failed to add event to Google Calendar: " + (err.message || err));
                            }
                          }}
                          className="btn-primary text-[10px] py-1 px-2.5 font-semibold flex items-center gap-1"
                          style={{ background: "#64BDE3" }}
                        >
                          + Add to Calendar
                        </button>
                      )}
                    </>
                  ) : null}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
