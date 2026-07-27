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
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, ShieldCheck, Zap, Users, Mail } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  fullName: z.string().min(2, 'At least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function Register() {
  const { user, signUpWithEmail, verifyEmailOtp, resendEmailOtp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // OTP verification step
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setLoading(true);
    setError(null);
    const { error: err } = await signUpWithEmail(values.email, values.password, values.fullName);
    if (err) setError(err.message);
    else {
      setPendingEmail(values.email);
      setSuccess(true);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!pendingEmail || otp.length < 6) return;
    setOtpLoading(true);
    setOtpError(null);
    const { error: err } = await verifyEmailOtp(pendingEmail, otp);
    if (err) {
      setOtpError('Invalid or expired code. Please try again or resend a new one.');
    }
    // Always reset the loading flag; on success onAuthStateChange fires and
    // the `if (user) return <Navigate to="/dashboard" />` above navigates away.
    setOtpLoading(false);
  };

  const handleResendOtp = async () => {
    if (!pendingEmail) return;
    setResending(true);
    setOtpError(null);
    const { error: err } = await resendEmailOtp(pendingEmail);
    if (err) toast.error(err.message);
    else toast.success('A new code has been sent to your Gmail.');
    setResending(false);
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

  if (success && pendingEmail) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="max-w-sm w-full text-center space-y-5 sm:space-y-6">
          <div className="h-16 w-16 sm:h-20 sm:w-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
            <Mail className="h-8 w-8 sm:h-10 sm:w-10 text-accent" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-heading font-bold">Enter your OTP</h2>
            <p className="text-sm text-muted-foreground font-sans leading-relaxed">
              We've sent a 6-digit code to <span className="font-medium text-foreground">{pendingEmail}</span>.
              Check your Gmail inbox (and spam folder) and enter it below.
            </p>
          </div>

          {otpError && (
            <Alert variant="destructive">
              <AlertDescription className="font-sans text-sm">{otpError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            className="w-full h-11"
            disabled={otp.length < 6 || otpLoading}
            onClick={handleVerifyOtp}
          >
            {otpLoading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…</>
              : 'Verify & Continue'
            }
          </Button>

          <p className="text-sm text-muted-foreground font-sans">
            Didn't get a code?{' '}
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resending}
              className="text-foreground font-medium hover:text-accent transition-colors disabled:opacity-50"
            >
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  const features = [
    { icon: ShieldCheck, text: 'Escrow-protected transactions' },
    { icon: Zap, text: 'Fast ETB settlements < 15 min' },
    { icon: Users, text: 'Join our early verified traders' },
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
            Start trading USDT<br />in Ethiopia today.
          </h2>
          <p className="mt-4 text-sm text-white/60 font-sans leading-relaxed max-w-xs">
            Create your account, complete KYC verification, and start trading safely with our escrow protection.
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
            <h1 className="text-2xl font-heading font-bold">Create account</h1>
            <p className="text-sm text-muted-foreground font-sans mt-1">Join the Kacha P2P community</p>
          </div>

          {/* Google button */}
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
                or register with email
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
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-sans">Full Name</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Abebe Kebede" {...field} className="font-sans h-10" />
                  </FormControl>
                  <FormMessage className="font-sans text-xs" />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-sans">Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} className="font-sans h-10" />
                  </FormControl>
                  <FormMessage className="font-sans text-xs" />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-sans">Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} className="font-sans h-10" />
                  </FormControl>
                  <FormMessage className="font-sans text-xs" />
                </FormItem>
              )} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase tracking-wider font-sans">Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} className="font-sans h-10" />
                  </FormControl>
                  <FormMessage className="font-sans text-xs" />
                </FormItem>
              )} />
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account…</>
                  : 'Create Account'
                }
              </Button>
            </form>
          </Form>

          <p className="text-center text-sm text-muted-foreground font-sans">
            Already have an account?{' '}
            <Link to="/login" className="text-foreground font-medium hover:text-accent transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
