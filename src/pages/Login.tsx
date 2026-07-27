import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, TrendingUp, Zap } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
});

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function Login() {
  const { user, signInWithEmail } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setLoading(true);
    setError(null);
    const { error: err } = await signInWithEmail(values.email, values.password);
    if (err) {
      // Supabase returns this generic message both for a wrong password AND
      // for an account that hasn't completed OTP verification yet.
      setError(
        err.message === 'Invalid login credentials'
          ? "Incorrect email/password, or your account hasn't been verified yet. Check your email for the verification code, or register again to get a new one."
          : err.message
      );
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (err) {
      setError('Google sign-in failed. Please try again.');
      toast.error('Google sign-in failed');
      setGoogleLoading(false);
    }
    // On success, Supabase redirects the browser to Google automatically.
  };

  const features = [
    { icon: ShieldCheck, text: 'Escrow-protected transactions' },
    { icon: TrendingUp, text: 'KYC-verified trading partners' },
    { icon: Zap, text: 'Fast ETB settlements < 15 min' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      {/* Left: animated dark panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden auth-hero-panel">
        {/* Animated orbs */}
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-10">
            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="font-heading font-bold text-accent-foreground text-sm">K</span>
            </div>
            <span className="font-heading font-bold text-xl text-white">KACHA</span>
          </div>
          <div className="h-0.5 w-12 bg-accent mb-6" />
          <h2 className="text-3xl font-heading font-bold leading-tight text-white">
            Secure P2P USDT<br />trading for Ethiopia.
          </h2>
          <p className="mt-4 text-sm text-white/60 font-sans leading-relaxed max-w-xs">
            Every trade is protected by escrow. Every trader is KYC-verified.
            Your funds are safe with Kacha.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm font-sans text-white/70">
              <div className="h-7 w-7 rounded-md glass-chip flex items-center justify-center shrink-0">
                <Icon className="h-3.5 w-3.5 text-accent" />
              </div>
              {text}
            </div>
          ))}
        </div>

        <p className="relative z-10 text-xs text-white/30 font-sans">&copy; 2026 Kacha Platform</p>
      </div>

      {/* Right: glassmorphism form */}
      <div className="flex items-center justify-center p-6 md:p-8 bg-background">
        <div className="w-full max-w-sm space-y-7">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="font-heading font-bold text-accent-foreground text-sm">K</span>
            </div>
            <span className="font-heading font-bold text-xl">KACHA</span>
          </div>

          <div>
            <h1 className="text-2xl font-heading font-bold">Welcome back</h1>
            <p className="text-sm text-muted-foreground font-sans mt-1">Sign in to your Kacha account</p>
          </div>

          {/* Google button — prominent primary */}
          <Button
            type="button"
            variant="outline"
            className="w-full font-sans h-11 border-border hover:border-accent/50 hover:bg-muted/50 gap-3 transition-all"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            <span>Continue with Google</span>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground font-sans uppercase tracking-wider">
                or sign in with email
              </span>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="font-sans text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-sans">Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} className="font-sans h-11" />
                  </FormControl>
                  <FormMessage className="font-sans text-xs" />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-sans">Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} className="font-sans h-11" />
                  </FormControl>
                  <FormMessage className="font-sans text-xs" />
                </FormItem>
              )} />
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</>
                  : 'Sign in'
                }
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground font-sans">
            No account?{' '}
            <Link to="/register" className="text-foreground font-medium hover:text-accent transition-colors">
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
