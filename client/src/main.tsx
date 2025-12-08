import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker only in production to avoid caching during dev
if (
  import.meta.env.PROD &&
  typeof window !== "undefined" &&
  "serviceWorker" in navigator
) {
  window.addEventListener("load", () => {
    const swUrl = "/sw.js";
    navigator.serviceWorker
      .register(swUrl, { scope: "/" })
      .then((reg) => {
        console.log("Service worker registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
  });
}
