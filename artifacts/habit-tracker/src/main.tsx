import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register service worker for offline support + background notifications
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration failed — app still works normally
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
