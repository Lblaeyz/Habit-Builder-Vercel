const STORAGE_KEY = "tnm_reminder_time";
const ENABLED_KEY = "tnm_reminder_enabled";

export function playAlarmChime() {
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.6);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.65);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch {
    // AudioContext not available
  }
}

/** Send alarm config to the service worker so it can fire even when tab is minimized */
function syncAlarmToSW(enabled: boolean, time: string) {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "ALARM_CONFIG",
      enabled,
      time,
    });
  }
}

export function scheduleReminders() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  // Push current config to service worker immediately
  const enabled = localStorage.getItem(ENABLED_KEY) === "true";
  const time = localStorage.getItem(STORAGE_KEY) || "20:00";
  syncAlarmToSW(enabled, time);

  let lastFiredMinute = -1;

  function checkAndNotify() {
    const isEnabled = localStorage.getItem(ENABLED_KEY) === "true";
    if (!isEnabled) return;

    const alarmTime = localStorage.getItem(STORAGE_KEY) || "20:00";
    const [h, m] = alarmTime.split(":").map(Number);
    const now = new Date();
    const currentMinute = now.getHours() * 60 + now.getMinutes();
    const targetMinute = h * 60 + m;

    if (currentMinute === targetMinute && lastFiredMinute !== currentMinute) {
      lastFiredMinute = currentMinute;
      playAlarmChime();
      // Show notification via service worker (works even if tab is in background)
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "TEST_ALARM" });
      } else {
        new Notification("This New Month", {
          body: "Time to check off your habits for today 🌿",
          icon: "/favicon.png",
          tag: "daily-reminder",
        });
      }
    }
  }

  const interval = setInterval(checkAndNotify, 5000);

  // Re-sync SW config whenever localStorage changes (e.g. user toggles in another tab)
  window.addEventListener("storage", () => {
    const updatedEnabled = localStorage.getItem(ENABLED_KEY) === "true";
    const updatedTime = localStorage.getItem(STORAGE_KEY) || "20:00";
    syncAlarmToSW(updatedEnabled, updatedTime);
  });

  return () => clearInterval(interval);
}

/** Called by NotificationSettings whenever the user changes their alarm config */
export function updateAlarmConfig() {
  const enabled = localStorage.getItem(ENABLED_KEY) === "true";
  const time = localStorage.getItem(STORAGE_KEY) || "20:00";
  syncAlarmToSW(enabled, time);
}
