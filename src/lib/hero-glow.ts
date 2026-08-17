import { useSyncExternalStore } from "react";

/**
 * The hero image currently filling the top of the page. The header (logo +
 * nav) sits on top of it, so it picks up that image's studio glow settings.
 */
let current: string | null = null;
const listeners = new Set<() => void>();

export function setHeroImage(src: string | null) {
  if (current === src) return;
  current = src;
  listeners.forEach((l) => l());
}

export function useHeroImage(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
}
