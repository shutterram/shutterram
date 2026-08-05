import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { mix } from "@/lib/theme-css";

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
  sort_order: number;
};

const hex = (v: string) => (/^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim() : "#808080");

/** Dark / light colour and intensity controls for every design token. */
export function ThemeStudio() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"dark" | "light">("dark");

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

  const set = (id: string, patch: Partial<Row>) =>
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("theme_tokens" as never).upsert(rows as never);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Colours saved — reload the site to see them");
  }

  const groups = [...new Set(rows.map((r) => r.group_label))];
  const valueKey = mode === "dark" ? "dark_value" : "light_value";
  const opacityKey = mode === "dark" ? "dark_opacity" : "light_opacity";

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
          Every colour on the site, with a separate value for dark mode and light mode. Intensity
          controls how strong a colour is — use it to soften lines, borders and the hover glow.
        </p>
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

      {groups.map((group) => (
        <section key={group} className="border-t border-hairline pt-8">
          <p className="eyebrow">{group}</p>
          <div className="mt-6 space-y-6">
            {rows
              .filter((r) => r.group_label === group)
              .map((r) => {
                const value = String(r[valueKey] ?? "");
                const opacity = Number(r[opacityKey] ?? 100);
                return (
                  <div
                    key={r.id}
                    className="grid items-center gap-4 sm:grid-cols-[13rem_auto_1fr] "
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
    </div>
  );
}
