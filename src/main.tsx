import { createRoot } from "react-dom/client";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  console.error("Root element not found");
  document.body.innerHTML = "<div style='color: white; padding: 20px;'>Error: Root element not found</div>";
} else {
  try {
    createRoot(root).render(
      <div style={{ padding: '20px', color: 'white' }}>
        <h1>Kacha P2P Loading...</h1>
        <p>If you see this, React is working. Loading full app...</p>
      </div>
    );
  } catch (error) {
    console.error("React render error:", error);
    root.innerHTML = "<div style='color: white; padding: 20px;'>Error rendering React app: " + error + "</div>";
  }
}
