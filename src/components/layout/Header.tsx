import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { UserCircle, LogOut, Menu, ShieldCheck } from 'lucide-react';

export function Header() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = user
    ? [
        { name: 'Marketplace', path: '/marketplace' },
        { name: 'Dashboard', path: '/dashboard' },
        ...(profile?.role === 'admin' ? [{ name: 'Admin', path: '/admin' }] : []),
      ]
    : [];

  // Use exact match for root so "/" doesn't shadow all other routes
  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        scrolled
          ? 'bg-background/90 backdrop-blur-md border-b border-border shadow-sm'
          : 'bg-background border-b border-border'
      }`}
    >
      {/* Editorial masthead top rule */}
      <div className="h-0.5 w-full bg-foreground" />

      <div className="container mx-auto px-4 flex h-14 items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 no-select shrink-0">
          <span className="font-heading text-xl font-bold tracking-tight text-foreground">
            KACHA
          </span>
          <span className="hidden sm:inline text-xs text-muted-foreground font-sans uppercase tracking-widest border-l border-border pl-2">
            P2P Exchange
          </span>
        </Link>

        {/* Desktop nav */}
        {user && (
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-sans transition-colors relative pb-0.5 ${
                  isActive(link.path)
                    ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:w-full after:h-px after:bg-accent'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />

          {!user ? (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Get started</Link>
              </Button>
            </>
          ) : (
            <>
              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-border">
                    <UserCircle className="h-5 w-5" />
                    <span className="sr-only">User menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="font-medium text-sm leading-none">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/kyc">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      KYC Verification
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">Settings</Link>
                  </DropdownMenuItem>
                  {profile?.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/admin">Admin Dashboard</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile hamburger */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 pt-10">
                  <nav className="flex flex-col gap-4">
                    {navLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setMobileOpen(false)}
                        className={`text-base py-2 border-b border-border transition-colors ${
                          isActive(link.path) ? 'text-accent font-medium' : 'text-foreground'
                        }`}
                      >
                        {link.name}
                      </Link>
                    ))}
                    <button
                      onClick={() => { setMobileOpen(false); handleSignOut(); }}
                      className="text-base py-2 text-destructive text-left border-b border-border"
                    >
                      Sign out
                    </button>
                  </nav>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>
      </div>

      {/* Bottom rule */}
      <div className="h-px w-full bg-border" />
    </header>
  );
}
