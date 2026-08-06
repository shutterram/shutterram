import { Plus, Trash2 } from "lucide-react";
import { googleFontHref, type SiteFont } from "@/lib/type-css";

export type FontRow = {
  id: string;
  family: string;
  source: string;
  css_url: string;
  weights: string[];
  styles: string[];
  sort_order: number;
};

const WEIGHTS = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];

const field =
  "w-full border-b border-hairline bg-transparent py-1.5 text-xs outline-none focus:border-foreground";

const chip = (on: boolean) =>
  "border px-2.5 py-1 text-[0.625rem] tracking-[0.12em] uppercase transition-colors " +
  (on ? "border-foreground bg-foreground text-background" : "border-hairline text-muted-foreground");

const toSiteFont = (f: FontRow): SiteFont => ({
  id: f.id,
  family: f.family,
  source: f.source,
  cssUrl: f.css_url,
  weights: f.weights,
  styles: f.styles,
});

/** Add extra fonts (Google Fonts or any stylesheet link) with weights and styles. */
export function FontLibrary({
  fonts,
  onChange,
  onRemove,
}: {
  fonts: FontRow[];
  onChange: (next: FontRow[]) => void;
  onRemove: (id: string) => void;
}) {
  const set = (id: string, patch: Partial<FontRow>) =>
    onChange(fonts.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const toggle = (id: string, key: "weights" | "styles", value: string) => {
    const font = fonts.find((f) => f.id === id);
    if (!font) return;
    const current = font[key] ?? [];
    set(id, {
      [key]: current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value],
    } as Partial<FontRow>);
  };

  const add = () =>
    onChange([
      ...fonts,
      {
        id: crypto.randomUUID(),
        family: "",
        source: "google",
        css_url: "",
        weights: ["400", "500", "700"],
        styles: ["normal"],
        sort_order: fonts.length,
      },
    ]);

  return (
    <section className="border-t border-hairline pt-8">
      <p className="eyebrow">Font library</p>
      <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
        Load new fonts into the site. Type any Google Font name, or paste a stylesheet link from
        another font service. Pick the weights and styles you want loaded — once saved, the font
        appears everywhere a font can be chosen below.
      </p>

      <div className="mt-6 space-y-8">
        {fonts.map((f) => (
          <div key={f.id} className="grid gap-4 lg:grid-cols-[14rem_1fr]">
            <div className="min-w-0">
              <p className="text-sm">{f.family || "New font"}</p>
              <p
                className="mt-2 truncate text-xl"
                style={{ fontFamily: f.family ? `"${f.family}", sans-serif` : undefined }}
              >
                Aa Bb Cc 123
              </p>
              <button
                type="button"
                onClick={() => {
                  onChange(fonts.filter((x) => x.id !== f.id));
                  onRemove(f.id);
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-[0.625rem] tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="size-3" /> Remove
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs text-muted-foreground">Font name</span>
                  <input
                    value={f.family}
                    onChange={(e) => set(f.id, { family: e.target.value })}
                    placeholder="e.g. Instrument Sans"
                    className={field}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted-foreground">Where it loads from</span>
                  <select
                    value={f.source}
                    onChange={(e) => set(f.id, { source: e.target.value })}
                    className={field}
                  >
                    <option value="google">Google Fonts</option>
                    <option value="url">Stylesheet link</option>
                  </select>
                </label>
              </div>

              {f.source === "url" ? (
                <label className="block">
                  <span className="text-xs text-muted-foreground">Stylesheet link (CSS URL)</span>
                  <input
                    value={f.css_url}
                    onChange={(e) => set(f.id, { css_url: e.target.value })}
                    placeholder="https://use.typekit.net/xxxx.css"
                    className={field}
                  />
                </label>
              ) : null}

              <div>
                <span className="text-xs text-muted-foreground">Weights to load</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WEIGHTS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => toggle(f.id, "weights", w)}
                      className={chip((f.weights ?? []).includes(w))}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground">Styles to load</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      ["normal", "Normal"],
                      ["italic", "Italic"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggle(f.id, "styles", value)}
                      className={chip((f.styles ?? []).includes(value))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {f.source === "google" && f.family ? (
                <p className="truncate text-[0.625rem] text-muted-foreground">
                  {googleFontHref(toSiteFont(f))}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-6 inline-flex items-center gap-2 border border-hairline px-5 py-2 text-[0.625rem] tracking-[0.2em] uppercase hover:border-foreground"
      >
        <Plus className="size-3" /> Add a font
      </button>
    </section>
  );
}
