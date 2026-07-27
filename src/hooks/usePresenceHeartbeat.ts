import { useEffect } from 'react';
import { supabase } from '@/db/supabase';

/**
 * Keeps profiles.last_seen_at fresh for the signed-in user so the
 * Marketplace "Active Merchants" panel can show a genuine online
 * indicator (not a fake/hardcoded one). Pings on mount, then every
 * 60s while the tab is open, and once more when the tab regains focus.
 */
export function usePresenceHeartbeat(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;

    const ping = () => {
      supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', userId)
        .then(() => {});
    };

    ping();
    const interval = setInterval(ping, 60_000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);
}
