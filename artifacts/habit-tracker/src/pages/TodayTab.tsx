import { useState, useEffect } from "react";
import { supabase, Habit, DailyLog, CATEGORY_COLORS } from "@/lib/supabase";
import { getTodayString, getGreeting } from "@/lib/utils";
import EditHabitsModal from "@/components/EditHabitsModal";
import Spinner from "@/components/Spinner";
import StreakBadges from "@/components/StreakBadges";

type Props = { habits: Habit[]; onHabitsUpdate: () => void };

export default function TodayTab({ habits, onHabitsUpdate }: Props) {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const today = getTodayString();

  const now = new Date();
  const monthName = now.toLocaleString("default", { month: "long" }).toUpperCase();
  const day = now.getDate();

  useEffect(() => {
    fetchLogs();
  }, [habits]);

  async function fetchLogs() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [todayResult, allResult] = await Promise.all([
      supabase.from("daily_logs").select("*").eq("user_id", user.id).eq("date", today),
      supabase.from("daily_logs").select("*").eq("user_id", user.id),
    ]);

    setLogs(todayResult.data || []);
    setAllLogs(allResult.data || []);
    setLoading(false);
  }

  async function toggleHabit(habitId: string) {
    const existing = logs.find(l => l.habit_id === habitId);
    const newDone = !existing?.done;

    setToggling(prev => new Set(prev).add(habitId));

    // Optimistic update for today
    if (existing) {
      setLogs(prev => prev.map(l => l.habit_id === habitId ? { ...l, done: newDone } : l));
    } else {
      setLogs(prev => [...prev, {
        id: "temp-" + habitId, user_id: "", date: today,
        habit_id: habitId, done: true, created_at: "",
      }]);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: upserted } = await supabase.from("daily_logs").upsert({
      user_id: user.id,
      date: today,
      habit_id: habitId,
      done: newDone,
    }, { onConflict: "user_id,date,habit_id" }).select();

    // Update allLogs too so streaks stay live
    if (upserted && upserted[0]) {
      setAllLogs(prev => {
        const idx = prev.findIndex(l => l.habit_id === habitId && l.date === today);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = upserted[0];
          return next;
        }
        return [...prev, upserted[0]];
      });
    }

    setToggling(prev => { const n = new Set(prev); n.delete(habitId); return n; });
  }

  const doneCount = logs.filter(l => l.done).length;
  const total = habits.length;
  const percent = total > 0 ? (doneCount / total) * 100 : 0;
  const perfect = total > 0 && doneCount === total;

  return (
    <div style={{ fontFamily: "'DM Mono', monospace", paddingBottom: "40px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <p style={{ color: "#555", fontSize: "12px", marginBottom: "4px" }}>{getGreeting()}</p>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "38px", letterSpacing: "3px", color: "#e8e8e0", margin: 0, lineHeight: 1 }}>
            THIS NEW MONTH
          </h1>
          <p style={{ color: "#555", fontSize: "12px", marginTop: "6px" }}>
            {monthName} · {day}
          </p>
        </div>
        <button
          onClick={() => setShowEdit(true)}
          style={{ background: "none", border: "none", color: "#555", fontSize: "18px", cursor: "pointer", padding: "4px", marginTop: "4px" }}
          title="Settings"
        >⚙</button>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ color: "#555", fontSize: "11px", letterSpacing: "1px" }}>
            {doneCount}/{total} DONE
          </span>
          <span style={{ color: "#555", fontSize: "11px" }}>{Math.round(percent)}%</span>
        </div>
        <div style={{ height: "3px", background: "#111", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${percent}%`,
            background: perfect
              ? "linear-gradient(90deg, #4ade80, #22d3ee)"
              : "linear-gradient(90deg, #f0f0e8, #888)",
            transition: "width 0.4s ease, background 0.4s ease",
            borderRadius: "2px",
          }} />
        </div>
        {perfect && (
          <p style={{ color: "#4ade80", fontSize: "12px", marginTop: "10px", letterSpacing: "1px", textAlign: "center" }}>
            ✦ Perfect day — locked in
          </p>
        )}
      </div>

      {/* Streaks + Badges */}
      {!loading && (
        <StreakBadges allLogs={allLogs} habits={habits} todayDone={doneCount} />
      )}

      {/* Habit list */}
      {loading ? <Spinner /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {habits.map(habit => {
            const log = logs.find(l => l.habit_id === habit.id);
            const done = log?.done ?? false;
            const color = CATEGORY_COLORS[habit.category] || "#555";

            return (
              <div
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  padding: "14px 4px", borderBottom: "1px solid #111",
                  cursor: "pointer", transition: "opacity 0.2s",
                  opacity: toggling.has(habit.id) ? 0.6 : 1,
                }}
              >
                <div style={{
                  width: "22px", height: "22px", borderRadius: "50%",
                  border: `2px solid ${done ? color : "#222"}`,
                  background: done ? color : "transparent",
                  flexShrink: 0, transition: "all 0.2s",
                  animation: done ? "bounceIn 0.3s ease" : "none",
                }} />
                <style>{`@keyframes bounceIn { 0%,100% { transform: scale(1); } 50% { transform: scale(1.3); } }`}</style>
                <span style={{ fontSize: "18px" }}>{habit.emoji}</span>
                <span style={{
                  flex: 1, color: done ? "#444" : "#e8e8e0", fontSize: "13px",
                  textDecoration: done ? "line-through" : "none", transition: "all 0.2s",
                }}>
                  {habit.label}
                </span>
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color, flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      )}

      {habits.length === 0 && !loading && (
        <div style={{ textAlign: "center", paddingTop: "40px" }}>
          <p style={{ color: "#444", fontSize: "13px" }}>No habits yet.</p>
          <p style={{ color: "#333", fontSize: "12px", marginTop: "8px" }}>Tap ⚙ to add your habits.</p>
        </div>
      )}

      {/* Category legend */}
      {habits.length > 0 && !loading && (
        <div style={{ marginTop: "40px", display: "flex", flexWrap: "wrap", gap: "12px 20px" }}>
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            habits.some(h => h.category === cat) && (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color }} />
                <span style={{ color: "#444", fontSize: "11px", letterSpacing: "1px" }}>{cat}</span>
              </div>
            )
          ))}
        </div>
      )}

      {showEdit && (
        <EditHabitsModal
          habits={habits}
          onClose={() => setShowEdit(false)}
          onUpdate={() => { onHabitsUpdate(); fetchLogs(); }}
        />
      )}
    </div>
  );
}
