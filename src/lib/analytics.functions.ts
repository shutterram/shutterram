import { createServerFn } from "@tanstack/react-start";
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
  views: number;
  visitors: number;
}

export interface AnalyticsPayload {
  totalViews: number;
  totalVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  buckets: AnalyticsBucket[];
  pages: AnalyticsPage[];
  referrers: { source: string; views: number }[];
  shareLinks: AnalyticsShareLink[];
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
        | { path?: string; visitorId?: string; referrer?: string; shareToken?: string }
        | undefined,
    ) => ({
      path: String(input?.path ?? "/").slice(0, 200),
      visitorId: String(input?.visitorId ?? "").slice(0, 64),
      referrer: String(input?.referrer ?? "").slice(0, 200),
      shareToken: String(input?.shareToken ?? "").slice(0, 64),
    }),
  )
  .handler(async ({ data }) => {
    if (data.path.startsWith("/admin") || data.path.startsWith("/auth")) return { ok: true };
    if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_PUBLISHABLE_KEY"]) {
      return { ok: false };
    }
    const { error } = await publicClient()
      .from("page_views" as never)
      .insert({
        path: data.path,
        visitor_id: data.visitorId,
        referrer: data.referrer,
        share_token: data.shareToken,
      } as never);
    if (error) console.error("[analytics] insert failed", error.message);
    return { ok: !error };
  });

/** Admin-only statistics for the studio dashboard. */
export const getSiteAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { range?: string } | undefined) =>
    input?.range === "year" || input?.range === "all" ? { range: input.range } : { range: "month" },
  )
  .handler(async ({ data, context }): Promise<AnalyticsPayload> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const since = new Date();
    if (data.range === "month") since.setDate(since.getDate() - 30);
    else if (data.range === "year") since.setFullYear(since.getFullYear() - 1);
    else since.setFullYear(since.getFullYear() - 20);

    const { data: rows, error } = await context.supabase
      .from("page_views")
      .select("path,visitor_id,referrer,created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true })
      .limit(50000);
    if (error) throw new Error(error.message);

    const monthly = data.range !== "month";
    const buckets = new Map<string, { views: number; visitors: Set<string> }>();
    const pages = new Map<string, { views: number; visitors: Set<string> }>();
    const referrers = new Map<string, number>();
    const allVisitors = new Set<string>();

    for (const row of rows ?? []) {
      const iso = String(row.created_at);
      const period = monthly ? iso.slice(0, 7) : iso.slice(0, 10);
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

    return {
      totalViews: rows?.length ?? 0,
      totalVisitors: allVisitors.size,
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
    };
  });
