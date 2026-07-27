import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Store, User, MoreHorizontal, ShieldCheck } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Market', path: '/marketplace', icon: Store },
  { label: 'Profile', path: '/profile', icon: User },
  { label: 'More', path: '/settings', icon: MoreHorizontal },
];

export function MobileBottomNav() {
  const { user, profile } = useAuth();
  const location = useLocation();

  // Only show for authenticated users on mobile
  if (!user) return null;

  const isActive = (path: string) =>
    path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(path);

  // Insert admin tab before "More" if admin
  const items =
    profile?.role === 'admin'
      ? [
          ...NAV_ITEMS.slice(0, 3),
          { label: 'Admin', path: '/admin', icon: ShieldCheck },
          NAV_ITEMS[3],
        ]
      : NAV_ITEMS;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border pb-safe"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      <div className={`grid h-16 ${items.length === 5 ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {items.map(({ label, path, icon: Icon }) => {
          const active = isActive(path);
          return (
            <Link
              key={path}
              to={path}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors no-select ${
                active
                  ? 'text-accent'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {/* Gold active dot anchored to top of this cell */}
              {active && (
                <span className="absolute top-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-accent" />
              )}
              <Icon
                className={`h-5 w-5 transition-transform ${active ? 'scale-110' : ''}`}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span
                className={`text-[10px] font-sans leading-none ${
                  active ? 'font-semibold' : 'font-normal'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
