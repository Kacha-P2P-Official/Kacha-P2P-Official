import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Bell, Shield, Palette, LogOut, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/common/ThemeToggle';

const pwSchema = z.object({
  currentPassword: z.string().min(6, 'At least 6 characters'),
  newPassword: z.string().min(6, 'At least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function Settings() {
  const { profile, profileLoading, signOut, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [notifTrade, setNotifTrade] = useState(true);
  const [notifKyc, setNotifKyc] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const pwForm = useForm<z.infer<typeof pwSchema>>({
    resolver: zodResolver(pwSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onChangePw = async (values: z.infer<typeof pwSchema>) => {
    setPwLoading(true);
    setPwError(null);
    // Re-authenticate with the current password first so we verify the user
    // actually knows it before allowing a change (Supabase updateUser alone
    // does not validate the existing password).
    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData?.session?.user?.email;
    if (!email) {
      setPwError('Unable to verify your session. Please sign in again.');
      setPwLoading(false);
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: values.currentPassword });
    if (signInError) {
      setPwError('Current password is incorrect.');
      setPwLoading(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: values.newPassword });
    setPwLoading(false);
    if (error) { setPwError(error.message); return; }
    toast.success('Password updated successfully');
    pwForm.reset();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'delete my account') return;
    setDeleteLoading(true);
    setDeleteError(null);
    const { error } = await deleteAccount();
    setDeleteLoading(false);
    if (error) {
      setDeleteError(error);
      return;
    }
    setDeleteDialogOpen(false);
    toast.success('Your account has been permanently deleted.');
    navigate('/');
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl space-y-10 page-enter">
      {/* Page header */}
      <div>
        <div className="luminate-rule" />
        <h1 className="text-3xl font-heading font-bold mt-4 luminate-title">Settings</h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">
          Manage your account preferences and security.
        </p>
      </div>

      {/* Appearance */}
      <Card className="border border-border card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Palette className="h-4 w-4 text-accent" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-sans font-medium">Theme</p>
              <p className="text-xs text-muted-foreground font-sans mt-0.5">
                Switch between light and dark mode
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border border-border card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Bell className="h-4 w-4 text-accent" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {[
            {
              id: 'notif-trade',
              label: 'Trade updates',
              desc: 'Get notified when your trade status changes',
              value: notifTrade,
              onChange: setNotifTrade,
            },
            {
              id: 'notif-kyc',
              label: 'KYC status',
              desc: 'Get notified when your KYC application is reviewed',
              value: notifKyc,
              onChange: setNotifKyc,
            },
          ].map(({ id, label, desc, value, onChange }) => (
            <div key={id} className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Label htmlFor={id} className="text-sm font-sans font-medium cursor-pointer">{label}</Label>
                <p className="text-xs text-muted-foreground font-sans mt-0.5">{desc}</p>
              </div>
              <Switch
                id={id}
                checked={value}
                onCheckedChange={onChange}
                className="shrink-0"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border border-border card-gradient">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-sm font-sans text-muted-foreground mb-1">
              Email:{' '}
              {profileLoading ? (
                <Skeleton className="inline-block h-4 w-44 align-middle" />
              ) : (
                <span className="text-foreground">{profile?.email ?? '—'}</span>
              )}
            </p>
          </div>

          {pwError && (
            <Alert variant="destructive">
              <AlertDescription className="font-sans text-sm">{pwError}</AlertDescription>
            </Alert>
          )}

          <Form {...pwForm}>
            <form onSubmit={pwForm.handleSubmit(onChangePw)} className="space-y-4">
              {[
                { name: 'currentPassword' as const, label: 'Current Password' },
                { name: 'newPassword' as const, label: 'New Password' },
                { name: 'confirmPassword' as const, label: 'Confirm New Password' },
              ].map(({ name, label }) => (
                <FormField key={name} control={pwForm.control} name={name} render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider font-sans">{label}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="font-sans" />
                    </FormControl>
                    <FormMessage className="font-sans text-xs" />
                  </FormItem>
                )} />
              ))}
              <Button type="submit" size="sm" disabled={pwLoading}>
                {pwLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Update Password'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-sans font-medium">Sign out</p>
              <p className="text-xs text-muted-foreground font-sans">Sign out of your account on this device</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 shrink-0"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap border-t border-destructive/20 pt-4">
            <div>
              <p className="text-sm font-sans font-medium">Delete account</p>
              <p className="text-xs text-muted-foreground font-sans">Permanently delete your account and all data</p>
            </div>
            <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
              setDeleteDialogOpen(open);
              if (!open) { setDeleteConfirmText(''); setDeleteError(null); }
            }}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10 shrink-0">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-heading">Permanently delete your account?</AlertDialogTitle>
                  <AlertDialogDescription className="font-sans">
                    This cannot be undone. All your data — offers, trade history, KYC documents, and messages —
                    will be erased permanently. Open trades will be cancelled automatically.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-3 py-1">
                  <p className="text-sm font-sans text-muted-foreground">
                    Type <span className="font-mono font-semibold text-foreground">delete my account</span> to confirm:
                  </p>
                  <Input
                    placeholder="delete my account"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="font-sans"
                    disabled={deleteLoading}
                  />
                  {deleteError && (
                    <Alert variant="destructive">
                      <AlertDescription className="font-sans text-sm">{deleteError}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel className="font-sans" disabled={deleteLoading}>Cancel</AlertDialogCancel>
                  {/* Plain Button keeps dialog open if deletion fails */}
                  <Button
                    variant="destructive"
                    disabled={deleteConfirmText !== 'delete my account' || deleteLoading}
                    onClick={handleDeleteAccount}
                    className="font-sans"
                  >
                    {deleteLoading
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</>
                      : 'Yes, delete permanently'}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
