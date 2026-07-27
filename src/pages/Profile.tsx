import { useEffect, useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCircle, ShieldCheck, TrendingUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  full_name: z.string().min(2, 'At least 2 characters'),
  phone: z.string().optional(),
});

export default function Profile() {
  const { profile, profileLoading, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tradeCount, setTradeCount] = useState<number | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: profile?.full_name ?? '', phone: profile?.phone ?? '' },
  });

  useEffect(() => {
    if (profile) {
      form.reset({ full_name: profile.full_name, phone: profile.phone ?? '' });
    }
  }, [profile, form]);

  useEffect(() => {
    if (!profile?.id) return;
    supabase.from('trades')
      .select('id', { count: 'exact' })
      .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
      .eq('status', 'completed')
      .then(({ count }) => setTradeCount(count ?? 0));
  }, [profile?.id]);

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (!profile?.id) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').update({
      full_name: values.full_name,
      phone: values.phone || null,
    }).eq('id', profile.id);
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success('Profile updated'); refreshProfile(); }
  };

  const stats = [
    { label: 'Completed Trades', value: tradeCount !== null ? String(tradeCount) : null, icon: TrendingUp },
    { label: 'Completion Rate', value: profile ? `${profile.completion_rate}%` : null, icon: TrendingUp },
    { label: 'USDT Balance', value: profile ? `${profile.balance_usdt.toFixed(2)} USDT` : null, icon: TrendingUp },
    { label: 'ETB Balance', value: profile ? `${profile.balance_etb.toFixed(2)} ETB` : null, icon: TrendingUp },
  ];

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl space-y-10">
      {/* Header */}
      <div>
        <div className="luminate-rule" />
        <h1 className="text-3xl font-heading font-bold mt-4">Profile</h1>
      </div>

      {/* Identity card */}
      <Card className="border border-border">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center shrink-0">
              <UserCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              {profileLoading ? (
                <>
                  <Skeleton className="h-6 w-40 mb-1.5" />
                  <Skeleton className="h-4 w-56 mb-2" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </>
              ) : (
                <>
                  <p className="font-heading text-xl font-bold truncate">{profile?.full_name ?? '—'}</p>
                  <p className="text-sm text-muted-foreground font-sans truncate">{profile?.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {profile?.is_kyc_verified ? (
                      <Badge className="text-xs font-sans bg-muted text-foreground flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-accent" /> KYC Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs font-sans text-muted-foreground">
                        KYC Pending
                      </Badge>
                    )}
                    {profile?.role === 'admin' && (
                      <Badge className="text-xs font-sans bg-foreground text-background">Admin</Badge>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value }) => (
          <Card key={label} className="border border-border">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-sans">{label}</p>
              {profileLoading || value === null ? (
                <Skeleton className="h-6 w-20 mt-1.5" />
              ) : (
                <p className="text-lg font-heading font-bold mt-1">{value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit form */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base font-heading">Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {profileLoading ? (
            <div className="space-y-5">
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
              <Skeleton className="h-10 w-32" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField control={form.control} name="full_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider font-sans">Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="font-sans" />
                    </FormControl>
                    <FormMessage className="font-sans text-xs" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase tracking-wider font-sans">Phone (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="+251 9XX XXX XXXX" {...field} className="font-sans" />
                    </FormControl>
                    <FormMessage className="font-sans text-xs" />
                  </FormItem>
                )} />
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
