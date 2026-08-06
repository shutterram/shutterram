import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Redo2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mix } from "@/lib/theme-css";
import { FloatingSaveBar } from "@/components/admin/FloatingSaveBar";

type Row = {
  id: string;
  token: string;
  label: string;
  group_label: string;
  hint: string;
  dark_value: string;
  dark_opacity: number;
  light_value: string;
  light_opacity: number;
  default_dark_value: string | null;
  default_dark_opacity: number | null;
  default_light_value: string | null;
  default_light_opacity: number | null;
  sort_order: number;
};

type Snapshot = Pick<Row, "dark_value" | "dark_opacity" | "light_value" | "light_opacity">;
type History = Record<string, { past: Snapshot[]; future: Snapshot[] }>;

const hex = (v: string) => (/^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim() : "#808080");

const snap = (r: Row): Snapshot => ({
  dark_value: r.dark_value,
  dark_opacity: r.dark_opacity,
  light_value: r.light_value,
  light_opacity: r.light_opacity,
});

const iconBtn =
  "inline-flex size-7 items-center justify-center border border-hairline text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground";

/** Dark / light colour and intensity controls for every design token. */
export function ThemeStudio() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [history, setHistory] = useState<History>({});

  useEffect(() => {
    void supabase
      .from("theme_tokens" as never)
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setRows((data ?? []) as unknown as Row[]);
      });
  }, []);

  if (!rows) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }

  /** Applies a change and records the previous values so it can be undone. */
  const set = (id: string, patch: Partial<Row>) => {
    const current = rows.find((r) => r.id === id);
    if (!current) return;
    setHistory((h) => ({
      ...h,
      [id]: { past: [...(h[id]?.past ?? []), snap(current)], future: [] },
    }));
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty(true);
  };

  const undo = (id: string) => {
    const entry = history[id];
    const current = rows.find((r) => r.id === id);
    if (!entry?.past.length || !current) return;
    const previous = entry.past[entry.past.length - 1]!;
    setHistory((h) => ({
      ...h,
      [id]: { past: entry.past.slice(0, -1), future: [snap(current), ...entry.future] },
    }));
    setRows(rows.map((r) => (r.id === id ? { ...r, ...previous } : r)));
    setDirty(true);
  };

  const redo = (id: string) => {
    const entry = history[id];
    const current = rows.find((r) => r.id === id);
    if (!entry?.future.length || !current) return;
    const next = entry.future[0]!;
    setHistory((h) => ({
      ...h,
      [id]: { past: [...entry.past, snap(current)], future: entry.future.slice(1) },
    }));
    setRows(rows.map((r) => (r.id === id ? { ...r, ...next } : r)));
    setDirty(true);
  };

  const reset = (id: string) => {
    const current = rows.find((r) => r.id === id);
    if (!current) return;
    set(id, {
      dark_value: current.default_dark_value ?? current.dark_value,
      dark_opacity: current.default_dark_opacity ?? current.dark_opacity,
      light_value: current.default_light_value ?? current.light_value,
      light_opacity: current.default_light_opacity ?? current.light_opacity,
    });
  };

  const resetAll = () => {
    if (!rows) return;
    setHistory((h) => {
      const next: History = { ...h };
      for (const r of rows)
        next[r.id] = { past: [...(h[r.id]?.past ?? []), snap(r)], future: [] };
      return next;
    });
    setRows(
      rows.map((r) => ({
        ...r,
        dark_value: r.default_dark_value ?? r.dark_value,
        dark_opacity: r.default_dark_opacity ?? r.dark_opacity,
        light_value: r.default_light_value ?? r.light_value,
        light_opacity: r.default_light_opacity ?? r.light_opacity,
      })),
    );
    setDirty(true);
  };

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("theme_tokens" as never).upsert(rows as never);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setDirty(false);
      toast.success("Colours saved — reload the site to see them");
    }
  }

  const groups = [...new Set(rows.map((r) => r.group_label))];
  const valueKey = mode === "dark" ? "dark_value" : "light_value";
  const opacityKey = mode === "dark" ? "dark_opacity" : "light_opacity";

  return (
    <div className="space-y-10 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
          Every colour on the site, with a separate value for dark mode and light mode. Intensity
          controls how strong a colour is — use it to soften lines, borders and the hover glow.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetAll}
            className="border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-foreground"
          >
            Reset all
          </button>
          <div className="flex border border-hairline">
            {(["dark", "light"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={
                  "px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors " +
                  (mode === m ? "bg-foreground text-background" : "text-muted-foreground")
                }
              >
                {m} mode
              </button>
            ))}
          </div>
        </div>
      </div>

      {groups.map((group) => (
        <section key={group} className="border-t border-hairline pt-8">
          <p className="eyebrow">{group}</p>
          <div className="mt-6 space-y-6">
            {rows
              .filter((r) => r.group_label === group)
              .map((r) => {
                const value = String(r[valueKey] ?? "");
                const opacity = Number(r[opacityKey] ?? 100);
                const entry = history[r.id];
                return (
                  <div
                    key={r.id}
                    className="grid items-center gap-4 sm:grid-cols-[13rem_auto_1fr_auto] "
                  >
                    <div className="min-w-0">
                      <p className="text-sm">{r.label}</p>
                      {r.hint ? (
                        <p className="text-xs text-muted-foreground">{r.hint}</p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={hex(value)}
                        onChange={(e) => set(r.id, { [valueKey]: e.target.value } as Partial<Row>)}
                        className="size-9 cursor-pointer border border-hairline bg-transparent p-0"
                        aria-label={`${r.label} colour`}
                      />
                      <input
                        value={value}
                        onChange={(e) => set(r.id, { [valueKey]: e.target.value } as Partial<Row>)}
                        className="w-28 border-b border-hairline bg-transparent py-1 text-xs outline-none focus:border-foreground"
                      />
                      <span
                        className="size-9 border border-hairline"
                        style={{
                          background:
                            "repeating-conic-gradient(var(--surface-2) 0% 25%, var(--surface) 0% 50%) 0 0 / 10px 10px",
                        }}
                      >
                        <span
                          className="block size-full"
                          style={{ background: mix(value, opacity) }}
                        />
                      </span>
                    </div>

                    <label className="flex items-center gap-3 text-xs text-muted-foreground">
                      Intensity
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={opacity}
                        onChange={(e) =>
                          set(r.id, { [opacityKey]: Number(e.target.value) } as Partial<Row>)
                        }
                        className="w-40 accent-foreground"
                      />
                      <span className="tabular-nums">{opacity}%</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => undo(r.id)}
                        disabled={!entry?.past.length}
                        title="Undo"
                        aria-label={`Undo ${r.label}`}
                        className={iconBtn}
                      >
                        <Undo2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => redo(r.id)}
                        disabled={!entry?.future.length}
                        title="Redo"
                        aria-label={`Redo ${r.label}`}
                        className={iconBtn}
                      >
                        <Redo2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => reset(r.id)}
                        title="Reset to default"
                        aria-label={`Reset ${r.label}`}
                        className={iconBtn}
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      ))}

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="inline-flex items-center gap-2 border border-foreground bg-foreground px-6 py-2.5 text-[0.625rem] tracking-[0.2em] uppercase text-background disabled:opacity-50"
      >
        {saving ? <Loader2 className="size-3 animate-spin" /> : null}
        Save colours
      </button>

      {dirty ? (
        <FloatingSaveBar onClick={() => void save()} saving={saving} label="Save colours" />
      ) : null}
    </div>
  );
}
