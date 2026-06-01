import { useState, useEffect } from "react";
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) fetchHabits();
  }, [user]);

  async function fetchHabits() {
    const { data } = await supabase
      .from("habits")
      .select("*")
      .order("position", { ascending: true });
    const fetched = data || [];

    // Seed defaults if empty
    if (fetched.length === 0 && user) {
      await supabase.from("habits").insert(
        DEFAULT_HABITS.map(h => ({ ...h, user_id: user.id }))
      );
      const { data: seeded } = await supabase
        .from("habits")
        .select("*")
        .order("position", { ascending: true });
      setHabits(seeded || []);
    } else {
      setHabits(fetched);
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
        {/* Main content */}
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
