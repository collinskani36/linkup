import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { captureInvite } from "./lib/invite";
import "./styles.css";

// If the page was opened from a shared vibe link, remember it before sign-in changes anything.
captureInvite();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);