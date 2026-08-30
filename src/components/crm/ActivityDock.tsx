import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { Activity, ChevronRight, Loader2 } from "lucide-react";
import { crmList } from "@/lib/crm.functions";

type Entry = { id: string; kind: string; message: string; entity_type: string; created_at: string };

const OPEN_KEY = "crm.activity.open";

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Right-hand activity rail for the CRM — a live feed of everything that changed. */
export function ActivityDock() {
  const listFn = useServerFn(crmList);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      setOpen(localStorage.getItem(OPEN_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const rows = await listFn({
        data: { table: "crm_activity", orderBy: "created_at", ascending: false, limit: 200 },
      });
      setEntries(
        rows.map((r) => ({
          id: String(r["id"]),
          kind: String(r["kind"] ?? ""),
          message: String(r["message"] ?? ""),
          entity_type: String(r["entity_type"] ?? ""),
          created_at: String(r["created_at"] ?? new Date().toISOString()),
        })),
      );
    } catch {
      setEntries([]);
    }
  }, [listFn]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle() {
    setOpen((v) => {
      try {
        localStorage.setItem(OPEN_KEY, v ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !v;
    });
  }

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed top-1/2 right-0 z-[90] flex max-h-[80vh] -translate-y-1/2 items-start">
      {open ? (
        <div className="pointer-events-auto flex max-h-[80vh] w-[19rem] flex-col border border-hairline bg-background/95 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
            <p className="text-[0.625rem] tracking-[0.24em] uppercase">Activity</p>
            <button
              type="button"
              onClick={toggle}
              aria-label="Collapse activity"
              className="p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!entries ? (
              <p className="flex items-center gap-2 px-4 py-6 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Loading…
              </p>
            ) : entries.length === 0 ? (
              <p className="px-4 py-6 text-xs text-muted-foreground">Nothing has happened yet.</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {entries.map((e) => (
                  <li key={e.id} className="px-4 py-3">
                    <p className="text-sm">{e.message}</p>
                    <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
                      {e.entity_type ? `${e.entity_type} · ` : ""}
                      {when(e.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-end border-t border-hairline px-4 py-2">
            <button
              type="button"
              onClick={() => void load()}
              className="text-[0.625rem] tracking-[0.12em] uppercase text-muted-foreground transition-colors hover:text-foreground"
            >
              Refresh
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={toggle}
          aria-label="Open activity"
          className="pointer-events-auto flex items-center gap-2 border border-hairline border-r-0 bg-background/95 px-2 py-4 text-[0.625rem] tracking-[0.24em] uppercase shadow-lg backdrop-blur transition-colors hover:border-foreground"
        >
          <Activity className="size-4" />
          <span className="[writing-mode:vertical-rl]">Activity</span>
        </button>
      )}
    </div>,
    document.body,
  );
}
