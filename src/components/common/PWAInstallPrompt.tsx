import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-80 z-40 bg-card border border-primary/30 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.15)] p-4 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-heading font-semibold text-primary">Install Kacha</p>
        <p className="text-xs text-muted-foreground font-sans mt-0.5 leading-relaxed">
          Add to your home screen for a native-like trading experience.
        </p>
        <Button
          size="sm"
          onClick={handleInstall}
          className="mt-3 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(16,185,129,0.35)] border-0 font-sans text-xs h-8"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Add to Home Screen
        </Button>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-primary transition-colors mt-0.5 shrink-0"
        aria-label="Dismiss install prompt"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
