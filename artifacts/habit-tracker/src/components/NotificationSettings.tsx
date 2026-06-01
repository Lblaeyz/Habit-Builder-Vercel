import { useState } from "react";
import { playAlarmChime } from "@/lib/notifications";

const STORAGE_KEY = "tnm_reminder_time";
const ENABLED_KEY = "tnm_reminder_enabled";

export default function NotificationSettings() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(ENABLED_KEY) === "true");
  const [time, setTime] = useState(() => localStorage.getItem(STORAGE_KEY) || "20:00");
  const [permission, setPermission] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "denied"
  );
  const [saved, setSaved] = useState(false);

  async function handleToggle() {
    if (!("Notification" in window)) return;
    if (!enabled) {
      if (permission !== "granted") {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") return;
      }
      setEnabled(true);
      localStorage.setItem(ENABLED_KEY, "true");
      playAlarmChime();
    } else {
      setEnabled(false);
      localStorage.setItem(ENABLED_KEY, "false");
    }
  }

  function saveTime() {
    localStorage.setItem(STORAGE_KEY, time);
    setSaved(true);
    playAlarmChime();
    setTimeout(() => setSaved(false), 1500);
  }

  if (!("Notification" in window)) return null;

  return (
    <div style={{ borderTop: "1px solid #111", paddingTop: "20px", marginTop: "4px" }}>
      <p style={{ color: "#555", fontSize: "11px", letterSpacing: "1px", marginBottom: "14px" }}>
        DAILY REMINDER
      </p>

      {permission === "denied" ? (
        <p style={{ color: "#444", fontSize: "12px" }}>
          Notifications blocked by browser. Enable them in your browser settings to use reminders.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ color: enabled ? "#e8e8e0" : "#555", fontSize: "13px" }}>
                {enabled ? "🔔 Alarm on" : "🔕 Alarm off"}
              </span>
              {enabled && (
                <p style={{ color: "#444", fontSize: "11px", marginTop: "2px" }}>
                  Chime + notification at {time}
                </p>
              )}
            </div>
            <button
              onClick={handleToggle}
              style={{
                padding: "8px 16px",
                background: enabled ? "#1a1a1a" : "transparent",
                border: `1px solid ${enabled ? "#333" : "#1a1a1a"}`,
                color: enabled ? "#e8e8e0" : "#555",
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                letterSpacing: "1px",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {enabled ? "Turn off" : "Turn on"}
            </button>
          </div>

          {enabled && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{
                  flex: 1, padding: "10px 14px",
                  background: "#0a0a0a",
                  border: "1px solid #1a1a1a",
                  color: "#e8e8e0",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "13px",
                  outline: "none",
                  colorScheme: "dark",
                }}
              />
              <button
                onClick={saveTime}
                style={{
                  padding: "10px 16px",
                  background: saved ? "#4ade80" : "#e8e8e0",
                  border: "none",
                  color: "#0a0a0a",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "background 0.3s",
                  letterSpacing: "1px",
                  whiteSpace: "nowrap",
                }}
              >
                {saved ? "✓ Set" : "Set time"}
              </button>
            </div>
          )}

          {enabled && (
            <p style={{ color: "#333", fontSize: "11px" }}>
              Keep the app open in a tab for the alarm to fire.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
