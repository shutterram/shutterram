import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Toggle } from "@/components/admin/Toggle";

type Device = "desktop" | "tablet" | "mobile";
type Page = "home" | "gallery" | "category";

const DEVICES: { id: Device; label: string; hint: string }[] = [
  { id: "desktop", label: "Desktop", hint: "Screens 1024px and wider" },
  { id: "tablet", label: "Tablet", hint: "768px – 1023px" },
  { id: "mobile", label: "Mobile", hint: "Under 768px" },
];

const PAGES: { id: Page; label: string; hint: string }[] = [
  { id: "home", label: "Home — Featured work", hint: "The masonry grid on the home page" },
  { id: "gallery", label: "Gallery — All work", hint: "The /gallery page grid" },
  { id: "category", label: "Category pages", hint: "Each /gallery/<category> grid" },
];

const COLUMNS = ["1", "2", "3"] as const;

const keyOf = (page: Page, device: Device) => `grid_${page}_${device}`;

/**
 * Default column counts per page, split by device. Visitors can still pick
 * their own view — this only decides what they see first.
 */
export function GridDefaultsStudio() {
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [crm, setCrm] = useState<Record<string, unknown> | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void supabase
      .from("settings" as never)
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setRow((data ?? {}) as Record<string, unknown>);
      });
    void supabase
      .from("crm_settings" as never)
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setCrm((data ?? {}) as Record<string, unknown>));
  }, []);

  if (!row) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }

  const value = (page: Page) => {
    const raw = row[keyOf(page, device)];
    return raw === "1" || raw === "3" ? raw : "2";
  };

  async function save() {
    if (!row) return;
    setSaving(true);
    const patch: Record<string, unknown> = {};
    for (const p of PAGES)
      for (const d of DEVICES) {
        const k = keyOf(p.id, d.id);
        patch[k] = typeof row[k] === "string" ? row[k] : "2";
      }
    patch["show_view_label"] = row["show_view_label"] !== false;

    if (crm) {
      const crmPatch: Record<string, unknown> = {};
      for (const d of DEVICES) {
        const k = `gallery_grid_${d.id}`;
        crmPatch[k] = typeof crm[k] === "string" ? crm[k] : "2";
      }
      const { error: crmError } = await supabase
        .from("crm_settings" as never)
        .update(crmPatch as never)
        .eq("id", true);
      if (crmError) toast.error(crmError.message);
    }

    const { error } = await supabase
      .from("settings" as never)
      .update(patch as never)
      .eq("id", true);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Grid defaults saved — use “Refresh site” to see them");
  }

  return (
    <div className="space-y-10 pb-20">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Pick how many columns each grid opens with. Choose a device first, then set the three grids
        for that device. Visitors can still switch the view themselves.
      </p>

      <div className="flex flex-wrap gap-3">
        {DEVICES.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDevice(d.id)}
            className={
              "border px-6 py-3 text-[0.625rem] tracking-[0.24em] uppercase transition-colors " +
              (device === d.id
                ? "border-foreground bg-foreground text-background"
                : "border-hairline text-muted-foreground hover:border-foreground hover:text-foreground")
            }
          >
            {d.label}
          </button>
        ))}
      </div>
      <p className="-mt-6 text-xs text-muted-foreground">
        {DEVICES.find((d) => d.id === device)?.hint}
      </p>

      <div className="border border-hairline p-6">
        <p className="eyebrow">The word “View”</p>
        <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
          Shows or hides the small “View” caption that sits next to the grid pickers on the home and
          gallery pages. Category pages never show it.
        </p>
        <label className="mt-5 inline-flex cursor-pointer items-center gap-3 text-sm">
          <Toggle
            checked={row["show_view_label"] !== false}
            onChange={(v) => setRow({ ...row, show_view_label: v })}
          />
          Show the “View” label
        </label>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {PAGES.map((p) => (
          <div key={p.id} className="border border-hairline p-6">
            <p className="eyebrow">{p.label}</p>
            <p className="mt-2 text-xs text-muted-foreground">{p.hint}</p>
            <div className="mt-5 flex gap-2">
              {COLUMNS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setRow({ ...row, [keyOf(p.id, device)]: c })}
                  className={
                    "flex-1 border py-3 text-xs transition-colors " +
                    (value(p.id) === c
                      ? "border-foreground text-foreground"
                      : "border-hairline text-muted-foreground hover:border-foreground")
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border border-hairline p-6">
        <p className="eyebrow">Client galleries — /g links</p>
        <p className="mt-2 max-w-xl text-xs text-muted-foreground">
          How many columns your client galleries and photo-selection links open with on{" "}
          {DEVICES.find((d) => d.id === device)?.label.toLowerCase()}. Clients can still switch.
        </p>
        <div className="mt-5 flex max-w-xs gap-2">
          {COLUMNS.map((c) => {
            const key = `gallery_grid_${device}`;
            const cur = crm && typeof crm[key] === "string" && ["1", "2", "3"].includes(crm[key] as string)
              ? (crm[key] as string)
              : "2";
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCrm({ ...(crm ?? {}), [key]: c })}
                className={
                  "flex-1 border py-3 text-xs transition-colors " +
                  (cur === c
                    ? "border-foreground text-foreground"
                    : "border-hairline text-muted-foreground hover:border-foreground")
                }
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="inline-flex items-center gap-2 border border-foreground bg-foreground px-7 py-3 text-[0.625rem] tracking-[0.24em] uppercase text-background transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {saving ? <Loader2 className="size-3 animate-spin" /> : null}
        Save grid defaults
      </button>
    </div>
  );
}
