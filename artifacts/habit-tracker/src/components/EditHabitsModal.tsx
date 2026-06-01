import { useState, useEffect } from "react";
import { supabase, Habit, CATEGORY_COLORS, DEFAULT_HABITS } from "@/lib/supabase";
import NotificationSettings from "@/components/NotificationSettings";

type Props = {
  habits: Habit[];
  onClose: () => void;
  onUpdate: () => void;
};

const CATEGORIES = ["health", "trading", "discipline", "lifestyle", "mind"];

export default function EditHabitsModal({ habits, onClose, onUpdate }: Props) {
  const [localHabits, setLocalHabits] = useState<Habit[]>(habits);
  const [newLabel, setNewLabel] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [newCategory, setNewCategory] = useState("health");
  const [loading, setLoading] = useState(false);

  // Keep local list in sync when parent updates
  useEffect(() => {
    setLocalHabits(habits);
  }, [habits]);

  async function addHabit() {
    if (!newLabel.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    await supabase.from("habits").insert({
      user_id: user.id,
      label: newLabel.trim(),
      emoji: newEmoji.trim() || "⭐",
      category: newCategory,
      position: localHabits.length,
    });
    setNewLabel("");
    setNewEmoji("");
    onUpdate();
    setLoading(false);
  }

  async function deleteHabit(id: string) {
    // Optimistically remove from local list immediately — instant feedback
    setLocalHabits(prev => prev.filter(h => h.id !== id));

    // Must delete daily_logs first due to FK constraint (habit_id references habits.id)
    await supabase.from("daily_logs").delete().eq("habit_id", id);
    const { error } = await supabase.from("habits").delete().eq("id", id);

    if (error) {
      // Revert on failure
      setLocalHabits(habits);
    } else {
      onUpdate();
    }
  }

  async function seedDefaults() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    const { data: existing } = await supabase
      .from("habits").select("id").eq("user_id", user.id).limit(1);
    if (!existing || existing.length === 0) {
      await supabase.from("habits").insert(
        DEFAULT_HABITS.map(h => ({ ...h, user_id: user.id }))
      );
    }
    onUpdate();
    setLoading(false);
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "480px",
          background: "#0d0d0d",
          border: "1px solid #1a1a1a",
          borderBottom: "none",
          padding: "24px",
          maxHeight: "85vh",
          overflowY: "auto",
          fontFamily: "'DM Mono', monospace",
          animation: "slideUp 0.2s ease-out",
        }}
      >
        <style>{`@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ color: "#e8e8e0", fontSize: "13px", letterSpacing: "2px", fontWeight: "normal", margin: 0 }}>
            EDIT HABITS
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#555", fontSize: "18px", cursor: "pointer", padding: "4px 8px" }}
          >×</button>
        </div>

        {localHabits.length === 0 && (
          <div style={{ marginBottom: "20px" }}>
            <p style={{ color: "#555", fontSize: "12px", marginBottom: "12px" }}>No habits yet.</p>
            <button
              type="button"
              onClick={seedDefaults}
              disabled={loading}
              style={{
                padding: "10px 16px", background: "transparent",
                border: "1px solid #1a1a1a", color: "#e8e8e0",
                fontFamily: "'DM Mono', monospace", fontSize: "12px",
                cursor: "pointer", letterSpacing: "1px",
              }}
            >
              + Load default habits
            </button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
          {localHabits.map(habit => (
            <div
              key={habit.id}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "10px 12px", background: "#111", border: "1px solid #1a1a1a",
              }}
            >
              <span style={{ fontSize: "16px" }}>{habit.emoji}</span>
              <span style={{ flex: 1, color: "#e8e8e0", fontSize: "13px" }}>{habit.label}</span>
              <span style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: CATEGORY_COLORS[habit.category] || "#555", flexShrink: 0,
              }} />
              <button
                type="button"
                onClick={() => deleteHabit(habit.id)}
                style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "18px", padding: "0 6px", lineHeight: 1 }}
              >×</button>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid #111", paddingTop: "20px" }}>
          <p style={{ color: "#555", fontSize: "11px", letterSpacing: "1px", marginBottom: "12px" }}>ADD HABIT</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              placeholder="Habit name"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addHabit()}
              style={{
                padding: "11px 14px", background: "#0a0a0a",
                border: "1px solid #1a1a1a", color: "#e8e8e0",
                fontFamily: "'DM Mono', monospace", fontSize: "13px", outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                placeholder="Emoji"
                value={newEmoji}
                onChange={e => setNewEmoji(e.target.value)}
                style={{
                  width: "80px", padding: "11px 14px", background: "#0a0a0a",
                  border: "1px solid #1a1a1a", color: "#e8e8e0",
                  fontFamily: "'DM Mono', monospace", fontSize: "13px", outline: "none",
                }}
              />
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                style={{
                  flex: 1, padding: "11px 14px", background: "#0a0a0a",
                  border: "1px solid #1a1a1a", color: "#e8e8e0",
                  fontFamily: "'DM Mono', monospace", fontSize: "13px", outline: "none",
                }}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={addHabit}
              disabled={loading || !newLabel.trim()}
              style={{
                padding: "12px", background: "#e8e8e0", border: "none", color: "#0a0a0a",
                fontFamily: "'DM Mono', monospace", fontSize: "13px",
                cursor: loading || !newLabel.trim() ? "not-allowed" : "pointer",
                letterSpacing: "1px", opacity: loading || !newLabel.trim() ? 0.5 : 1,
              }}
            >
              + Add habit
            </button>
          </div>
        </div>

        <NotificationSettings />
      </div>
    </div>
  );
}
