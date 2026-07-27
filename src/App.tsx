import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { RouteGuard } from '@/components/common/RouteGuard';
import { Header } from '@/components/layout/Header';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { FloatingChatbot } from '@/components/common/FloatingChatbot';
import { PWAInstallPrompt } from '@/components/common/PWAInstallPrompt';
import { useAuth } from '@/contexts/AuthContext';
import { usePresenceHeartbeat } from '@/hooks/usePresenceHeartbeat';
import { routes } from './routes';
import './lib/i18n';

// Pings profiles.last_seen_at for the signed-in user so real merchant
// presence ("online now") reflects actual activity, not fake data.
const PresenceTracker: React.FC = () => {
  const { user } = useAuth();
  usePresenceHeartbeat(user?.id);
  return null;
};

// Default to dark mode on first visit for Luminate aesthetic — but only
// when the user hasn't chosen a theme yet. Previously this ran on every
// page load and unconditionally forced 'dark' + overwrote localStorage,
// so toggling to light mode in ThemeToggle would appear to work but got
// silently reverted back to dark on the next refresh/visit.
if (typeof window !== 'undefined') {
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
    if (!storedTheme) localStorage.setItem('theme', 'dark');
  }
}

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <RouteGuard>
          <PresenceTracker />
          <IntersectObserver />
          <div className="flex flex-col min-h-screen">
            <Header />
            {/* pb-16 on mobile reserves space above the fixed bottom nav */}
            <main className="flex-grow pb-16 md:pb-0">
              <Routes>
                {routes.map((route, index) => (
                  <Route key={index} path={route.path} element={route.element} />
                ))}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
          <MobileBottomNav />
          <FloatingChatbot />
          <PWAInstallPrompt />
          <Toaster />
        </RouteGuard>
      </AuthProvider>
    </Router>
  );
};

export default App;
