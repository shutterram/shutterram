import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { findOrphanFiles, deleteImageFiles, type OrphanReport } from "@/lib/storage.functions";
import { Toggle } from "./Toggle";
import { StorageBrowser } from "./StorageBrowser";

function size(bytes: number) {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Finds image files sitting in storage that nothing on the site points at any
 * more, and lets the admin clear them out to reclaim space.
 */
export function StorageCleanup() {
  const scan = useServerFn(findOrphanFiles);
  const purge = useServerFn(deleteImageFiles);
  const [report, setReport] = useState<OrphanReport | null>(null);
  const [keepHistory, setKeepHistory] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<"" | "scan" | "delete">("");

  async function run() {
    setBusy("scan");
    try {
      const result = await scan({ data: { keepHistory } });
      setReport(result);
      setSelected(result.orphans.map((o) => o.key));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not scan storage");
    }
    setBusy("");
  }

  async function remove() {
    if (!selected.length) return;
    if (!confirm(`Permanently delete ${selected.length} file(s)? This cannot be undone.`)) return;
    setBusy("delete");
    try {
      await purge({ data: { keys: selected } });
      toast.success(`${selected.length} file(s) deleted`);
      setReport(
        report
          ? { ...report, orphans: report.orphans.filter((o) => !selected.includes(o.key)) }
          : null,
      );
      setSelected([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete those files");
    }
    setBusy("");
  }

  const freed = (report?.orphans ?? [])
    .filter((o) => selected.includes(o.key))
    .reduce((sum, o) => sum + o.size, 0);

  return (
    <div className="space-y-6 pb-10">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Photos removed from the site leave their original file behind in storage, so older
        templates and versions keep working. Scan here to see what is no longer used anywhere and
        clear it out.
      </p>

      <Toggle
        checked={keepHistory}
        onChange={setKeepHistory}
        label="Protect files still used by saved versions and history"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy !== ""}
          className="inline-flex items-center gap-2 border border-foreground bg-foreground px-6 py-3 text-[0.625rem] tracking-[0.24em] uppercase text-background transition-opacity hover:opacity-85 disabled:opacity-50"
        >
          {busy === "scan" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <RefreshCw className="size-3" />
          )}
          Scan storage
        </button>
        {report ? (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy !== "" || !selected.length}
            className="inline-flex items-center gap-2 border border-hairline px-6 py-3 text-[0.625rem] tracking-[0.24em] uppercase transition-colors hover:border-destructive hover:text-destructive disabled:opacity-40"
          >
            {busy === "delete" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Trash2 className="size-3" />
            )}
            Delete selected ({selected.length}) · {size(freed)}
          </button>
        ) : null}
      </div>

      {report ? (
        <div className="border border-hairline">
          <div className="flex flex-wrap gap-6 border-b border-hairline p-5 text-xs text-muted-foreground">
            <span>{report.totalFiles} files in storage</span>
            <span>{report.usedFiles} in use</span>
            <span>{report.orphans.length} unused</span>
          </div>
          {report.orphans.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              Nothing to clean up — every file is still being used.
            </p>
          ) : (
          <ul className="divide-y divide-hairline">
              {report.orphans.map((file) => (
                <li key={file.key} className="flex items-center gap-4 p-4">
                  <label className="flex cursor-pointer items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selected.includes(file.key)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked ? [...prev, file.key] : prev.filter((k) => k !== file.key),
                        )
                      }
                      className="size-4 cursor-pointer border border-hairline bg-transparent accent-foreground"
                    />
                  </label>
                  <img
                    src={`/api/public/img/${file.key}`}
                    alt=""
                    loading="lazy"
                    className="size-12 shrink-0 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs">{file.key}</p>
                    <p className="text-[0.625rem] text-muted-foreground">
                      {size(file.size)}
                      {file.updatedAt ? ` · ${new Date(file.updatedAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <StorageBrowser />
    </div>
  );
}
