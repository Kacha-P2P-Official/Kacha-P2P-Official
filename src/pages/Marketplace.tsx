import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Search, ShieldCheck, Zap, Lock, UserCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Offer } from '@/types/index';
import { ActiveMerchants } from '@/components/common/ActiveMerchants';

const PAYMENT_METHODS = ['CBE Birr', 'Telebirr', 'Amhara Bank', 'Awash Bank'];

function LiveRatesWidget() {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  return (
    <div className="glass-card rounded-xl p-2 space-y-2 relative overflow-hidden mb-4 lg:mb-0 lg:sticky lg:top-24">
      {/* Subtle inner glow */}
      <div className="absolute top-0 right-0 w-8 h-8 bg-accent/10 rounded-full blur-xl pointer-events-none" />

      <div className="flex items-center justify-between border-b border-border/50 pb-1 relative z-10">
        <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-sans">Live Rates</span>
        <span className="inline-flex items-center gap-1 text-[8px] font-sans font-medium text-accent">
          <span className="h-0.5 w-0.5 rounded-full bg-accent animate-pulse" />
          Now
        </span>
      </div>

      {/* Tab */}
      <div className="grid grid-cols-2 gap-0.5 p-0.5 bg-muted/50 rounded-md relative z-10">
        {(['buy', 'sell'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-0.5 text-[9px] font-sans font-semibold rounded-sm transition-all no-select ${
              activeTab === tab
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'buy' ? 'Buy' : 'Sell'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5 relative z-10">
        <div>
          <p className="text-[8px] uppercase tracking-widest text-muted-foreground font-sans mb-0.5">Rate</p>
          <div className="flex items-baseline gap-0.5">
            <span className="text-sm font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              {activeTab === 'buy' ? '180–182' : '183–186'}
            </span>
            <span className="text-[9px] text-muted-foreground font-sans font-medium">ETB/USDT</span>
          </div>
        </div>
        <div className="space-y-1 text-[9px] font-sans bg-muted/30 p-1.5 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Methods</span>
            <div className="flex gap-0.5">
              <span className="bg-background px-0.5 py-0.5 rounded text-[7px] border border-border">CBE</span>
              <span className="bg-background px-0.5 py-0.5 rounded text-[7px] border border-border">Telebirr</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Time</span>
            <span className="font-medium flex items-center gap-0.5">
              <Zap className="h-2 w-2 text-accent" /> &lt;15m
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Security</span>
            <span className="font-medium flex items-center gap-0.5">
              <ShieldCheck className="h-2 w-2 text-accent" /> Escrow
            </span>
          </div>
        </div>
        <Button className="w-full text-[9px] shadow-sm shadow-accent/10 h-7 bg-accent text-accent-foreground hover:bg-accent/90 border-0" size="sm" asChild>
          <Link to={`/marketplace/create?type=${activeTab}`}>
            Create {activeTab === 'buy' ? 'Buy' : 'Sell'} Offer
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as 'buy' | 'sell') || 'buy';

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    // When user selects "buy" tab they want to BUY usdt → they need to see SELL offers (someone selling)
    // When user selects "sell" tab they want to SELL usdt → they need to see BUY offers (someone buying)
    const offerType = tab === 'buy' ? 'sell' : 'buy';

    supabase
      .from('offers')
      .select('*, profiles!offers_user_id_fkey(full_name, total_trades, completion_rate)')
      .eq('type', offerType)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setOffers(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [tab]);

  const filtered = offers.filter((o) => {
    const matchPayment = paymentFilter === 'all' || o.payment_methods.includes(paymentFilter);
    const matchSearch = !search || (o.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()));
    return matchPayment && matchSearch;
  });

  const handleInitiateTrade = async (offer: Offer) => {
    if (!profile) return;
    if (profile.is_banned) {
      toast.error('Your account has been suspended. Contact support.');
      return;
    }
    if (!profile.is_kyc_verified) {
      toast.error('Complete KYC verification before initiating a trade.');
      return;
    }
    const isBuyer = offer.type === 'sell'; // I'm buying USDT from a sell offer
    const { data, error } = await supabase.from('trades').insert({
      offer_id: offer.id,
      buyer_id: isBuyer ? profile.id : offer.user_id,
      seller_id: isBuyer ? offer.user_id : profile.id,
      amount_usdt: offer.amount_usdt,
      amount_etb: Math.round(offer.amount_usdt * offer.exchange_rate),
      exchange_rate: offer.exchange_rate,
      payment_method: offer.payment_methods[0],
      status: 'initiated',
      escrow_status: 'held',
    }).select().maybeSingle();
    if (!error && data) {
      toast.success("Trade initiated! Connecting you with your trading partner…");
      // Short delay so they see the toast before navigation wipes it
      setTimeout(() => {
        navigate(`/marketplace/trade/${data.id}`);
      }, 800);
    } else if (error) {
      toast.error(`Trade failed to initiate: ${error.message}`);
    }
  };

  const tabClass = (t: 'buy' | 'sell') =>
    `px-4 py-1.5 text-xs font-sans font-medium transition-all no-select cursor-pointer rounded-md ${
      tab === t ? 'bg-foreground text-background shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
    }`;

  return (
    <div className="container mx-auto px-3 py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="luminate-rule" />
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mt-3">
          <div>
            <h1 className="text-2xl font-heading font-bold">Marketplace</h1>
            <p className="text-xs text-muted-foreground font-sans mt-0.5">
              Browse verified offers from traders across Ethiopia.
            </p>
          </div>
          <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 border-0 shadow-lg shadow-accent/20 h-8 text-xs">
            <Link to="/marketplace/create">
              <Plus className="mr-1.5 h-3 w-3" /> Create Offer
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: Main Content */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          
          {/* Mobile Live Rates */}
          <div className="block lg:hidden">
            <LiveRatesWidget />
          </div>

          {/* Active Merchants — real verified traders, live from Supabase */}
          <ActiveMerchants />

          {/* Tabs */}
          <div className="flex gap-2 p-1 bg-muted/40 rounded-lg w-fit">
            <button className={tabClass('buy')} onClick={() => setSearchParams({ tab: 'buy' })}>
              Buy USDT
            </button>
            <button className={tabClass('sell')} onClick={() => setSearchParams({ tab: 'sell' })}>
              Sell USDT
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search trader…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 font-sans h-9 bg-background text-sm"
              />
            </div>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full sm:w-40 font-sans shrink-0 h-9 bg-background text-sm">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Offer list */}
          <div className="space-y-3">
            {loading ? (
              [...Array(4)].map((_, i) => (
                <Card key={i} className="border border-border">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-4 w-32" /></div>
                    <Skeleton className="h-6 w-48" />
                  </CardContent>
                </Card>
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground font-sans text-xs bg-muted/20 rounded-xl border border-dashed border-border">
                No offers available. Try adjusting your filters.
              </div>
            ) : (
              filtered.map((offer) => (
                <Card key={offer.id} className="border border-border hover:shadow-[var(--shadow-md)] hover:border-accent/30 transition-all duration-300">
                  <CardContent className="p-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      
                      {/* Trader Info */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border">
                          <UserCircle className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-heading font-bold text-sm truncate">
                              {offer.profiles?.full_name ?? 'Trader'}
                            </span>
                            <ShieldCheck className="h-3 w-3 text-accent" />
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground font-sans">
                            <span className="font-medium text-foreground">{offer.profiles?.completion_rate ?? 0}%</span> completion
                            <span className="opacity-50">|</span>
                            <span>{offer.profiles?.total_trades ?? 0} trades</span>
                          </div>
                        </div>
                      </div>

                      {/* Rate & Limits */}
                      <div className="flex flex-col md:items-center gap-0.5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-heading font-bold">{offer.exchange_rate}</span>
                          <span className="text-[10px] text-muted-foreground font-sans">ETB/USDT</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-sans">
                          Available: <span className="font-medium text-foreground">{offer.amount_usdt} USDT</span>
                        </div>
                        <div className="text-[9px] text-muted-foreground font-sans mt-0.5 bg-muted/50 px-1.5 py-0.5 rounded">
                          Limits: {offer.min_limit_etb}–{offer.max_limit_etb} ETB
                        </div>
                      </div>

                      {/* Payment & CTA */}
                      <div className="flex flex-col gap-2 shrink-0 items-start md:items-end">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {offer.payment_methods.map((m) => (
                            <Badge key={m} variant="secondary" className="text-[9px] font-sans bg-muted text-muted-foreground px-1.5 py-0">
                              {m}
                            </Badge>
                          ))}
                        </div>
                        {offer.user_id === profile?.id ? (
                          <div className="w-full md:w-auto font-sans bg-transparent border border-dashed rounded-sm px-2 py-1 text-xs text-center cursor-default text-muted-foreground">
                            Your offer
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            className="w-full md:w-auto bg-foreground text-background hover:bg-foreground/90 shadow-sm h-8 text-xs"
                            onClick={() => handleInitiateTrade(offer)}
                          >
                            {tab === 'buy' ? 'Buy USDT' : 'Sell USDT'}
                          </Button>
                        )}
                      </div>
                      
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Right: Sidebar Live Rates (Desktop) */}
        <div className="hidden lg:block lg:col-span-4 xl:col-span-3">
          <LiveRatesWidget />
        </div>
      </div>
    </div>
  );
}
