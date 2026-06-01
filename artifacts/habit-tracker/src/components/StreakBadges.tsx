import { useMemo } from "react";
import { DailyLog, Habit } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

type Props = {
  allLogs: DailyLog[];
  habits: Habit[];
  todayDone: number;
};

type Badge = {
  id: string;
  emoji: string;
  label: string;
  description: string;
  earned: boolean;
};

export function computeStreaks(allLogs: DailyLog[], habitCount: number) {
  if (habitCount === 0) return { currentStreak: 0, perfectStreak: 0 };

  // Build day map: date -> { done, total }
  const dayMap: Record<string, { done: number; total: number }> = {};
  allLogs.forEach(log => {
    if (!dayMap[log.date]) dayMap[log.date] = { done: 0, total: habitCount };
    if (log.done) dayMap[log.date].done++;
  });

  const today = formatDate(new Date());
  const yesterday = formatDate(new Date(Date.now() - 86400000));

  // Current streak: consecutive days with ≥1 habit done, going back from today/yesterday
  let currentStreak = 0;
  const hasToday = dayMap[today]?.done > 0;
  const startFrom = hasToday ? today : yesterday;

  const checkDate = new Date(startFrom + "T12:00:00");
  while (true) {
    const ds = formatDate(checkDate);
    if (ds > today) { checkDate.setDate(checkDate.getDate() - 1); continue; }
    if (dayMap[ds]?.done > 0) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Perfect streak: consecutive days with ALL habits done
  let perfectStreak = 0;
  const checkDate2 = new Date(startFrom + "T12:00:00");
  while (true) {
    const ds = formatDate(checkDate2);
    if (ds > today) { checkDate2.setDate(checkDate2.getDate() - 1); continue; }
    const d = dayMap[ds];
    if (d && d.done >= habitCount) {
      perfectStreak++;
      checkDate2.setDate(checkDate2.getDate() - 1);
    } else {
      break;
    }
  }

  return { currentStreak, perfectStreak };
}

export default function StreakBadges({ allLogs, habits, todayDone }: Props) {
  const habitCount = habits.length;

  const { currentStreak, perfectStreak } = useMemo(
    () => computeStreaks(allLogs, habitCount),
    [allLogs, habitCount]
  );

  const totalDone = allLogs.filter(l => l.done).length;

  // Build day map for badge calculations
  const dayMap = useMemo(() => {
    const map: Record<string, { done: number }> = {};
    allLogs.forEach(log => {
      if (!map[log.date]) map[log.date] = { done: 0 };
      if (log.done) map[log.date].done++;
    });
    return map;
  }, [allLogs]);

  const uniqueDays = Object.keys(dayMap).filter(d => dayMap[d].done > 0).length;
  const perfectDays = habitCount > 0
    ? Object.values(dayMap).filter(d => d.done >= habitCount).length
    : 0;

  // Max ever streak (all-time)
  let maxStreak = 0, cur = 0;
  const sortedDays = Object.keys(dayMap).sort();
  let prevDate: string | null = null;
  for (const d of sortedDays) {
    if (dayMap[d].done > 0) {
      if (prevDate) {
        const diff = (new Date(d).getTime() - new Date(prevDate).getTime()) / 86400000;
        cur = diff === 1 ? cur + 1 : 1;
      } else {
        cur = 1;
      }
      if (cur > maxStreak) maxStreak = cur;
      prevDate = d;
    }
  }

  const badges: Badge[] = [
    {
      id: "first",
      emoji: "🌱",
      label: "First Step",
      description: "Complete your first habit",
      earned: totalDone >= 1,
    },
    {
      id: "fire3",
      emoji: "🔥",
      label: "On Fire",
      description: "3-day streak",
      earned: maxStreak >= 3,
    },
    {
      id: "warrior",
      emoji: "⚔️",
      label: "7-Day Warrior",
      description: "7-day streak",
      earned: maxStreak >= 7,
    },
    {
      id: "perfectweek",
      emoji: "💎",
      label: "Perfect Week",
      description: "7 perfect days ever",
      earned: perfectDays >= 7,
    },
    {
      id: "month",
      emoji: "🏆",
      label: "Month Champion",
      description: "30-day streak",
      earned: maxStreak >= 30,
    },
    {
      id: "century",
      emoji: "🌟",
      label: "Centurion",
      description: "100 habits completed",
      earned: totalDone >= 100,
    },
    {
      id: "perfect10",
      emoji: "✨",
      label: "Locked In",
      description: "10 consecutive perfect days",
      earned: perfectStreak >= 10 || (() => {
        // Check max perfect streak all-time
        let maxPS = 0, curPS = 0;
        let ppd: string | null = null;
        for (const d of sortedDays) {
          if (habitCount > 0 && dayMap[d].done >= habitCount) {
            if (ppd) {
              const diff = (new Date(d).getTime() - new Date(ppd).getTime()) / 86400000;
              curPS = diff === 1 ? curPS + 1 : 1;
            } else curPS = 1;
            if (curPS > maxPS) maxPS = curPS;
            ppd = d;
          } else {
            curPS = 0; ppd = null;
          }
        }
        return maxPS >= 10;
      })(),
    },
  ];

  const earnedBadges = badges.filter(b => b.earned);
  const nextBadge = badges.find(b => !b.earned);

  if (uniqueDays === 0 && todayDone === 0) return null;

  return (
    <div style={{ marginBottom: "28px" }}>
      {/* Streaks */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <div style={{
          flex: 1, padding: "14px", background: "#111",
          border: "1px solid #1a1a1a", textAlign: "center",
        }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "28px", color: currentStreak > 0 ? "#f87171" : "#333", lineHeight: 1 }}>
            {currentStreak}
          </div>
          <div style={{ color: "#555", fontSize: "10px", letterSpacing: "1px", marginTop: "4px" }}>
            {currentStreak > 0 ? "🔥 STREAK" : "STREAK"}
          </div>
        </div>
        <div style={{
          flex: 1, padding: "14px", background: "#111",
          border: "1px solid #1a1a1a", textAlign: "center",
        }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "28px", color: perfectStreak > 0 ? "#4ade80" : "#333", lineHeight: 1 }}>
            {perfectStreak}
          </div>
          <div style={{ color: "#555", fontSize: "10px", letterSpacing: "1px", marginTop: "4px" }}>
            {perfectStreak > 0 ? "✦ PERFECT" : "PERFECT"}
          </div>
        </div>
        <div style={{
          flex: 1, padding: "14px", background: "#111",
          border: "1px solid #1a1a1a", textAlign: "center",
        }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "28px", color: "#e8e8e0", lineHeight: 1 }}>
            {totalDone}
          </div>
          <div style={{ color: "#555", fontSize: "10px", letterSpacing: "1px", marginTop: "4px" }}>TOTAL</div>
        </div>
      </div>

      {/* Earned badges */}
      {earnedBadges.length > 0 && (
        <div>
          <p style={{ color: "#555", fontSize: "10px", letterSpacing: "1px", marginBottom: "10px" }}>BADGES</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {earnedBadges.map(badge => (
              <div
                key={badge.id}
                title={badge.description}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "6px 10px",
                  background: "#111",
                  border: "1px solid #1a1a1a",
                  fontSize: "12px",
                  color: "#e8e8e0",
                }}
              >
                <span>{badge.emoji}</span>
                <span style={{ fontSize: "11px", letterSpacing: "0.5px" }}>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next badge hint */}
      {nextBadge && (
        <p style={{ color: "#333", fontSize: "11px", marginTop: "10px" }}>
          Next: {nextBadge.emoji} {nextBadge.label} — {nextBadge.description}
        </p>
      )}
    </div>
  );
}
