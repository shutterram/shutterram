import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

const KEY = "shutterram-theme";
const listeners = new Set<(t: Theme) => void>();
let current: Theme = "dark";

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/** Site-wide light/dark theme, persisted in the browser. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(current);

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    const next: Theme = stored === "light" || stored === "dark" ? stored : "dark";
    current = next;
    apply(next);
    setThemeState(next);
    const listener = (t: Theme) => setThemeState(t);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setTheme = (next: Theme) => {
    current = next;
    window.localStorage.setItem(KEY, next);
    apply(next);
    listeners.forEach((l) => l(next));
  };

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
