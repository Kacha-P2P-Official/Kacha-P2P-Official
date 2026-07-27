import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import "./index.css";

// Only initialize Sentry if DSN is provided
if (import.meta.env['VITE_SENTRY_DSN']) {
  Sentry.init({
    dsn: import.meta.env['VITE_SENTRY_DSN'] as string,
    environment: import.meta.env.MODE,
  });
}

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<div style={{padding: '20px', color: 'white'}}>Error loading app. Please refresh.</div>}>
    <AppWrapper>
      <App />
    </AppWrapper>
  </Sentry.ErrorBoundary>
);
