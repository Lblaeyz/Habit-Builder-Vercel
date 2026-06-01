import { useState, useEffect, useRef } from "react";
import { supabase, Habit, DEFAULT_HABITS } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import AuthPage from "@/pages/AuthPage";
import TodayTab from "@/pages/TodayTab";
import CalendarTab from "@/pages/CalendarTab";
import HistoryTab from "@/pages/HistoryTab";
import Spinner from "@/components/Spinner";

type Tab = "today" | "calendar" | "history";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [tab, setTab] = useState<Tab>("today");

  // Guards against concurrent seeding
  const seedingRef = useRef(false);
  const fetchingRef = useRef(false);

  useEffect(() => {
    // Use onAuthStateChange exclusively — it fires INITIAL_SESSION on load
    // so we don't need getSession() as a separate trigger
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setAuthLoading(false);

      if (event === "SIGNED_OUT") {
        setHabits([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) fetchHabits();
  }, [user?.id]); // depend on user.id, not the whole user object, to avoid extra triggers

  async function deduplicateHabits(userId: string): Promise<void> {
    const { data } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (!data || data.length === 0) return;

    // Group by label, keep the first (earliest) of each label
    const seen = new Map<string, string>(); // label -> id to keep
    const toDelete: string[] = [];

    for (const habit of data) {
      const key = habit.label.trim().toLowerCase();
      if (seen.has(key)) {
        toDelete.push(habit.id);
      } else {
        seen.set(key, habit.id);
      }
    }

    if (toDelete.length > 0) {
      await supabase.from("habits").delete().in("id", toDelete);
    }
  }

  async function fetchHabits() {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Clean up any duplicates first
      await deduplicateHabits(currentUser.id);

      const { data } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("position", { ascending: true });

      const fetched = data || [];

      if (fetched.length === 0 && !seedingRef.current) {
        seedingRef.current = true;
        await supabase.from("habits").insert(
          DEFAULT_HABITS.map(h => ({ ...h, user_id: currentUser.id }))
        );
        seedingRef.current = false;

        const { data: seeded } = await supabase
          .from("habits")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("position", { ascending: true });
        setHabits(seeded || []);
      } else {
        setHabits(fetched);
      }
    } finally {
      fetchingRef.current = false;
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      fontFamily: "'DM Mono', monospace",
      color: "#e8e8e0",
    }}>
      <div style={{
        maxWidth: "480px",
        margin: "0 auto",
        padding: "32px 20px 100px",
        minHeight: "100vh",
        position: "relative",
      }}>
        {tab === "today" && <TodayTab habits={habits} onHabitsUpdate={fetchHabits} />}
        {tab === "calendar" && <CalendarTab habits={habits} />}
        {tab === "history" && <HistoryTab habits={habits} />}

        {/* Bottom tab bar */}
        <div style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "480px",
          background: "#0a0a0a",
          borderTop: "1px solid #111",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          padding: "16px 0 20px",
          zIndex: 50,
        }}>
          {(["today", "calendar", "history"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: "none",
                border: "none",
                color: tab === t ? "#e8e8e0" : "#333",
                fontFamily: "'DM Mono', monospace",
                fontSize: "12px",
                letterSpacing: "2px",
                cursor: "pointer",
                padding: "8px 16px",
                transition: "color 0.2s",
                textTransform: "uppercase",
              }}
            >
              {t}
            </button>
          ))}
          <button
            onClick={signOut}
            style={{
              background: "none",
              border: "none",
              color: "#333",
              fontFamily: "'DM Mono', monospace",
              fontSize: "11px",
              letterSpacing: "1px",
              cursor: "pointer",
              padding: "8px 12px",
            }}
          >
            out
          </button>
        </div>
      </div>
    </div>
  );
}
