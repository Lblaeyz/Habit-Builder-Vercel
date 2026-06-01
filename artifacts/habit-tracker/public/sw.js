const CACHE_NAME = "tnm-v1";
const STATIC_ASSETS = ["/", "/index.html"];

// Install: cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first, fall back to cache for navigation
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
  }
});

// Message from main thread: show notification or schedule alarm
let alarmInterval = null;
let lastFiredMinute = -1;

self.addEventListener("message", (event) => {
  const { type, time, enabled } = event.data || {};

  if (type === "ALARM_CONFIG") {
    // Clear existing interval
    if (alarmInterval) clearInterval(alarmInterval);

    if (!enabled || !time) return;

    const [targetH, targetM] = time.split(":").map(Number);

    alarmInterval = setInterval(() => {
      const now = new Date();
      const currentMinute = now.getHours() * 60 + now.getMinutes();
      const targetMinute = targetH * 60 + targetM;

      if (currentMinute === targetMinute && lastFiredMinute !== currentMinute) {
        lastFiredMinute = currentMinute;
        self.registration.showNotification("This New Month", {
          body: "Time to check off your habits for today \uD83C\uDF3F",
          icon: "/favicon.png",
          badge: "/favicon.png",
          tag: "daily-reminder",
          renotify: false,
          requireInteraction: false,
        });
      }
    }, 5000);
  }

  if (type === "TEST_ALARM") {
    self.registration.showNotification("This New Month", {
      body: "Alarm is set \u2014 you\u2019ll be reminded at your chosen time \uD83C\uDF3F",
      icon: "/favicon.png",
      tag: "test-alarm",
    });
  }
});

// Notification click: focus the app tab
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const appClient = clients.find((c) => c.url.includes(self.location.origin));
      if (appClient) return appClient.focus();
      return self.clients.openWindow("/");
    })
  );
});
