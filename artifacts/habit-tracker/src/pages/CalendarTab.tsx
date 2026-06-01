import { useState, useEffect } from "react";
import { supabase, Habit, DailyLog } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import Spinner from "@/components/Spinner";

type DayData = { date: string; done: number; total: number };

type Props = { habits: Habit[] };

type DayDetail = {
  date: string;
  logs: DailyLog[];
};

export default function CalendarTab({ habits }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [dayData, setDayData] = useState<Record<string, DayData>>({});
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<DayDetail | null>(null);

  useEffect(() => {
    fetchMonth();
  }, [year, month, habits]);

  async function fetchMonth() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", formatDate(startDate))
      .lte("date", formatDate(endDate));

    const logs = data || [];
    const byDay: Record<string, DayData> = {};
    logs.forEach(log => {
      if (!byDay[log.date]) byDay[log.date] = { date: log.date, done: 0, total: habits.length };
      if (log.done) byDay[log.date].done++;
    });
    setDayData(byDay);
    setLoading(false);
  }

  async function openDay(dateStr: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", dateStr);
    setDetail({ date: dateStr, logs: data || [] });
  }

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth()) return;
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const monthLabel = new Date(year, month, 1).toLocaleString("default", { month: "long", year: "numeric" });

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Mon=0 offset
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const todayStr = formatDate(today);
  const days = ["M", "T", "W", "T", "F", "S", "S"];

  function getDayColor(dateStr: string, data: DayData | undefined): string {
    if (!data || habits.length === 0) return "#111";
    const pct = data.done / habits.length;
    if (pct === 0) return "#111";
    if (pct >= 1) return "#4ade80";
    const intensity = Math.round(40 + pct * 80);
    return `rgba(255,255,255,${pct * 0.35})`;
  }

  return (
    <div style={{ fontFamily: "'DM Mono', monospace" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <button onClick={prevMonth} style={{ background: "none", border: "none", color: "#555", fontSize: "18px", cursor: "pointer", padding: "4px 8px" }}>←</button>
        <span style={{ color: "#e8e8e0", fontSize: "13px", letterSpacing: "2px" }}>
          {monthLabel.toUpperCase()}
        </span>
        <button
          onClick={nextMonth}
          disabled={year === today.getFullYear() && month === today.getMonth()}
          style={{ background: "none", border: "none", color: "#555", fontSize: "18px", cursor: "pointer", padding: "4px 8px", opacity: year === today.getFullYear() && month === today.getMonth() ? 0.3 : 1 }}
        >→</button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "4px" }}>
        {days.map((d, i) => (
          <div key={i} style={{ textAlign: "center", color: "#444", fontSize: "11px", padding: "4px 0" }}>{d}</div>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
          {Array.from({ length: startDow }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const data = dayData[dateStr];
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            const perfect = data && habits.length > 0 && data.done === habits.length;
            const bgColor = getDayColor(dateStr, data);

            return (
              <div
                key={d}
                onClick={() => !isFuture && openDay(dateStr)}
                style={{
                  aspectRatio: "1",
                  background: bgColor,
                  border: isToday ? "1px solid #fff" : "1px solid #111",
                  borderRadius: "2px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: isFuture ? "default" : "pointer",
                  opacity: isFuture ? 0.3 : 1,
                  position: "relative",
                  flexDirection: "column",
                  gap: "1px",
                  fontSize: "10px",
                  color: data && data.done > 0 ? "#e8e8e0" : "#333",
                  transition: "opacity 0.2s",
                }}
              >
                <span>{d}</span>
                {perfect && <span style={{ fontSize: "8px", color: "#4ade80" }}>✦</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Day Detail Panel */}
      {detail && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          background: "rgba(0,0,0,0.7)",
        }} onClick={() => setDetail(null)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: "480px",
              background: "#0d0d0d",
              border: "1px solid #1a1a1a",
              borderBottom: "none",
              padding: "24px",
              maxHeight: "70vh", overflowY: "auto",
              fontFamily: "'DM Mono', monospace",
              animation: "slideUp 0.2s ease-out",
            }}
          >
            <style>{`@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <p style={{ color: "#e8e8e0", fontSize: "13px", letterSpacing: "1px", margin: 0 }}>
                {new Date(detail.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
              <button onClick={() => setDetail(null)} style={{ background: "none", border: "none", color: "#555", fontSize: "18px", cursor: "pointer" }}>×</button>
            </div>

            {(() => {
              const doneCount = detail.logs.filter(l => l.done).length;
              const pct = habits.length > 0 ? Math.round((doneCount / habits.length) * 100) : 0;
              return (
                <p style={{ color: "#555", fontSize: "12px", marginBottom: "20px" }}>
                  {doneCount}/{habits.length} completed · {pct}%
                </p>
              );
            })()}

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {habits.map(habit => {
                const log = detail.logs.find(l => l.habit_id === habit.id);
                const done = log?.done ?? false;
                return (
                  <div key={habit.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 0", borderBottom: "1px solid #111" }}>
                    <span style={{ fontSize: "16px" }}>{habit.emoji}</span>
                    <span style={{ flex: 1, color: done ? "#e8e8e0" : "#444", fontSize: "13px" }}>{habit.label}</span>
                    <span style={{ color: done ? "#4ade80" : "#f87171", fontSize: "14px" }}>{done ? "✓" : "✗"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
