/** Shared helpers for rendering contract field content identically in the
 *  browser overlay (CRM editor + signing page) and in the burned PDF. */

/** Nominal US-Letter height in points — the basis for point-sized field text. */
export const PDF_PAGE_PT = 792;

export const DEFAULT_FIELD_PT = 11;

/** Converts a point size into a container-query size relative to the field box. */
export function fieldFontCss(pt: number, boxHeightFraction: number): string {
  const h = Math.max(0.005, boxHeightFraction);
  const cqh = (pt / (PDF_PAGE_PT * h)) * 100;
  return `${Math.max(2, Math.min(400, cqh))}cqh`;
}

/** YYYY-MM-DD (or any parseable date) → MM/DD/YYYY. */
export function usDate(value: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  return value;
}

/** The text that should appear inside a field box. */
export function fieldDisplay(kind: string, value: string): string {
  if (!value) return "";
  if (kind === "checkbox") return value === "true" ? "✓" : "";
  if (kind === "date") return usDate(value);
  return value;
}
