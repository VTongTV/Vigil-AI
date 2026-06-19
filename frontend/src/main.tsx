import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/lib/store";
import "leaflet/dist/leaflet.css";
import App from "./App";
import "./index.css";

// Apply the persisted/system theme before first paint to avoid flash.
applyStoredTheme();
function applyStoredTheme() {
  const { theme } = useAppStore.getState();
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.setAttribute("data-theme", theme);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <TooltipProvider delay={200}>
        <App />
      </TooltipProvider>
    </BrowserRouter>
  </StrictMode>,
);
