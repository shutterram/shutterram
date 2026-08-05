/**
 * Turns studio-managed typography rows into CSS.
 *
 * Every field is optional: a blank value means "keep the built-in design".
 * Sizes are stored per device so the studio can tune desktop, tablet and
 * mobile independently.
 */
export interface TypeToken {
  role: string;
  label: string;
  group: string;
  hint: string;
  selector: string;
  fontFamily: string;
  weight: string;
  letterSpacing: string;
  lineHeight: string;
  textTransform: string;
  sizeDesktop: string;
  sizeTablet: string;
  sizeMobile: string;
  sampleText?: string;
}

export interface Typography {
  heading: string;
  body: string;
  scaleDesktop: number;
  scaleTablet: number;
  scaleMobile: number;
}

export const defaultTypography: Typography = {
  heading: "Literata",
  body: "Manrope",
  scaleDesktop: 1,
  scaleTablet: 1,
  scaleMobile: 1,
};

/** Media queries used for the three device views. */
export const MOBILE_MQ = "(max-width: 767px)";
export const TABLET_MQ = "(min-width: 768px) and (max-width: 1023px)";
export const DESKTOP_MQ = "(min-width: 1024px)";

const clean = (v: string) => (v ?? "").trim();

function familyValue(value: string): string {
  const v = clean(value);
  if (!v) return "";
  if (v === "display") return "var(--font-display)";
  if (v === "sans") return "var(--font-sans)";
  return `"${v.replace(/"/g, "")}", var(--font-sans)`;
}

function baseDecls(t: TypeToken): string {
  const out: string[] = [];
  const family = familyValue(t.fontFamily);
  if (family) out.push(`font-family:${family} !important`);
  if (clean(t.weight)) out.push(`font-weight:${clean(t.weight)} !important`);
  if (clean(t.letterSpacing)) out.push(`letter-spacing:${clean(t.letterSpacing)} !important`);
  if (clean(t.lineHeight)) out.push(`line-height:${clean(t.lineHeight)} !important`);
  if (clean(t.textTransform)) out.push(`text-transform:${clean(t.textTransform)} !important`);
  return out.join(";");
}

function sizeRule(selector: string, size: string): string {
  const v = clean(size);
  return v ? `${selector}{font-size:${v} !important;}` : "";
}

const scaleRule = (mq: string, scale: number) =>
  scale && scale !== 1 ? `@media ${mq}{html{font-size:${(scale * 100).toFixed(2)}%;}}` : "";

/** The full stylesheet for the studio-managed typography. */
export function typographyCss(tokens: TypeToken[], type: Typography): string {
  const parts: string[] = [];

  const heading = clean(type.heading);
  const body = clean(type.body);
  if (heading || body) {
    const decls: string[] = [];
    if (heading) decls.push(`--font-display:"${heading}", ui-serif, Georgia, serif;`);
    if (body) decls.push(`--font-sans:"${body}", ui-sans-serif, system-ui, sans-serif;`);
    parts.push(`:root{${decls.join("")}}`);
  }

  parts.push(scaleRule(DESKTOP_MQ, type.scaleDesktop));
  parts.push(scaleRule(TABLET_MQ, type.scaleTablet));
  parts.push(scaleRule(MOBILE_MQ, type.scaleMobile));

  for (const t of tokens) {
    const selector = clean(t.selector);
    if (!selector) continue;
    const decls = baseDecls(t);
    if (decls) parts.push(`${selector}{${decls};}`);
    const desktop = sizeRule(selector, t.sizeDesktop);
    const tablet = sizeRule(selector, t.sizeTablet);
    const mobile = sizeRule(selector, t.sizeMobile);
    if (desktop) parts.push(`@media ${DESKTOP_MQ}{${desktop}}`);
    if (tablet) parts.push(`@media ${TABLET_MQ}{${tablet}}`);
    if (mobile) parts.push(`@media ${MOBILE_MQ}{${mobile}}`);
  }

  return parts.filter(Boolean).join("");
}

/** Google Fonts stylesheet URL for the chosen heading + body families. */
export function googleFontsHref(type: Typography): string {
  const families = [clean(type.heading), clean(type.body)].filter(Boolean);
  if (!families.length) return "";
  const unique = [...new Set(families)];
  const query = unique
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@300;400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}

/** Curated list offered in the studio (any Google Font name also works). */
export const FONT_CHOICES = [
  "Literata",
  "Manrope",
  "Sora",
  "Inter",
  "Playfair Display",
  "Cormorant Garamond",
  "DM Serif Display",
  "Instrument Serif",
  "Libre Baskerville",
  "Lora",
  "Work Sans",
  "Space Grotesk",
  "Outfit",
  "Figtree",
  "Jost",
  "Urbanist",
  "Archivo",
  "Syne",
];
