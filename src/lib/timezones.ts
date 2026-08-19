/** Shared time-zone helpers for contracts (dates signed, auto-filled date fields). */

export const DEFAULT_TIMEZONE = "America/New_York";

export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "America/New_York", label: "New York — Eastern (EST/EDT)" },
  { value: "America/Chicago", label: "Chicago — Central (CST/CDT)" },
  { value: "America/Denver", label: "Denver — Mountain (MST/MDT)" },
  { value: "America/Phoenix", label: "Phoenix — Arizona (MST)" },
  { value: "America/Los_Angeles", label: "Los Angeles — Pacific (PST/PDT)" },
  { value: "America/Anchorage", label: "Anchorage — Alaska" },
  { value: "Pacific/Honolulu", label: "Honolulu — Hawaii" },
  { value: "America/Toronto", label: "Toronto" },
  { value: "America/Vancouver", label: "Vancouver" },
  { value: "America/Mexico_City", label: "Mexico City" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris / Berlin / Madrid" },
  { value: "Europe/Athens", label: "Athens / Helsinki" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Kolkata", label: "India — Kolkata" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Pacific/Auckland", label: "Auckland" },
  { value: "UTC", label: "UTC" },
];

export function safeTimezone(tz?: string | null): string {
  const value = (tz || "").trim();
  if (!value) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/** YYYY-MM-DD for "now" in the given zone. */
export function todayInZone(tz?: string | null, at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimezone(tz),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Human-readable date + time with the zone abbreviation, e.g. "Aug 19, 2026, 2:08 AM EDT". */
export function formatInZone(value: string | Date, tz?: string | null): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone(tz),
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function timezoneLabel(tz?: string | null): string {
  const value = safeTimezone(tz);
  return TIMEZONE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
