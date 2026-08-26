import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { browseStorage, deleteStorageFiles, type BrowseResult } from "@/lib/storage-usage.functions";

const AREAS = [
  { bucket: "crm-galleries", label: "Client galleries" },
  { bucket: "site-images", label: "Website images" },
  { bucket: "crm-docs", label: "Contracts & documents" },
];

function bytes(n: number) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/**
 * Browse every file in any storage area — including generated gallery
 * thumbnails and opened previews — and delete what is no longer wanted.
 */
export function StorageBrowser() {
  const browse = useServerFn(browseStorage);
  const purge = useServerFn(deleteStorageFiles);
  const [bucket, setBucket] = useState(AREAS[0]!.bucket);
  const [result, setResult] = useState<BrowseResult | null>(null);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<"" | "load" | "delete">("");

  async function load(next = bucket) {
    setBusy("load");
    setSelected([]);
    try {
      setResult(await browse({ data: { bucket: next } }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that storage area");
    }
    setBusy("");
  }

  useEffect(() => {
    void load(bucket);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket]);

  const files = (result?.files ?? []).filter((f) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return f.path.toLowerCase().includes(q) || f.label.toLowerCase().includes(q) || f.kind.toLowerCase().includes(q);
  });

  const freed = files.filter((f) => selected.includes(f.path)).reduce((s, f) => s + f.size, 0);

  function toggleAll() {
    setSelected(selected.length === files.length ? [] : files.map((f) => f.path));
  }

  async function remove() {
    if (!selected.length) return;
    if (!confirm(`Permanently delete ${selected.length} file(s) from ${result?.label}? This cannot be undone.`))
      return;
    setBusy("delete");
    try {
      await purge({ data: { bucket, paths: selected } });
      toast.success(`${selected.length} file(s) deleted`);
      setResult(
        result ? { ...result, files: result.files.filter((f) => !selected.includes(f.path)) } : null,
      );
      setSelected([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete those files");
    }
    setBusy("");
  }

  return (
    <div className="space-y-5 border-t border-hairline pt-8">
      <div>
        <h3 className="text-[0.625rem] tracking-[0.24em] uppercase text-muted-foreground">
          Browse all storage
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Every file currently stored — including gallery thumbnails and opened previews generated
          for Drive-linked galleries. Deleted previews are rebuilt automatically the next time a
          gallery is opened, or with <em>Rebuild previews</em>.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {AREAS.map((a) => (
          <button
            key={a.bucket}
            type="button"
            onClick={() => setBucket(a.bucket)}
            className={`border px-4 py-2 text-[0.625rem] tracking-[0.24em] uppercase transition-colors ${
              bucket === a.bucket ? "border-foreground bg-foreground text-background" : "border-hairline hover:border-foreground"
            }`}
          >
            {a.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load()}
          disabled={busy !== ""}
          className="inline-flex items-center gap-2 border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.24em] uppercase transition-colors hover:border-foreground disabled:opacity-50"
        >
          {busy === "load" ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name, gallery or type (e.g. preview)"
          className="min-w-[16rem] flex-1 border-0 border-b border-hairline bg-transparent px-0 py-2 text-sm outline-none focus:border-foreground"
        />
        <button
          type="button"
          onClick={toggleAll}
          disabled={!files.length}
          className="border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.24em] uppercase transition-colors hover:border-foreground disabled:opacity-40"
        >
          {selected.length === files.length && files.length ? "Clear selection" : `Select all (${files.length})`}
        </button>
        <button
          type="button"
          onClick={() => void remove()}
          disabled={busy !== "" || !selected.length}
          className="inline-flex items-center gap-2 border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.24em] uppercase transition-colors hover:border-destructive hover:text-destructive disabled:opacity-40"
        >
          {busy === "delete" ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
          Delete selected ({selected.length}) · {bytes(freed)}
        </button>
      </div>

      {result ? (
        <div className="border border-hairline">
          <div className="flex flex-wrap gap-6 border-b border-hairline p-4 text-xs text-muted-foreground">
            <span>{result.files.length.toLocaleString()} files</span>
            <span>{bytes(result.totalBytes)} total</span>
            {result.truncated ? <span>Showing the first several thousand files</span> : null}
          </div>
          {files.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Nothing here.</p>
          ) : (
            <ul className="max-h-[32rem] divide-y divide-hairline overflow-y-auto">
              {files.slice(0, 600).map((f) => (
                <li key={f.path} className="flex items-center gap-4 p-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(f.path)}
                    onChange={(e) =>
                      setSelected((prev) =>
                        e.target.checked ? [...prev, f.path] : prev.filter((p) => p !== f.path),
                      )
                    }
                    className="size-4 shrink-0 cursor-pointer border border-hairline bg-transparent accent-foreground"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs">{f.path}</p>
                    <p className="text-[0.625rem] text-muted-foreground">
                      {f.label} · {f.kind}
                      {f.updatedAt ? ` · ${new Date(f.updatedAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {bytes(f.size)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {files.length > 600 ? (
            <p className="border-t border-hairline p-3 text-xs text-muted-foreground">
              Showing the 600 largest matches — narrow the filter to see more.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
