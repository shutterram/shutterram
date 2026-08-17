import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { History, Loader2, ChevronRight, Undo2, Redo2 } from "lucide-react";
import { toast } from "sonner";
import { getChanges, gotoChange } from "@/lib/templates.functions";
import type { ChangeEntry } from "@/lib/templates.server";
import { TABLE_LABELS } from "@/lib/template-scopes";

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

const OPEN_KEY = "studio.history.open";

/**
 * Lightroom-style history rail pinned to the right of the studio. Lists every
 * logged change; clicking one moves the site to that exact point. Ctrl+Z and
 * Ctrl+X step one change backward or forward.
 */
export function HistoryDock() {
  const fetchChanges = useServerFn(getChanges);
  const jumpTo = useServerFn(gotoChange);
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [changes, setChanges] = useState<ChangeEntry[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState<string>("");
  const busyRef = useRef(false);

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
      const res = await fetchChanges({ data: { limit: 200 } });
      setChanges(res.changes);
      setCursor(res.cursor ?? res.changes[0]?.id ?? null);
    } catch {
      setChanges([]);
    }
  }, [fetchChanges]);

  useEffect(() => {
    void load();
  }, [load]);

  const jump = useCallback(
    async (target: ChangeEntry) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(target.id);
      try {
        await jumpTo({ data: { id: target.id } });
        setCursor(target.id);
        toast.success("Site moved to that point");
        void router.invalidate();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not move the site");
      }
      setBusy("");
      busyRef.current = false;
    },
    [jumpTo, router],
  );

  const step = useCallback(
    (direction: 1 | -1) => {
      const list = changes ?? [];
      const i = Math.max(
        0,
        list.findIndex((c) => c.id === cursor),
      );
      const target = list[i + direction];
      if (!target) {
        toast.info(direction === 1 ? "Nothing older to undo to" : "Already at the latest change");
        return;
      }
      void jump(target);
    },
    [changes, cursor, jump],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable)
      )
        return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        step(1);
      } else if (key === "x" || key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        step(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

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
            <p className="text-[0.625rem] tracking-[0.24em] uppercase">History</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => step(1)}
                title="Undo (Ctrl+Z)"
                aria-label="Undo"
                className="p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Undo2 className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => step(-1)}
                title="Redo (Ctrl+X)"
                aria-label="Redo"
                className="p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Redo2 className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={toggle}
                aria-label="Collapse history"
                className="p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!changes ? (
              <p className="flex items-center gap-2 px-4 py-6 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Loading…
              </p>
            ) : changes.length === 0 ? (
              <p className="px-4 py-6 text-xs text-muted-foreground">Nothing has changed yet.</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {changes.map((c) => {
                  const here = c.id === cursor;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        disabled={busy !== ""}
                        onClick={() => void jump(c)}
                        className={
                          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors disabled:opacity-50 " +
                          (here ? "bg-foreground/5" : "hover:bg-foreground/5")
                        }
                      >
                        <span
                          className={
                            "size-1.5 shrink-0 " +
                            (here ? "bg-foreground" : "bg-muted-foreground/40")
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">
                            {OP_LABEL[c.op] ?? c.op} · {TABLE_LABELS[c.table] ?? c.table}
                            {c.title ? ` — ${c.title}` : ""}
                          </span>
                          <span className="mt-0.5 block text-[0.6875rem] text-muted-foreground">
                            {when(c.createdAt)}
                          </span>
                        </span>
                        {busy === c.id ? <Loader2 className="size-3 animate-spin" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-hairline px-4 py-2">
            <p className="text-[0.625rem] tracking-[0.12em] uppercase text-muted-foreground">
              Ctrl+Z undo · Ctrl+X redo
            </p>
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
          aria-label="Open history"
          className="pointer-events-auto flex items-center gap-2 border border-hairline border-r-0 bg-background/95 px-2 py-4 text-[0.625rem] tracking-[0.24em] uppercase shadow-lg backdrop-blur transition-colors hover:border-foreground"
        >
          <History className="size-4" />
          <span className="[writing-mode:vertical-rl]">History</span>
        </button>
      )}
    </div>,
    document.body,
  );
}
