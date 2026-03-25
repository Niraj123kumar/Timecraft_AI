// Fix ResizeObserver error (mobile safe)
window.addEventListener("error", (e) => {
  if (resizeObserverErr.test(e.message)) {
    e.stopImmediatePropagation();
  }
});

window.addEventListener("unhandledrejection", (e) => {
  if (resizeObserverErr.test(e.reason?.message || "")) {
    e.preventDefault();
  }
});

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
