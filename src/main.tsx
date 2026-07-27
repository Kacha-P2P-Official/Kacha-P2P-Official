import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  console.error("Root element not found");
  document.body.innerHTML = "<div style='color: white; padding: 20px;'>Error: Root element not found</div>";
} else {
  // Apply overflow constraints to root element
  root.style.overflowX = 'hidden';
  root.style.maxWidth = '100vw';
  
  try {
    createRoot(root).render(<App />);
  } catch (error) {
    console.error("React render error:", error);
    root.innerHTML = "<div style='color: white; padding: 20px;'>Error rendering React app: " + error + "</div>";
  }
}
