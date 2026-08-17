import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { Loader2, Download, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createVersion,
  deleteVersion,
  downloadVersion,
  getChanges,
  getVersions,
  restoreVersion,
} from "@/lib/templates.functions";
import type { ChangeEntry, SiteVersion } from "@/lib/templates.server";
import { TABLE_LABELS, scopeById } from "@/lib/template-scopes";

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const OP_LABEL: Record<string, string> = {
  INSERT: "Added",
  UPDATE: "Edited",
  DELETE: "Removed",
};

const KIND_LABEL: Record<string, string> = {
  auto: "Automatic",
  manual: "Saved by you",
  import: "Template loaded",
  restore: "Rolled back",
  "pre-restore": "Before a change",
};

/** Version history: every change is logged, and any version can be restored. */
export function HistoryPanel() {
  const fetchVersions = useServerFn(getVersions);
  const fetchChanges = useServerFn(getChanges);
  const saveNow = useServerFn(createVersion);
  const rollTo = useServerFn(restoreVersion);
  const removeVersion = useServerFn(deleteVersion);
  const grabVersion = useServerFn(downloadVersion);
  const router = useRouter();

  const [versions, setVersions] = useState<SiteVersion[] | null>(null);
  const [changes, setChanges] = useState<ChangeEntry[] | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const [v, c] = await Promise.all([fetchVersions({}), fetchChanges({ data: { limit: 120 } })]);
      setVersions(v);
      setChanges(c);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load history");
      setVersions([]);
      setChanges([]);
    }
  }, [fetchVersions, fetchChanges]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key);
    try {
      await fn();
      toast.success(done);
      await load();
      void router.invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
    setBusy("");
  }

  if (!versions || !changes) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-10">
      <div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Every edit is logged below, and the site is snapshotted automatically as you work. Pick
          any version to roll the site back — or forward again, since the state before each restore
          is saved too.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Name this version…"
            className="w-full max-w-xs border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground"
          />
          <button
            type="button"
            disabled={busy !== ""}
            onClick={() =>
              void run(
                "save",
                () => saveNow({ data: { label: label.trim() || "Manual snapshot", scope: "all" } }),
                "Version saved",
              ).then(() => setLabel(""))
            }
            className="inline-flex items-center gap-2 border border-foreground bg-foreground px-6 py-3 text-[0.625rem] tracking-[0.24em] uppercase text-background transition-opacity hover:opacity-85 disabled:opacity-50"
          >
            {busy === "save" ? <Loader2 className="size-3 animate-spin" /> : null}
            Save a version now
          </button>
        </div>
      </div>

      <section>
        <p className="eyebrow">Versions</p>
        {versions.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No versions saved yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-hairline border-y border-hairline">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{v.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {when(v.createdAt)} · {KIND_LABEL[v.kind] ?? v.kind} ·{" "}
                    {scopeById(v.scope)?.label ?? v.scope}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy !== ""}
                    onClick={() =>
                      void run(
                        `dl-${v.id}`,
                        async () => {
                          const file = await grabVersion({ data: { id: v.id } });
                          const blob = new Blob([JSON.stringify(file, null, 2)], {
                            type: "application/json",
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `shutterram-version-${v.createdAt.slice(0, 10)}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        },
                        "Version downloaded",
                      )
                    }
                    className="inline-flex items-center gap-2 border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground disabled:opacity-50"
                  >
                    <Download className="size-3" /> Download
                  </button>
                  <button
                    type="button"
                    disabled={busy !== ""}
                    onClick={() => {
                      if (!confirm(`Roll the site to “${v.label}”?`)) return;
                      void run(`r-${v.id}`, () => rollTo({ data: { id: v.id } }), "Site rolled");
                    }}
                    className="inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase text-background transition-opacity hover:opacity-85 disabled:opacity-50"
                  >
                    {busy === `r-${v.id}` ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <RotateCcw className="size-3" />
                    )}
                    Roll to this
                  </button>
                  <button
                    type="button"
                    disabled={busy !== ""}
                    onClick={() => {
                      if (!confirm("Delete this version?")) return;
                      void run(
                        `d-${v.id}`,
                        () => removeVersion({ data: { id: v.id } }),
                        "Version deleted",
                      );
                    }}
                    className="border border-hairline p-2 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
                    aria-label="Delete version"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="eyebrow">Change log</p>
        {changes.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nothing has changed yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
            {changes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 text-sm">
                <span className="text-[0.625rem] tracking-[0.2em] uppercase text-muted-foreground">
                  {when(c.createdAt)}
                </span>
                <span>{OP_LABEL[c.op] ?? c.op}</span>
                <span className="text-muted-foreground">
                  {TABLE_LABELS[c.table] ?? c.table}
                  {c.title ? ` — ${c.title}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
