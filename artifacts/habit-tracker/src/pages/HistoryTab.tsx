import { useState, useEffect, useRef } from "react";
import { supabase, Habit, DailyLog } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import Spinner from "@/components/Spinner";

type Props = { habits: Habit[] };

type DayStats = { done: number; total: number };

export default function HistoryTab({ habits }: Props) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearLogs, setYearLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ date: string; done: number; total: number; x: number; y: number } | null>(null);
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchYear();
    fetchAllLogs();
  }, [selectedYear, habits]);

  async function fetchYear() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", `${selectedYear}-01-01`)
      .lte("date", `${selectedYear}-12-31`);
    setYearLogs(data || []);
    setLoading(false);
  }

  async function fetchAllLogs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("daily_logs").select("*").eq("user_id", user.id);
    setAllLogs(data || []);
  }

  // Build day map for heatmap
  const dayMap: Record<string, DayStats> = {};
  yearLogs.forEach(log => {
    if (!dayMap[log.date]) dayMap[log.date] = { done: 0, total: habits.length };
    if (log.done) dayMap[log.date].done++;
  });

  // Generate 52-week grid
  const jan1 = new Date(selectedYear, 0, 1);
  const startDow = jan1.getDay(); // 0=Sun
  const weeks: string[][] = [];
  const today = formatDate(new Date());

  // Start from the Sunday before Jan 1
  const gridStart = new Date(jan1);
  gridStart.setDate(gridStart.getDate() - startDow);

  for (let w = 0; w < 53; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + w * 7 + d);
      const dateStr = formatDate(date);
      if (date.getFullYear() === selectedYear || (w === 0 && dateStr < `${selectedYear}-01-01`)) {
        week.push(date.getFullYear() === selectedYear ? dateStr : "");
      } else {
        week.push("");
      }
    }
    weeks.push(week);
  }

  function getCellColor(dateStr: string): string {
    if (!dateStr) return "transparent";
    const d = dayMap[dateStr];
    if (!d || d.done === 0) return "#111";
    if (d.done === habits.length && habits.length > 0) return "#4ade80";
    const pct = d.done / (habits.length || 1);
    return `rgba(255,255,255,${pct * 0.4})`;
  }

  // Monthly breakdown
  const monthlyAvg: number[] = Array(12).fill(0);
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(selectedYear, m + 1, 0).getDate();
    let total = 0; let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${selectedYear}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const day = dayMap[dateStr];
      if (day && day.done > 0 && habits.length > 0) {
        total += day.done / habits.length;
        count++;
      }
    }
    monthlyAvg[m] = count > 0 ? total / count : 0;
  }

  const MONTH_COLORS = ["#4ade80", "#60a5fa", "#f87171", "#fbbf24", "#c084fc", "#4ade80", "#60a5fa", "#f87171", "#fbbf24", "#c084fc", "#4ade80", "#60a5fa"];
  const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

  // All-time stats
  const allDayMap: Record<string, DayStats> = {};
  allLogs.forEach(log => {
    if (!allDayMap[log.date]) allDayMap[log.date] = { done: 0, total: habits.length };
    if (log.done) allDayMap[log.date].done++;
  });

  const allDays = Object.entries(allDayMap).sort(([a], [b]) => a.localeCompare(b));
  const perfectDays = allDays.filter(([, d]) => d.done >= habits.length && habits.length > 0);

  let longestStreak = 0, currentStreak = 0, bestStreak = 0, currentBestStreak = 0;
  let prevDate: string | null = null;
  allDays.forEach(([date, d]) => {
    if (d.done > 0) {
      if (prevDate) {
        const prev = new Date(prevDate);
        const curr = new Date(date);
        const diff = (curr.getTime() - prev.getTime()) / 86400000;
        currentStreak = diff === 1 ? currentStreak + 1 : 1;
      } else {
        currentStreak = 1;
      }
      if (currentStreak > longestStreak) longestStreak = currentStreak;
      prevDate = date;
    }

    if (d.done >= habits.length && habits.length > 0) {
      currentBestStreak++;
      if (currentBestStreak > bestStreak) bestStreak = currentBestStreak;
    } else {
      currentBestStreak = 0;
    }
  });

  // Most completed habit
  const habitCounts: Record<string, number> = {};
  allLogs.forEach(log => {
    if (log.done) habitCounts[log.habit_id] = (habitCounts[log.habit_id] || 0) + 1;
  });
  const topHabitId = Object.entries(habitCounts).sort(([, a], [, b]) => b - a)[0]?.[0];
  const topHabit = habits.find(h => h.id === topHabitId);
  const totalDone = allLogs.filter(l => l.done).length;
  const firstDay = allDays[0]?.[0] ? new Date(allDays[0][0] + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div ref={containerRef} style={{ fontFamily: "'DM Mono', monospace", paddingBottom: "40px" }}>
      {/* Year selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <button onClick={() => setSelectedYear(y => y - 1)} style={{ background: "none", border: "none", color: "#555", fontSize: "18px", cursor: "pointer", padding: "4px 8px" }}>←</button>
        <span style={{ color: "#e8e8e0", fontSize: "13px", letterSpacing: "2px" }}>{selectedYear}</span>
        <button
          onClick={() => setSelectedYear(y => y + 1)}
          disabled={selectedYear >= new Date().getFullYear()}
          style={{ background: "none", border: "none", color: "#555", fontSize: "18px", cursor: "pointer", padding: "4px 8px", opacity: selectedYear >= new Date().getFullYear() ? 0.3 : 1 }}
        >→</button>
      </div>

      {loading ? <Spinner /> : (
        <>
          {/* Heatmap */}
          <div style={{ overflowX: "auto", marginBottom: "32px" }}>
            <div style={{ display: "flex", gap: "3px", minWidth: "fit-content" }}>
              {weeks.map((week, wi) => (
                <div key={wi} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                  {week.map((dateStr, di) => (
                    <div
                      key={di}
                      title={dateStr ? `${dateStr}: ${dayMap[dateStr]?.done ?? 0}/${habits.length}` : ""}
                      onMouseEnter={e => {
                        if (!dateStr) return;
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        const containerRect = containerRef.current?.getBoundingClientRect();
                        setTooltip({
                          date: dateStr,
                          done: dayMap[dateStr]?.done ?? 0,
                          total: habits.length,
                          x: rect.left - (containerRect?.left ?? 0),
                          y: rect.top - (containerRect?.top ?? 0) - 36,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      style={{
                        width: "11px", height: "11px",
                        background: getCellColor(dateStr),
                        borderRadius: "2px",
                        cursor: dateStr ? "pointer" : "default",
                        border: dateStr === today ? "1px solid #fff" : "none",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            {tooltip && (
              <div style={{
                position: "absolute",
                left: tooltip.x, top: tooltip.y,
                background: "#1a1a1a",
                border: "1px solid #222",
                padding: "6px 10px",
                fontSize: "11px", color: "#e8e8e0",
                pointerEvents: "none",
                zIndex: 50,
                whiteSpace: "nowrap",
              }}>
                {tooltip.date} · {tooltip.done}/{tooltip.total}
              </div>
            )}
          </div>

          {/* Monthly bars */}
          <p style={{ color: "#555", fontSize: "11px", letterSpacing: "1px", marginBottom: "16px" }}>MONTHLY AVERAGE</p>
          <div style={{ display: "flex", gap: "6px", alignItems: "flex-end", height: "64px", marginBottom: "40px" }}>
            {monthlyAvg.map((avg, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", height: "100%" }}>
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                  <div style={{
                    width: "100%",
                    height: `${Math.max(avg * 100, avg > 0 ? 8 : 0)}%`,
                    background: MONTH_COLORS[i],
                    opacity: 0.7,
                    minHeight: avg > 0 ? "4px" : "0",
                    borderRadius: "2px 2px 0 0",
                    transition: "height 0.3s",
                  }} />
                </div>
                <span style={{ color: "#444", fontSize: "9px" }}>{MONTHS[i]}</span>
              </div>
            ))}
          </div>

          {/* All-time stats */}
          <p style={{ color: "#555", fontSize: "11px", letterSpacing: "1px", marginBottom: "16px" }}>ALL TIME</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { label: "Perfect days", value: String(perfectDays.length) },
              { label: "Longest streak", value: `${longestStreak} days` },
              { label: "Best perfect streak", value: `${bestStreak} days` },
              { label: "Top habit", value: topHabit ? `${topHabit.emoji} ${topHabit.label}` : "—" },
              { label: "Total completed", value: String(totalDone) },
              { label: "First tracked", value: firstDay },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #111", paddingBottom: "12px" }}>
                <span style={{ color: "#555", fontSize: "12px" }}>{label}</span>
                <span style={{ color: "#e8e8e0", fontSize: "12px", maxWidth: "200px", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
