import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldCheck, Zap, Users, Lock, TrendingUp } from 'lucide-react';

const features = [
  {
    icon: ShieldCheck,
    title: 'Escrow Protection',
    body: 'Funds are held in secure escrow until both parties confirm the transaction, eliminating counterparty risk.',
  },
  {
    icon: Users,
    title: 'Verified Community',
    body: 'Strict KYC verification and a trust scoring system ensure you only trade with reliable partners.',
  },
  {
    icon: Zap,
    title: 'Fast Settlement',
    body: 'Most trades complete in under 15 minutes via CBE Birr, Telebirr, and major Ethiopian banks.',
  },
];

const testimonials = [
  {
    name: 'Yonas T.',
    location: 'Addis Ababa',
    quote: 'Kacha is the most reliable platform I have used for USDT trading in Ethiopia. The escrow system gives me complete peace of mind.',
    trades: 1,
  },
  {
    name: 'Meron A.',
    location: 'Dire Dawa',
    quote: 'Simple, transparent, and fast. I completed my first trade within 10 minutes. Highly recommended.',
    trades: 1,
  },
  {
    name: 'Dawit M.',
    location: 'Hawassa',
    quote: 'The admin support team resolved a small dispute quickly and fairly. Professional service throughout.',
    trades: 1,
  },
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">

      {/* ── HERO ── */}
      <section className="relative min-h-[90vh] flex items-center border-b border-border auth-hero-panel overflow-hidden">
        {/* Animated orbs */}
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">

            {/* Left: copy */}
            <div className="lg:col-span-7 space-y-8 opacity-0 intersect:opacity-100 intersect:translate-y-0 translate-y-4 transition duration-700">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-chip text-xs font-sans text-white/80">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                Licensed & Escrow Protected in Ethiopia
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-[4rem] font-heading font-bold leading-[1.05] tracking-tight text-white luminate-title">
                Ethiopia's most<br />trusted way to<br />
                <span className="gold-text">trade USDT.</span>
              </h1>
              <p className="text-base md:text-lg text-white/70 font-sans leading-relaxed max-w-lg">
                Growing fast in 2026, Kacha is Ethiopia's newest and most
                secure P2P exchange — every birr protected by our escrow
                system.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 w-full min-w-0">
                <Button size="lg" asChild className="group w-full sm:w-auto justify-center bg-accent text-accent-foreground hover:bg-accent/90 border-0 h-12 px-6 sm:px-8 text-sm sm:h-14 sm:text-base">
                  <Link to="/register">
                    Start Trading Now
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button size="lg" variant="ghost" asChild className="w-full sm:w-auto justify-center h-12 px-6 sm:px-8 text-sm sm:h-14 sm:text-base border border-white/60 text-white hover:bg-white/10 glass-chip">
                  <Link to="/marketplace">View Live Offers</Link>
                </Button>
              </div>

              {/* Trust bar */}
              <div className="flex items-center gap-6 pt-6 border-t border-white/10">
                <div className="flex items-center gap-2 text-white/60 text-sm font-sans">
                  <ShieldCheck className="h-4 w-4 text-accent" /> Escrow
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm font-sans">
                  <Lock className="h-4 w-4 text-accent" /> KYC Verified
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm font-sans">
                  <Zap className="h-4 w-4 text-accent" /> <span className="hidden sm:inline">Fast</span> Settlement
                </div>
              </div>
            </div>

            {/* Right: rate card */}
            <div className="lg:col-span-5 opacity-0 intersect:opacity-100 intersect:translate-y-0 translate-y-4 transition duration-700 delay-150">
              <div className="glass-card rounded-2xl p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 relative overflow-hidden">
                {/* Subtle inner glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />

                <div className="flex items-center justify-between border-b border-border/50 pb-3 sm:pb-4 relative z-10">
                  <span className="text-[11px] sm:text-xs uppercase tracking-widest text-muted-foreground font-sans">Live Rates</span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-sans font-medium text-accent">
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-accent animate-pulse" />
                    Updated now
                  </span>
                </div>

                {/* Tab */}
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-muted/50 rounded-xl relative z-10">
                  {(['buy', 'sell'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-2 sm:py-2.5 text-xs sm:text-sm font-sans font-semibold rounded-lg transition-all no-select ${
                        activeTab === tab
                          ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tab === 'buy' ? 'Buy USDT' : 'Sell USDT'}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 sm:space-y-5 relative z-10">
                  <div className="py-1 sm:py-2">
                    <p className="text-[11px] sm:text-xs uppercase tracking-widest text-muted-foreground font-sans mb-1 sm:mb-1.5">Exchange Rate</p>
                    <div className="flex items-baseline gap-1.5 sm:gap-2">
                      <span className="text-2xl sm:text-4xl md:text-5xl font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        {activeTab === 'buy' ? '180–182' : '183–186'}
                      </span>
                      <span className="text-sm sm:text-lg text-muted-foreground font-sans font-medium">ETB / USDT</span>
                    </div>
                  </div>
                  <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm font-sans bg-muted/30 p-3 sm:p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Payment methods</span>
                      <div className="flex gap-1.5">
                        <span className="bg-background px-2 py-0.5 rounded-md text-[11px] sm:text-xs border border-border shadow-sm">CBE Birr</span>
                        <span className="bg-background px-2 py-0.5 rounded-md text-[11px] sm:text-xs border border-border shadow-sm">Telebirr</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Settlement time</span>
                      <span className="font-medium flex items-center gap-1.5">
                        <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" /> &lt; 15 minutes
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Security</span>
                      <span className="font-medium flex items-center gap-1.5">
                        <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent" /> Escrow
                      </span>
                    </div>
                  </div>
                  <Button className="w-full h-10 sm:h-12 text-sm sm:text-base shadow-lg shadow-accent/20" asChild>
                    <Link to={`/marketplace/create?type=${activeTab}`}>
                      Create {activeTab === 'buy' ? 'Buy' : 'Sell'} Offer
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="mb-12 opacity-0 intersect:opacity-100 translate-y-4 intersect:translate-y-0 transition duration-700">
            <div className="luminate-rule" />
            <h2 className="text-3xl md:text-4xl font-heading font-bold mt-4">
              Built for trust
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`space-y-4 opacity-0 intersect:opacity-100 translate-y-4 intersect:translate-y-0 transition duration-700`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="h-9 w-9 sm:h-10 sm:w-10 border border-border rounded-lg flex items-center justify-center">
                  <f.icon className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
                </div>
                <h3 className="text-base sm:text-lg font-heading font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground font-sans leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="border-b border-border bg-muted/20">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="mb-12 opacity-0 intersect:opacity-100 translate-y-4 intersect:translate-y-0 transition duration-700">
            <div className="luminate-rule" />
            <h2 className="text-3xl md:text-4xl font-heading font-bold mt-4">
              Trusted by traders
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={t.name}
                className={`border border-border rounded-xl p-4 sm:p-6 bg-card opacity-0 intersect:opacity-100 translate-y-4 intersect:translate-y-0 transition duration-700`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <blockquote className="text-sm text-muted-foreground font-sans leading-relaxed mb-4">
                  "{t.quote}"
                </blockquote>
                <div className="border-t border-border pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-heading font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground font-sans">{t.location}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-sans">
                    <TrendingUp className="h-3 w-3" />
                    {t.trades} trades
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center space-y-6 opacity-0 intersect:opacity-100 translate-y-4 intersect:translate-y-0 transition duration-700">
          <div className="flex justify-center"><div className="luminate-rule w-16" /></div>
          <h2 className="text-3xl md:text-5xl font-heading font-bold luminate-title">
            Ready to start trading?
          </h2>
          <p className="text-muted-foreground font-sans max-w-xl mx-auto">
            Join thousands of verified users who trust Kacha for secure P2P transactions.
          </p>
          <Button size="lg" asChild className="group">
            <Link to="/register">
              Create Your Account
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-card border-t border-border">
        <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-heading text-lg font-bold tracking-tight">KACHA</span>
          <div className="flex gap-6 text-sm text-muted-foreground font-sans">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <a href="mailto:support@kacha.io" className="hover:text-foreground transition-colors">Support</a>
          </div>
          <p className="text-xs text-muted-foreground font-sans">&copy; 2026 Kacha Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
