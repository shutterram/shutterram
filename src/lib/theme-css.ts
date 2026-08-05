/**
 * Turns studio-managed colour rows into the CSS custom properties the design
 * system reads, with separate values for dark and light mode.
 */
export interface ThemeToken {
  token: string;
  label: string;
  group: string;
  hint: string;
  darkValue: string;
  darkOpacity: number;
  lightValue: string;
  lightOpacity: number;
}

/** A colour + intensity pair as a single CSS colour value. */
export function mix(value: string, opacity: number): string {
  const safe = value.trim() || "#000000";
  const pct = Math.max(0, Math.min(100, Math.round(opacity)));
  if (pct >= 100) return safe;
  return `color-mix(in oklab, ${safe} ${pct}%, transparent)`;
}

/** `:root` (dark) + `.light` overrides for the given tokens. */
export function themeCss(tokens: ThemeToken[]): string {
  if (!tokens.length) return "";
  const dark = tokens.map((t) => `--${t.token}:${mix(t.darkValue, t.darkOpacity)};`).join("");
  const light = tokens.map((t) => `--${t.token}:${mix(t.lightValue, t.lightOpacity)};`).join("");
  return `:root{${dark}}.light{${light}}`;
}
