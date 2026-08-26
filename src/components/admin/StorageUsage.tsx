import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getStorageUsage, type StorageUsageReport } from "@/lib/storage-usage.functions";

const FREE_TIER_BYTES = 1024 * 1024 * 1024;

function bytes(n: number) {
  if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

function Bar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.max(1, Math.round((value / total) * 100)) : 0;
  return (
    <div className="h-1 w-full bg-hairline">
      <div className="h-full bg-foreground" style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

/**
 * Clear overview of how much storage the whole site uses, with a per-bucket,
 * per-gallery and per-asset-kind breakdown plus the biggest files.
 */
export function StorageUsage() {
  const load = useServerFn(getStorageUsage);
  const [report, setReport] = useState<StorageUsageReport | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      setReport(await load({ data: undefined }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read storage usage");
    }
    setBusy(false);
  }

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const used = report?.totalBytes ?? 0;
  const pctOfFree = Math.min(100, Math.round((used / FREE_TIER_BYTES) * 1000) / 10);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Everything stored for this site — website images, client gallery thumbnails and opened
          previews, uploaded originals and contract documents. Drive-linked originals are not
          counted here because they stay in Google Drive.
        </p>
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy}
          className="inline-flex items-center gap-2 border border-hairline px-5 py-3 text-[0.625rem] tracking-[0.24em] uppercase transition-colors hover:border-foreground disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      {!report ? (
        <p className="text-sm text-muted-foreground">
          {busy ? "Measuring storage…" : "No reading yet."}
        </p>
      ) : (
        <>
          <div className="grid gap-px bg-hairline sm:grid-cols-3">
            <div className="bg-background p-6">
              <div className="text-3xl tabular-nums">{bytes(report.totalBytes)}</div>
              <div className="mt-2 text-[0.625rem] tracking-[0.24em] uppercase text-muted-foreground">
                Total stored
              </div>
            </div>
            <div className="bg-background p-6">
              <div className="text-3xl tabular-nums">{report.totalFiles.toLocaleString()}</div>
              <div className="mt-2 text-[0.625rem] tracking-[0.24em] uppercase text-muted-foreground">
                Files
              </div>
            </div>
            <div className="bg-background p-6">
              <div className="text-3xl tabular-nums">{pctOfFree}%</div>
              <div className="mt-2 text-[0.625rem] tracking-[0.24em] uppercase text-muted-foreground">
                Of a 1 GB plan
              </div>
              <div className="mt-3">
                <Bar value={used} total={FREE_TIER_BYTES} />
              </div>
            </div>
          </div>

          <section className="space-y-4">
            <h3 className="text-[0.625rem] tracking-[0.24em] uppercase text-muted-foreground">
              By area
            </h3>
            {report.buckets.map((b) => (
              <div key={b.bucket} className="space-y-3 border border-hairline p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm">{b.label}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {bytes(b.bytes)} · {b.files.toLocaleString()} files
                  </span>
                </div>
                <Bar value={b.bytes} total={report.totalBytes || 1} />
                {b.truncated ? (
                  <p className="text-xs text-muted-foreground">
                    Showing the first several thousand files only.
                  </p>
                ) : null}
                {b.groups.length ? (
                  <ul className="space-y-1 pt-2">
                    {b.groups.slice(0, 12).map((g) => (
                      <li
                        key={g.key}
                        className="flex items-baseline justify-between gap-4 text-xs text-muted-foreground"
                      >
                        <span className="truncate">{g.label}</span>
                        <span className="tabular-nums whitespace-nowrap">
                          {bytes(g.bytes)} · {g.files}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <h3 className="text-[0.625rem] tracking-[0.24em] uppercase text-muted-foreground">
              By file type
            </h3>
            <ul className="divide-y divide-hairline border border-hairline">
              {report.kinds.map((k) => (
                <li key={k.key} className="flex items-baseline justify-between gap-4 p-4 text-sm">
                  <span>{k.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {bytes(k.bytes)} · {k.files.toLocaleString()} files
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-[0.625rem] tracking-[0.24em] uppercase text-muted-foreground">
              Largest files
            </h3>
            <ul className="divide-y divide-hairline border border-hairline">
              {report.largest.map((f) => (
                <li
                  key={`${f.bucket}/${f.path}`}
                  className="flex items-baseline justify-between gap-4 p-3 text-xs"
                >
                  <span className="min-w-0 truncate text-muted-foreground">
                    {f.bucket}/{f.path}
                  </span>
                  <span className="tabular-nums whitespace-nowrap">{bytes(f.size)}</span>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-xs text-muted-foreground">
            Last measured {new Date(report.scannedAt).toLocaleString()}.
          </p>
        </>
      )}
    </div>
  );
}
