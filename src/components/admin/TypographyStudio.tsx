import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FONT_CHOICES } from "@/lib/type-css";

type Row = {
  id: string;
  role: string;
  label: string;
  group_label: string;
  hint: string;
  selector: string;
  font_family: string;
  weight: string;
  letter_spacing: string;
  line_height: string;
  text_transform: string;
  size_desktop: string;
  size_tablet: string;
  size_mobile: string;
  sample_text: string;
  sort_order: number;
};


type Site = {
  id: boolean;
  font_heading: string;
  font_body: string;
  font_scale_desktop: number;
  font_scale_tablet: number;
  font_scale_mobile: number;
};

const VIEWS = [
  { id: "desktop", label: "Desktop", sizeKey: "size_desktop", scaleKey: "font_scale_desktop" },
  { id: "tablet", label: "Tablet", sizeKey: "size_tablet", scaleKey: "font_scale_tablet" },
  { id: "mobile", label: "Mobile", sizeKey: "size_mobile", scaleKey: "font_scale_mobile" },
] as const;

const field =
  "w-full border-b border-hairline bg-transparent py-1.5 text-xs outline-none focus:border-foreground";

/** Fonts, weights and per-device sizes for every kind of text on the site. */
export function TypographyStudio() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<(typeof VIEWS)[number]>(VIEWS[0]);

  useEffect(() => {
    void (async () => {
      const [tokens, settings] = await Promise.all([
        supabase
          .from("type_tokens" as never)
          .select("*")
          .order("sort_order", { ascending: true }),
        supabase
          .from("settings" as never)
          .select(
            "id,font_heading,font_body,font_scale_desktop,font_scale_tablet,font_scale_mobile",
          )
          .limit(1)
          .maybeSingle(),
      ]);
      if (tokens.error) toast.error(tokens.error.message);
      if (settings.error) toast.error(settings.error.message);
      setRows((tokens.data ?? []) as unknown as Row[]);
      setSite((settings.data ?? null) as unknown as Site | null);
    })();
  }, []);

  if (!rows || !site) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }

  const set = (id: string, patch: Partial<Row>) =>
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function save() {
    if (!rows || !site) return;
    setSaving(true);
    const [tokens, settings] = await Promise.all([
      supabase.from("type_tokens" as never).upsert(rows as never),
      supabase
        .from("settings" as never)
        .update({
          font_heading: site.font_heading,
          font_body: site.font_body,
          font_scale_desktop: site.font_scale_desktop,
          font_scale_tablet: site.font_scale_tablet,
          font_scale_mobile: site.font_scale_mobile,
        } as never)
        .eq("id", true),
    ]);
    setSaving(false);
    const error = tokens.error ?? settings.error;
    if (error) toast.error(error.message);
    else toast.success("Fonts saved — reload the site to see them");
  }

  const groups = [...new Set(rows.map((r) => r.group_label))];
  const scale = Number(site[view.scaleKey] ?? 1);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
          Choose the site fonts, then fine-tune each kind of text. Sizes are set separately for
          desktop, tablet and mobile — leave a size blank to keep the built-in responsive size.
        </p>
        <div className="flex border border-hairline">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v)}
              className={
                "px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors " +
                (view.id === v.id ? "bg-foreground text-background" : "text-muted-foreground")
              }
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <section className="border-t border-hairline pt-8">
        <p className="eyebrow">Site fonts</p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {(
            [
              ["font_heading", "Heading font"],
              ["font_body", "Body font"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-xs text-muted-foreground">{label}</span>
              <input
                list="studio-font-choices"
                value={String(site[key] ?? "")}
                onChange={(e) => setSite({ ...site, [key]: e.target.value })}
                placeholder="Any Google Font name"
                className={field}
              />
            </label>
          ))}
          <datalist id="studio-font-choices">
            {FONT_CHOICES.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>

        <label className="mt-8 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          Overall text size on {view.label.toLowerCase()}
          <input
            type="range"
            min={70}
            max={140}
            value={Math.round(scale * 100)}
            onChange={(e) =>
              setSite({ ...site, [view.scaleKey]: Number(e.target.value) / 100 } as Site)
            }
            className="w-56 accent-foreground"
          />
          <span className="tabular-nums">{Math.round(scale * 100)}%</span>
        </label>
      </section>

      {groups.map((group) => (
        <section key={group} className="border-t border-hairline pt-8">
          <p className="eyebrow">{group}</p>
          <div className="mt-6 space-y-8">
            {rows
              .filter((r) => r.group_label === group)
              .map((r) => (
                <div key={r.id} className="grid gap-4 lg:grid-cols-[14rem_1fr]">
                  <div className="min-w-0">
                    <p className="text-sm">{r.label}</p>
                    {r.hint ? <p className="text-xs text-muted-foreground">{r.hint}</p> : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <label className="block">
                      <span className="text-xs text-muted-foreground">
                        Size — {view.label} (e.g. 2rem, 24px)
                      </span>
                      <input
                        value={String(r[view.sizeKey] ?? "")}
                        onChange={(e) =>
                          set(r.id, { [view.sizeKey]: e.target.value } as Partial<Row>)
                        }
                        placeholder="Default"
                        className={field}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">Font</span>
                      <select
                        value={r.font_family}
                        onChange={(e) => set(r.id, { font_family: e.target.value })}
                        className={field}
                      >
                        <option value="">Default</option>
                        <option value="display">Heading font</option>
                        <option value="sans">Body font</option>
                        {FONT_CHOICES.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">Weight</span>
                      <select
                        value={r.weight}
                        onChange={(e) => set(r.id, { weight: e.target.value })}
                        className={field}
                      >
                        <option value="">Default</option>
                        {["300", "400", "500", "600", "700"].map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">
                        Letter spacing (e.g. -0.02em)
                      </span>
                      <input
                        value={r.letter_spacing}
                        onChange={(e) => set(r.id, { letter_spacing: e.target.value })}
                        placeholder="Default"
                        className={field}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">Line height (e.g. 1.4)</span>
                      <input
                        value={r.line_height}
                        onChange={(e) => set(r.id, { line_height: e.target.value })}
                        placeholder="Default"
                        className={field}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground">Letter case</span>
                      <select
                        value={r.text_transform}
                        onChange={(e) => set(r.id, { text_transform: e.target.value })}
                        className={field}
                      >
                        <option value="">Default</option>
                        <option value="none">As typed</option>
                        <option value="uppercase">UPPERCASE</option>
                        <option value="lowercase">lowercase</option>
                        <option value="capitalize">Capitalised</option>
                      </select>
                    </label>
                  </div>
                </div>
              ))}
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
        Save fonts
      </button>
    </div>
  );
}
