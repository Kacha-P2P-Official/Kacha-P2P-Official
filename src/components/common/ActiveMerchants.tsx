import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Star, UserCircle } from 'lucide-react';
import type { ActiveMerchant } from '@/types/index';

const ONLINE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function ActiveMerchants() {
  const [merchants, setMerchants] = useState<ActiveMerchant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, average_rating, total_reviews, completion_rate, total_trades, completed_trades, is_kyc_verified, last_seen_at')
        .eq('is_kyc_verified', true)
        .eq('is_banned', false)
        .gt('completed_trades', 0)
        .order('completed_trades', { ascending: false })
        .limit(8)
        .then(({ data }) => {
          if (cancelled) return;
          const rows = Array.isArray(data) ? data : [];
          setMerchants(
            rows.map((r) => ({
              ...r,
              is_online: r.last_seen_at
                ? Date.now() - new Date(r.last_seen_at).getTime() < ONLINE_WINDOW_MS
                : false,
            })) as ActiveMerchant[]
          );
          setLoading(false);
        });
    };

    load();
    // Real presence is time-sensitive — recheck the online window periodically.
    const interval = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (!loading && merchants.length === 0) return null;

  return (
    <div className="space-y-2 w-full overflow-hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-heading font-bold uppercase tracking-wider text-muted-foreground">
          Active Merchants
        </h2>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar snap-x w-full max-w-full">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i} className="border border-border shrink-0 w-44">
              <CardContent className="p-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-2 w-24" />
              </CardContent>
            </Card>
          ))
        ) : (
          merchants.map((m) => (
            <Card
              key={m.id}
              className="border border-border shrink-0 w-44 snap-start hover:border-primary/40 hover:shadow-[var(--shadow-md)] transition-all"
            >
              <CardContent className="p-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="relative shrink-0">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center border border-border overflow-hidden">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt={m.full_name} className="h-full w-full object-cover" />
                      ) : (
                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    {m.is_online && (
                      <span className="online-dot absolute -bottom-0.5 -right-0.5 ring-2 ring-card" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-0.5">
                      <span className="font-heading font-semibold text-[10px] truncate">{m.full_name}</span>
                      <ShieldCheck className="h-2.5 w-2.5 text-primary shrink-0" />
                    </div>
                    <span className={`text-[8px] font-sans ${m.is_online ? 'text-primary' : 'text-muted-foreground'}`}>
                      {m.is_online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[9px] font-sans text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Star className="h-2 w-2 text-accent fill-accent" />
                    {m.average_rating > 0 ? m.average_rating.toFixed(1) : '—'}
                  </span>
                  <span>{m.completion_rate}%</span>
                </div>
                <div className="text-[8px] text-muted-foreground font-sans bg-muted/50 px-1.5 py-0.5 rounded text-center">
                  {m.completed_trades} trades
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
