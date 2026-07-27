import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, TrendingUp, ShieldCheck, Wallet, AlertCircle } from 'lucide-react';
import type { Trade } from '@/types/index';

export default function Dashboard() {
  const { profile, profileLoading, refreshProfile } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Refresh profile once on mount only
  useEffect(() => { refreshProfile(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!profile?.id) return;
    const load = async () => {
      const { data } = await supabase
        .from('trades')
        .select('*')
        .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })
        .limit(5);
      setTrades(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    load();
  }, [profile?.id]);

  const statusColor: Record<string, string> = {
    completed: 'bg-success/10 text-success',
    disputed: 'bg-destructive/10 text-destructive',
    cancelled: 'bg-muted text-muted-foreground',
    initiated: 'bg-accent/10 text-accent',
    payment_pending: 'bg-warning/10 text-warning',
    payment_confirmed: 'bg-primary/10 text-primary',
  };

  const stats = [
    { label: 'USDT Balance', value: `${profile?.balance_usdt?.toFixed(2) ?? '0.00'} USDT`, icon: Wallet, gradient: 'from-accent/20 to-transparent' },
    { label: 'ETB Balance', value: `${profile?.balance_etb?.toFixed(2) ?? '0.00'} ETB`, icon: Wallet, gradient: 'from-blue-500/20 to-transparent' },
    { label: 'Completion Rate', value: `${profile?.completion_rate ?? 0}%`, icon: TrendingUp, gradient: 'from-green-500/20 to-transparent' },
    { label: 'Total Trades', value: `${profile?.total_trades ?? 0}`, icon: TrendingUp, gradient: 'from-purple-500/20 to-transparent' },
  ];

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl space-y-10">
      {/* Page header */}
      <div>
        <div className="luminate-rule" />
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mt-4">
          <div>
            <h1 className="text-3xl font-heading font-bold">
              {profileLoading ? (
                <Skeleton className="h-9 w-64 inline-block" />
              ) : (
                <>
                  Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
                  {profile?.full_name?.split(' ')[0] ?? 'Trader'}
                </>
              )}
            </h1>
            <p className="text-muted-foreground font-sans text-sm mt-1">
              Here's an overview of your trading activity.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/marketplace">
              View Marketplace <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* KYC banner — only render once profile is known to avoid flash */}
      {!profileLoading && !profile?.is_kyc_verified && (
        <div className="border border-accent/50 rounded-xl p-4 flex items-center justify-between gap-4 bg-gradient-to-r from-accent/10 to-transparent animate-pulse-slow">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <AlertCircle className="h-5 w-5 text-accent shrink-0 animate-bounce" />
              <div className="absolute inset-0 h-5 w-5 bg-accent/30 rounded-full animate-ping" />
            </div>
            <p className="text-sm font-sans text-foreground font-medium">
              Complete KYC verification to unlock full trading capabilities.
            </p>
          </div>
          <Button size="sm" variant="outline" asChild className="shrink-0 bg-accent/10 border-accent/30 text-accent hover:bg-accent/20">
            <Link to="/kyc">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Verify Now
            </Link>
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, gradient }) =>
          profileLoading || loading ? (
            <Card key={label} className="border border-border">
              <CardContent className="pt-6 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-32" />
              </CardContent>
            </Card>
          ) : (
            <Card key={label} className="border border-border relative overflow-hidden group hover:border-border/80 transition-colors">
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-sans">{label}</p>
                  <div className="h-8 w-8 rounded-lg bg-background/50 backdrop-blur-sm border border-border/50 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-foreground/70" />
                  </div>
                </div>
                <p className="text-xl font-heading font-bold">{value}</p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Quick actions - Glow buttons */}
      <div>
        <h2 className="text-xl font-heading font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button asChild className="h-14 bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_0_20px_rgba(245,158,11,0.3)] relative overflow-hidden group">
            <Link to="/marketplace?tab=buy">
              <span className="relative z-10 flex items-center font-sans text-base">
                Buy USDT <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </Button>
          <Button variant="outline" asChild className="h-14 border-border bg-card hover:bg-muted/50 group relative overflow-hidden">
            <Link to="/marketplace/create?type=sell">
              <span className="relative z-10 flex items-center font-sans text-base">
                Sell USDT <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Recent trades */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading font-semibold">Recent Trades</h2>
          <Link to="/marketplace" className="text-sm text-muted-foreground hover:text-foreground font-sans transition-colors">
            View all
          </Link>
        </div>
        <Card className="border border-border">
          <CardContent className="p-0">
            {loading ? (
              <div className="divide-y divide-border">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            ) : trades.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground font-sans text-sm bg-muted/20">
                No trades yet. Head to the marketplace to get started.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {trades.map((trade) => {
                  const isBuyer = trade.buyer_id === profile?.id;
                  return (
                    <Link
                      key={trade.id}
                      to={`/marketplace/trade/${trade.id}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-heading font-medium">
                          {isBuyer ? 'Bought' : 'Sold'} {trade.amount_usdt} USDT
                        </p>
                        <p className="text-xs text-muted-foreground font-sans mt-0.5">
                          {new Date(trade.created_at).toLocaleDateString()} · {trade.exchange_rate} ETB/USDT
                        </p>
                      </div>
                      <Badge className={`text-xs font-sans shrink-0 ${statusColor[trade.status] ?? 'bg-muted'}`}>
                        {trade.status.replace(/_/g, ' ')}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
