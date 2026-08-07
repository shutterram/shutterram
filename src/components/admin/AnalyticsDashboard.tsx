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
  { id: "5h", label: "Last 5 hours" },
  { id: "24h", label: "Last 24 hours" },
  { id: "7d", label: "Last 7 days" },
  { id: "month", label: "Last 30 days" },
  { id: "year", label: "Last 12 months" },
  { id: "all", label: "All time" },
] as const;

type Range = (typeof RANGES)[number]["id"];

function Metric({
  value,
  label,
  hint,
}: {
  value: number | string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="border border-hairline p-6">
      <p className="font-display text-4xl leading-none">{value}</p>
      <p className="eyebrow mt-3">{label}</p>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const tooltipStyle = {
  background: "var(--color-background)",
  border: "1px solid var(--color-hairline, rgba(128,128,128,.3))",
  fontSize: 12,
} as const;

/** A ranked breakdown with a proportional bar behind each row. */
function SliceList({
  title,
  rows,
  limit = 10,
}: {
  title: string;
  rows: { key: string; views: number; visitors: number }[];
  limit?: number;
}) {
  const top = rows.slice(0, limit);
  const max = top[0]?.views ?? 1;
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <div className="mt-4 space-y-2 text-sm">
        {top.map((r) => (
          <div key={r.key} className="relative border border-hairline px-3 py-2">
            <span
              className="absolute inset-y-0 left-0 bg-foreground/10"
              style={{ width: `${Math.max(4, (r.views / max) * 100)}%` }}
              aria-hidden
            />
            <span className="relative flex items-center justify-between gap-3">
              <span className="truncate">{r.key}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {r.views} · {r.visitors}
              </span>
            </span>
          </div>
        ))}
        {top.length === 0 ? <p className="text-muted-foreground">Nothing yet.</p> : null}
      </div>
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
        cookies, no personal data — just a random id per browser and the device type (mobile,
        tablet or desktop) so repeat visits aren't counted twice.
        <br />
        <strong className="text-foreground">Unique visitors</strong> is how many different browsers
        opened the site in the selected period. Each of those is either{" "}
        <strong className="text-foreground">new</strong> (never seen before this period) or{" "}
        <strong className="text-foreground">returning</strong> (seen earlier too) — so new +
        returning always equals unique. Your own visits from every browser, phone and preview
        window count too, as do search-engine crawlers, which is usually why the number is higher
        than the people you shared links with.
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
            <Metric value={data.viewsPerVisitor} label="Views per visitor" />
            <Metric value={data.countries.length} label="Countries" />
            <Metric value={data.botViews} label="Bot / preview views" />
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

          <section>
            <p className="eyebrow">Devices</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {data.devices.map((d) => (
                <div key={d.device} className="border border-hairline p-5">
                  <p className="font-display text-2xl capitalize leading-none">{d.device}</p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {d.views} views · {d.visitors} visitors
                  </p>
                </div>
              ))}
              {data.devices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No visits recorded yet.</p>
              ) : null}
            </div>
          </section>

          <section>
            <p className="eyebrow">Where in the world</p>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Approximate location supplied by the hosting network from the connection itself — no
              cookies, no stored addresses. Cities are only as accurate as the visitor's network.
            </p>
            <div className="mt-6 grid gap-8 md:grid-cols-3">
              <SliceList title="Countries" rows={data.countries} />
              <SliceList title="Regions / states" rows={data.regions} />
              <SliceList title="Cities" rows={data.cities} />
            </div>
          </section>

          <section>
            <p className="eyebrow">Browsers, systems & screens</p>
            <div className="mt-6 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
              <SliceList title="Browsers" rows={data.browsers} />
              <SliceList title="Operating systems" rows={data.operatingSystems} />
              <SliceList title="Screen sizes" rows={data.screens} />
              <SliceList title="Languages" rows={data.languages} />
            </div>
          </section>

          <section>
            <p className="eyebrow">When people visit</p>
            <div className="mt-6 grid gap-10 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-xs text-muted-foreground">By hour (UTC)</p>
                <div className="h-56 w-full text-muted-foreground">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.hourOfDay}>
                      <CartesianGrid strokeOpacity={0.12} vertical={false} />
                      <XAxis dataKey="key" {...axis} tickLine={false} interval={1} />
                      <YAxis allowDecimals={false} {...axis} tickLine={false} width={32} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="views" fill="currentColor" fillOpacity={0.6} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs text-muted-foreground">By day of the week</p>
                <div className="h-56 w-full text-muted-foreground">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.dayOfWeek} layout="vertical">
                      <CartesianGrid strokeOpacity={0.12} horizontal={false} />
                      <XAxis type="number" allowDecimals={false} {...axis} tickLine={false} />
                      <YAxis type="category" dataKey="key" width={90} {...axis} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="views" fill="currentColor" fillOpacity={0.6} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <SliceList title="Visitor time zones" rows={data.timezones} />
              <div>
                <p className="eyebrow">Automated traffic</p>
                <p className="mt-4 text-sm text-muted-foreground">
                  {data.botViews} of {data.totalViews} views in this period look like search-engine
                  crawlers or link previews rather than people.
                </p>
              </div>
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

          <section>
            <p className="eyebrow">Share links</p>
            <div className="mt-4 divide-y divide-hairline border-y border-hairline text-sm">
              {data.shareLinks.map((l) => (
                <div key={l.token} className="flex items-start justify-between gap-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate">{l.label}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {l.url}
                    </span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {l.views} views · {l.visitors} visitors
                  </span>
                </div>
              ))}
              {data.shareLinks.length === 0 ? (
                <p className="py-3 text-muted-foreground">
                  No visits through a share link yet in this period.
                </p>
              ) : null}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
