import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { duration, type DurationToken } from '@/lib/motion';

/**
 * Whether the OS "reduce motion" preference is on.
 *
 * The app had no reduced-motion support at all: `AccessibilityInfo` was never
 * consulted anywhere in the mobile codebase, while the web app gates motion at
 * three separate layers. Someone who gets motion sick, or who simply turned
 * the setting on, was shown every animation regardless.
 *
 * Reads the current value on mount and subscribes to changes, because the user
 * can flip the setting while the app is backgrounded.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (alive) setReduced(v); })
      .catch(() => { /* preference unreadable — assume motion is fine */ });

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; sub.remove(); };
  }, []);

  return reduced;
}

/**
 * Motion tokens already gated on the preference.
 *
 * `d('standard')` returns 0 when reduce-motion is on, so a transition becomes
 * an instant state change rather than being skipped — the end state is always
 * the same, only the travel is removed.
 */
export function useMotion() {
  const reduced = useReducedMotion();
  return {
    reduced,
    d: (token: DurationToken): number => (reduced ? 0 : duration[token]),
    /** True when a decorative or continuous animation should not run at all. */
    allowLoop: !reduced,
  };
}
