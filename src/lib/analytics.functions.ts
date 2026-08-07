import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export interface AnalyticsBucket {
  /** Day (YYYY-MM-DD) or month (YYYY-MM) label. */
  period: string;
  views: number;
  visitors: number;
}

export interface AnalyticsPage {
  path: string;
  views: number;
  visitors: number;
}

export interface AnalyticsShareLink {
  token: string;
  label: string;
  url: string;
  views: number;
  visitors: number;
}

export interface AnalyticsSlice {
  key: string;
  views: number;
  visitors: number;
}

export interface AnalyticsPayload {
  botViews: number;
  totalViews: number;
  totalVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  viewsPerVisitor: number;
  totalSeconds: number;
  avgSecondsPerVisit: number;
  avgSecondsPerVisitor: number;
  buckets: AnalyticsBucket[];
  pages: AnalyticsPage[];
  referrers: { source: string; views: number }[];
  devices: { device: string; views: number; visitors: number }[];
  shareLinks: AnalyticsShareLink[];
  countries: AnalyticsSlice[];
  regions: AnalyticsSlice[];
  cities: AnalyticsSlice[];
  browsers: AnalyticsSlice[];
  operatingSystems: AnalyticsSlice[];
  languages: AnalyticsSlice[];
  timezones: AnalyticsSlice[];
  screens: AnalyticsSlice[];
  hourOfDay: AnalyticsSlice[];
  dayOfWeek: AnalyticsSlice[];
}

/** Publishable-key client for the anonymous insert. */
function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
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

/** Records one page view. Anonymous, no personal data — just path + a random id. */
export const trackPageView = createServerFn({ method: "POST" })
  .inputValidator(
    (
      input:
        | {
            path?: string;
            visitorId?: string;
            referrer?: string;
            shareToken?: string;
            deviceType?: string;
            language?: string;
            timezone?: string;
            screenSize?: string;
            userAgent?: string;
          }
        | undefined,
    ) => ({
      path: String(input?.path ?? "/").slice(0, 200),
      visitorId: String(input?.visitorId ?? "").slice(0, 64),
      referrer: String(input?.referrer ?? "").slice(0, 200),
      shareToken: String(input?.shareToken ?? "").slice(0, 64),
      deviceType: ["mobile", "tablet", "desktop"].includes(String(input?.deviceType))
        ? String(input?.deviceType)
        : "",
      language: String(input?.language ?? "").slice(0, 16),
      timezone: String(input?.timezone ?? "").slice(0, 64),
      screenSize: String(input?.screenSize ?? "").slice(0, 24),
      userAgent: String(input?.userAgent ?? "").slice(0, 300),
    }),
  )
  .handler(async ({ data }) => {
    if (data.path.startsWith("/admin") || data.path.startsWith("/auth")) return { ok: true };
    if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_PUBLISHABLE_KEY"]) {
      return { ok: false };
    }
    // Geography comes from the edge network's request headers, which are
    // derived from the connecting IP. We never store the IP itself and we set
    // no cookies — the visitor id is a random string kept by the browser.
    let country = "";
    let region = "";
    let city = "";
    let headerAgent = "";
    try {
      const headers = getRequest().headers;
      const pick = (...names: string[]) => {
        for (const n of names) {
          const v = headers.get(n);
          if (v) return v.slice(0, 64);
        }
        return "";
      };
      country = pick("cf-ipcountry", "x-vercel-ip-country", "x-geo-country", "x-country-code");
      region = decodeURIComponent(
        pick("x-vercel-ip-country-region", "cf-region", "x-geo-region") || "",
      );
      city = decodeURIComponent(pick("x-vercel-ip-city", "cf-ipcity", "x-geo-city") || "");
      headerAgent = headers.get("user-agent") ?? "";
    } catch {
      /* geography is best-effort only */
    }

    const agent = data.userAgent || headerAgent;
    const { data: inserted, error } = await publicClient()
      .from("page_views" as never)
      .insert({
        path: data.path,
        visitor_id: data.visitorId,
        referrer: data.referrer,
        share_token: data.shareToken,
        device_type: data.deviceType,
        country,
        region,
        city,
        browser: browserOf(agent),
        os: osOf(agent),
        language: data.language,
        timezone: data.timezone,
        screen_size: data.screenSize,
        is_bot: BOT_RE.test(agent),
      } as never)
      .select("id")
      .single();
    if (error) console.error("[analytics] insert failed", error.message);
    return { ok: !error, id: (inserted as { id?: string } | null)?.id ?? "" };
  });

/** Records how long a visit lasted. Fire-and-forget when the page is closed. */
export const recordViewDuration = createServerFn({ method: "POST" })
  .inputValidator((input: { id?: string; seconds?: number } | undefined) => ({
    id: String(input?.id ?? "").slice(0, 64),
    seconds: Math.max(0, Math.min(7200, Math.round(Number(input?.seconds ?? 0)))),
  }))
  .handler(async ({ data }) => {
    if (!data.id || data.seconds <= 0) return { ok: false };
    if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_PUBLISHABLE_KEY"]) {
      return { ok: false };
    }
    const { error } = await publicClient().rpc("record_view_duration" as never, {
      _id: data.id,
      _seconds: data.seconds,
    } as never);
    return { ok: !error };
  });

const BOT_RE =
  /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|bingpreview|headless|lighthouse|pingdom|monitor/i;

/** Best-effort browser name from a user-agent string. No IP, no fingerprint. */
function browserOf(ua: string): string {
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
function osOf(ua: string): string {
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
function countryName(code: string): string {
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

const RANGE_HOURS: Record<string, number> = {
  "5h": 5,
  "24h": 24,
  "7d": 24 * 7,
  month: 24 * 30,
  year: 24 * 365,
  all: 24 * 365 * 20,
};

/** Admin-only statistics for the studio dashboard. */
export const getSiteAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { range?: string } | undefined) => ({
    range: input?.range && input.range in RANGE_HOURS ? input.range : "month",
  }))
  .handler(async ({ data, context }): Promise<AnalyticsPayload> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const hours = RANGE_HOURS[data.range] ?? 24 * 30;
    const since = new Date(Date.now() - hours * 3600 * 1000);

    const { data: rows, error } = await context.supabase
      .from("page_views")
      .select(
        "path,visitor_id,referrer,created_at,share_token,device_type,country,region,city,browser,os,language,timezone,screen_size,is_bot,duration_seconds",
      )
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true })
      .limit(50000);
    if (error) throw new Error(error.message);

    // Visitors already seen before this window count as returning.
    const { data: earlier } = await context.supabase
      .from("page_views")
      .select("visitor_id")
      .lt("created_at", since.toISOString())
      .limit(50000);
    const priorVisitors = new Set((earlier ?? []).map((r) => String(r.visitor_id || "")));

    const { data: linkRows } = await context.supabase
      .from("share_links")
      .select("token,label,scope,category_slug,path");
    const linkInfo = new Map(
      ((linkRows ?? []) as Record<string, unknown>[]).map((r) => {
        const scope = String(r["scope"] ?? "");
        const url =
          scope === "category"
            ? `/gallery/${String(r["category_slug"] ?? "")}`
            : scope === "page"
              ? String(r["path"] ?? "/")
              : "/gallery";
        return [
          String(r["token"]),
          {
            label: String(r["label"] || "Untitled link"),
            url: `${url}?k=${String(r["token"])}`,
          },
        ] as const;
      }),
    );

    const grain = hours <= 24 ? "hour" : hours <= 24 * 60 ? "day" : "month";
    const buckets = new Map<string, { views: number; visitors: Set<string> }>();
    const pages = new Map<string, { views: number; visitors: Set<string> }>();
    const referrers = new Map<string, number>();
    const devices = new Map<string, { views: number; visitors: Set<string> }>();
    const links = new Map<string, { views: number; visitors: Set<string> }>();
    const allVisitors = new Set<string>();
    const slices: Record<string, Map<string, { views: number; visitors: Set<string> }>> = {
      countries: new Map(),
      regions: new Map(),
      cities: new Map(),
      browsers: new Map(),
      operatingSystems: new Map(),
      languages: new Map(),
      timezones: new Map(),
      screens: new Map(),
      hourOfDay: new Map(),
      dayOfWeek: new Map(),
    };
    const addSlice = (name: string, key: string, visitor: string) => {
      const map = slices[name]!;
      const entry = map.get(key) ?? { views: 0, visitors: new Set<string>() };
      entry.views += 1;
      entry.visitors.add(visitor);
      map.set(key, entry);
    };
    const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let botViews = 0;
    let totalSeconds = 0;

    for (const row of rows ?? []) {
      const iso = String(row.created_at);
      const period =
        grain === "hour"
          ? `${iso.slice(11, 13)}:00`
          : grain === "day"
            ? iso.slice(5, 10)
            : iso.slice(0, 7);
      const visitor = String(row.visitor_id || iso);
      allVisitors.add(visitor);

      const b = buckets.get(period) ?? { views: 0, visitors: new Set<string>() };
      b.views += 1;
      b.visitors.add(visitor);
      buckets.set(period, b);

      const path = String(row.path || "/");
      const p = pages.get(path) ?? { views: 0, visitors: new Set<string>() };
      p.views += 1;
      p.visitors.add(visitor);
      pages.set(path, p);

      const device = String((row as { device_type?: string }).device_type || "") || "Unknown";
      const d = devices.get(device) ?? { views: 0, visitors: new Set<string>() };
      d.views += 1;
      d.visitors.add(visitor);
      devices.set(device, d);

      const token = String((row as { share_token?: string }).share_token || "");
      if (token) {
        const l = links.get(token) ?? { views: 0, visitors: new Set<string>() };
        l.views += 1;
        l.visitors.add(visitor);
        links.set(token, l);
      }

      const r = row as Record<string, unknown>;
      if (r["is_bot"] === true) botViews += 1;
      const seconds = Number(r["duration_seconds"] ?? 0) || 0;
      totalSeconds += seconds;
      addSlice("countries", countryName(String(r["country"] || "")), visitor);
      addSlice("regions", String(r["region"] || "") || "Unknown", visitor);
      addSlice("cities", String(r["city"] || "") || "Unknown", visitor);
      addSlice("browsers", String(r["browser"] || "") || "Unknown", visitor);
      addSlice("operatingSystems", String(r["os"] || "") || "Unknown", visitor);
      addSlice("languages", String(r["language"] || "") || "Unknown", visitor);
      addSlice("timezones", String(r["timezone"] || "") || "Unknown", visitor);
      addSlice("screens", String(r["screen_size"] || "") || "Unknown", visitor);
      addSlice("hourOfDay", `${iso.slice(11, 13)}:00`, visitor);
      addSlice("dayOfWeek", DAYS[new Date(iso).getUTCDay()] ?? "Unknown", visitor);

      const ref = String(row.referrer || "");
      let source = "Direct";
      if (ref) {
        try {
          source = new URL(ref).hostname.replace(/^www\./, "");
        } catch {
          source = ref.slice(0, 40);
        }
      }
      referrers.set(source, (referrers.get(source) ?? 0) + 1);
    }

    // Returning = this browser was already seen before the selected period.
    let returningVisitors = 0;
    for (const visitor of allVisitors) if (priorVisitors.has(visitor)) returningVisitors += 1;

    const totalViews = rows?.length ?? 0;

    const sliceOut = (name: string, sortByKey = false): AnalyticsSlice[] =>
      [...slices[name]!.entries()]
        .map(([key, v]) => ({ key, views: v.views, visitors: v.visitors.size }))
        .sort((a, b) => (sortByKey ? a.key.localeCompare(b.key) : b.views - a.views));

    return {
      botViews,
      totalViews,
      totalVisitors: allVisitors.size,
      newVisitors: allVisitors.size - returningVisitors,
      returningVisitors,
      viewsPerVisitor: allVisitors.size ? Number((totalViews / allVisitors.size).toFixed(1)) : 0,
      totalSeconds,
      avgSecondsPerVisit: totalViews ? Math.round(totalSeconds / totalViews) : 0,
      avgSecondsPerVisitor: allVisitors.size ? Math.round(totalSeconds / allVisitors.size) : 0,
      buckets: [...buckets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, v]) => ({ period, views: v.views, visitors: v.visitors.size })),
      pages: [...pages.entries()]
        .map(([path, v]) => ({ path, views: v.views, visitors: v.visitors.size }))
        .sort((a, b) => b.views - a.views),
      referrers: [...referrers.entries()]
        .map(([source, views]) => ({ source, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 8),
      devices: [...devices.entries()]
        .map(([device, v]) => ({ device, views: v.views, visitors: v.visitors.size }))
        .sort((a, b) => b.views - a.views),
      shareLinks: [...links.entries()]
        .map(([token, v]) => ({
          token,
          label: linkInfo.get(token)?.label ?? "Revoked link",
          url: linkInfo.get(token)?.url ?? "",
          views: v.views,
          visitors: v.visitors.size,
        }))
        .sort((a, b) => b.views - a.views),
      countries: sliceOut("countries"),
      regions: sliceOut("regions"),
      cities: sliceOut("cities"),
      browsers: sliceOut("browsers"),
      operatingSystems: sliceOut("operatingSystems"),
      languages: sliceOut("languages"),
      timezones: sliceOut("timezones"),
      screens: sliceOut("screens"),
      hourOfDay: sliceOut("hourOfDay", true),
      dayOfWeek: sliceOut("dayOfWeek"),
    };
  });
