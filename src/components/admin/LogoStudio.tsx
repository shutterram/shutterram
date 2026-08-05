import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/SRLogo.svg.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { ImageField } from "./ContentEditor";

type Row = Record<string, unknown>;

const SLOTS = [
  { key: "header", label: "Header logo", defaultHeight: 96 },
  { key: "mobile", label: "Mobile menu logo", defaultHeight: 80 },
  { key: "footer", label: "Footer logo", defaultHeight: 80 },
  { key: "loader", label: "Loading screen logo", defaultHeight: 36 },
] as const;

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

/** Logo slots with upload, size and placement controls plus a live preview. */
export function LogoStudio() {
  const [row, setRow] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void supabase
      .from("settings" as never)
      .select("*")
      .limit(1)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setRow((((data ?? [])[0] ?? {}) as unknown) as Row);
      });
  }, []);

  if (!row) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }

  const invert = row["logo_invert"] === true;

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("settings" as never)
      .upsert({ ...(row as object), id: true } as never);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Logos saved");
  }

  const set = (key: string, value: unknown) => setRow({ ...row, [key]: value });

  return (
    <div className="space-y-14">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Upload a different logo for each place it appears, then use the sliders to size and nudge
        it. The preview shows exactly how it will sit on the site. Leave a slot empty to keep the
        built-in logo.
      </p>

      {SLOTS.map((slot) => {
        const src = (row[`logo_${slot.key}`] as string) || logo.url;
        const height = num(row[`logo_${slot.key}_height`]) || slot.defaultHeight;
        const offsetX = num(row[`logo_${slot.key}_offset_x`]);
        const offsetY = num(row[`logo_${slot.key}_offset_y`]);

        return (
          <section key={slot.key} className="grid gap-8 border-t border-hairline pt-10 lg:grid-cols-2">
            <div className="space-y-6">
              <ImageField
                label={slot.label}
                value={(row[`logo_${slot.key}`] as string) ?? ""}
                onChange={(v) => set(`logo_${slot.key}`, v)}
              />

              <label className="block">
                <span className="eyebrow">Height — {height}px</span>
                <input
                  type="range"
                  min={16}
                  max={220}
                  value={height}
                  onChange={(e) => set(`logo_${slot.key}_height`, Number(e.target.value))}
                  className="mt-3 w-full accent-current"
                />
              </label>

              <div className="grid grid-cols-2 gap-6">
                <label className="block">
                  <span className="eyebrow">Nudge left / right — {offsetX}px</span>
                  <input
                    type="range"
                    min={-60}
                    max={60}
                    value={offsetX}
                    onChange={(e) => set(`logo_${slot.key}_offset_x`, Number(e.target.value))}
                    className="mt-3 w-full accent-current"
                  />
                </label>
                <label className="block">
                  <span className="eyebrow">Nudge up / down — {offsetY}px</span>
                  <input
                    type="range"
                    min={-60}
                    max={60}
                    value={offsetY}
                    onChange={(e) => set(`logo_${slot.key}_offset_y`, Number(e.target.value))}
                    className="mt-3 w-full accent-current"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => {
                  set(`logo_${slot.key}_offset_x`, 0);
                  setRow((r) => ({ ...(r as Row), [`logo_${slot.key}_offset_y`]: 0 }));
                }}
                className="border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground"
              >
                Reset placement
              </button>
            </div>

            <div>
              <p className="eyebrow">Preview</p>
              <div className="mt-3 grid min-h-44 place-items-center overflow-hidden border border-hairline bg-background p-6">
                <div className="flex flex-col items-center">
                  <img
                    src={src}
                    alt=""
                    style={{
                      height,
                      transform: `translate(${offsetX}px, ${offsetY}px)`,
                    }}
                    className={"w-auto " + (invert ? "invert" : "")}
                  />
                  {slot.key !== "loader" ? (
                    <span className="eyebrow mt-3">{String(row["tagline"] ?? "")}</span>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      <div className="grid gap-8 border-t border-hairline pt-10 md:grid-cols-2">
        <ImageField
          label="Browser tab icon (favicon)"
          value={(row["logo_favicon"] as string) ?? ""}
          onChange={(v) => set("logo_favicon", v)}
        />
        <label className="flex items-center gap-3 pt-8">
          <input
            type="checkbox"
            checked={invert}
            onChange={(e) => set("logo_invert", e.target.checked)}
            className="size-4 accent-current"
          />
          <span className="eyebrow">Invert logo colours (for dark artwork)</span>
        </label>
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="inline-flex items-center gap-2 border border-foreground bg-foreground px-7 py-3 text-[0.625rem] tracking-[0.24em] uppercase text-background transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {saving ? <Loader2 className="size-3 animate-spin" /> : null}
        Save logos
      </button>
    </div>
  );
}
