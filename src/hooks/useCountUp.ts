import { useState, useEffect, useRef } from 'react';

/**
 * Parses a stat string like "28,900+", "99.6%", "₮ 5.8M", "< 10 min"
 * Returns { prefix, numeric, suffix } so we can animate only the number.
 */
export function parseStatValue(raw: string): { prefix: string; numeric: number; suffix: string } {
  // Strip leading non-numeric (₮, <, spaces) as prefix
  const prefixMatch = raw.match(/^([^0-9]*)/);
  const prefix = prefixMatch ? prefixMatch[1] : '';
  const rest = raw.slice(prefix.length);
  // Extract numeric portion (digits, commas, dots)
  const numMatch = rest.match(/^([\d,.]+)/);
  if (!numMatch) return { prefix, numeric: 0, suffix: rest };
  const numStr = numMatch[1].replace(/,/g, '');
  const numeric = parseFloat(numStr);
  const suffix = rest.slice(numMatch[1].length);
  return { prefix, numeric, suffix };
}

/** Format number back: add commas for thousands, preserve decimals */
function formatNumber(n: number, originalStr: string): string {
  const hasComma = originalStr.includes(',');
  const decimals = (originalStr.match(/\.(\d+)/) || [])[1]?.length ?? 0;
  const fixed = n.toFixed(decimals);
  if (hasComma) {
    const [int, dec] = fixed.split('.');
    const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return dec !== undefined ? `${withCommas}.${dec}` : withCommas;
  }
  return fixed;
}

interface UseCountUpOptions {
  target: number;
  duration?: number; // ms
  enabled?: boolean;
  originalStr: string;
}

export function useCountUp({ target, duration = 1800, enabled = false, originalStr }: UseCountUpOptions) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(eased * target);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [enabled, target, duration]);

  return formatNumber(current, originalStr);
}

/** Hook: fires once when element enters the viewport */
export function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}
