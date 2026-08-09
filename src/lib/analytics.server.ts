/**
 * Server-only helpers behind the analytics server functions.
 *
 * These live outside `analytics.functions.ts` so that file stays a thin
 * wrapper of `createServerFn` declarations — the server-function splitter
 * removes handler bodies from the client bundle, and runtime siblings left
 * in that file can disappear with them.
 */
import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

/**
 * Backend address + public key for the anonymous insert.
 * Hosts differ in which names they expose to the server runtime, so we accept
 * both the server-side names and the build-time VITE_ ones.
 */
export function publicEnv() {
  const url = process.env["SUPABASE_URL"] || import.meta.env["VITE_SUPABASE_URL"] || "";
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    "";
  return { url, key };
}

/** Publishable-key client for the anonymous insert. */
export function publicClient() {
  const { url, key } = publicEnv();

  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/**
 * Geography from the edge network's request headers, which are derived from
 * the connecting IP. We never store the IP itself and we set no cookies —
 * the visitor id is a random string kept by the browser.
 */
export function requestContext(): {
  country: string;
  region: string;
  city: string;
  userAgent: string;
} {
  try {
    const headers = getRequest().headers;
    const pick = (...names: string[]) => {
      for (const n of names) {
        const v = headers.get(n);
        if (v) return v.slice(0, 64);
      }
      return "";
    };
    return {
      country: pick("cf-ipcountry", "x-vercel-ip-country", "x-geo-country", "x-country-code"),
      region: decodeURIComponent(pick("x-vercel-ip-country-region", "cf-region", "x-geo-region")),
      city: decodeURIComponent(pick("x-vercel-ip-city", "cf-ipcity", "x-geo-city")),
      userAgent: headers.get("user-agent") ?? "",
    };
  } catch {
    // Geography is best-effort only.
    return { country: "", region: "", city: "", userAgent: "" };
  }
}

export const BOT_RE =
  /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|bingpreview|headless|lighthouse|pingdom|monitor/i;

/** Best-effort browser name from a user-agent string. No IP, no fingerprint. */
export function browserOf(ua: string): string {
  if (!ua) return "Unknown";
  if (BOT_RE.test(ua)) return "Bot / crawler";
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}

/** Best-effort operating system from a user-agent string. */
export function osOf(ua: string): string {
  if (!ua) return "Unknown";
  if (/Windows/.test(ua)) return "Windows";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Other";
}

/** Turns an ISO country code into a readable name ("SE" -> "Sweden"). */
let regionNames: Intl.DisplayNames | null | undefined;
export function countryName(code: string): string {
  const raw = code.trim().toUpperCase();
  if (!raw) return "Unknown";
  if (raw.length !== 2) return code;
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      regionNames = null;
    }
  }
  try {
    return regionNames?.of(raw) ?? raw;
  } catch {
    return raw;
  }
}

export const RANGE_HOURS: Record<string, number> = {
  "5h": 5,
  "24h": 24,
  "7d": 24 * 7,
  month: 24 * 30,
  year: 24 * 365,
  all: 24 * 365 * 20,
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
