import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getSiteAnalytics, type AnalyticsPayload } from "@/lib/analytics.functions";

const RANGES = [
  { id: "month", label: "Last 30 days" },
  { id: "year", label: "Last 12 months" },
  { id: "all", label: "All time" },
] as const;

type Range = (typeof RANGES)[number]["id"];

function Metric({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="border border-hairline p-6">
      <p className="font-display text-4xl leading-none">{value}</p>
      <p className="eyebrow mt-3">{label}</p>
    </div>
  );
}

/** Overview dashboard: visits, visitors, per-page counts and traffic sources. */
export function AnalyticsDashboard() {
  const fetchStats = useServerFn(getSiteAnalytics);
  const [range, setRange] = useState<Range>("month");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    void (async () => {
      try {
        const result = await fetchStats({ data: { range } });
        if (live) setData(result);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load statistics");
      }
      if (live) setLoading(false);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const axis = { stroke: "currentColor", fontSize: 11, opacity: 0.6 } as const;

  return (
    <div className="space-y-10 pb-20">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Anonymous visit counts for every page on the site, including pages you add later. No
        cookies, no personal data — just a random id per browser so repeat visits aren't counted
        twice.
      </p>

      <div className="flex flex-wrap gap-3">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={
              "border px-6 py-3 text-[0.625rem] tracking-[0.24em] uppercase transition-colors " +
              (range === r.id
                ? "border-foreground bg-foreground text-background"
                : "border-hairline text-muted-foreground hover:border-foreground hover:text-foreground")
            }
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading statistics…
        </div>
      ) : !data ? null : (
        <>
          <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-5">
            <Metric value={data.totalViews} label="Page views" />
            <Metric value={data.totalVisitors} label="Unique visitors" />
            <Metric value={data.newVisitors} label="New visitors" />
            <Metric value={data.returningVisitors} label="Returning visitors" />
            <Metric value={data.pages.length} label="Pages visited" />
          </div>

          <section>
            <p className="eyebrow">Views over time</p>
            <div className="mt-6 h-72 w-full text-muted-foreground">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.buckets}>
                  <defs>
                    <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeOpacity={0.12} vertical={false} />
                  <XAxis dataKey="period" {...axis} tickLine={false} />
                  <YAxis allowDecimals={false} {...axis} tickLine={false} width={32} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-background)",
                      border: "1px solid var(--color-hairline, rgba(128,128,128,.3))",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="currentColor"
                    fill="url(#viewsFill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    stroke="currentColor"
                    strokeDasharray="4 4"
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section>
            <p className="eyebrow">Most visited pages</p>
            <div className="mt-6 h-72 w-full text-muted-foreground">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.pages.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeOpacity={0.12} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} {...axis} tickLine={false} />
                  <YAxis type="category" dataKey="path" width={140} {...axis} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-background)",
                      border: "1px solid var(--color-hairline, rgba(128,128,128,.3))",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="views" fill="currentColor" fillOpacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="grid gap-10 md:grid-cols-2">
            <div>
              <p className="eyebrow">Every page</p>
              <div className="mt-4 divide-y divide-hairline border-y border-hairline text-sm">
                {data.pages.map((p) => (
                  <div key={p.path} className="flex items-center justify-between gap-4 py-3">
                    <span className="truncate">{p.path}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {p.views} views · {p.visitors} visitors
                    </span>
                  </div>
                ))}
                {data.pages.length === 0 ? (
                  <p className="py-3 text-muted-foreground">No visits recorded yet.</p>
                ) : null}
              </div>
            </div>
            <div>
              <p className="eyebrow">Where visitors came from</p>
              <div className="mt-4 divide-y divide-hairline border-y border-hairline text-sm">
                {data.referrers.map((r) => (
                  <div key={r.source} className="flex items-center justify-between gap-4 py-3">
                    <span className="truncate">{r.source}</span>
                    <span className="shrink-0 text-muted-foreground">{r.views} views</span>
                  </div>
                ))}
                {data.referrers.length === 0 ? (
                  <p className="py-3 text-muted-foreground">Nothing yet.</p>
                ) : null}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
