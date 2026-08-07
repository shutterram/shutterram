import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FloatingSaveBar } from "@/components/admin/FloatingSaveBar";
import { supabase } from "@/integrations/supabase/client";

interface InvertRow {
  key: string;
  label: string;
  group_label: string;
  hint: string;
  inverted: boolean;
  sort_order: number;
}

/**
 * Text contrast — every piece of text that sits on top of a photograph gets a
 * switch here. Turning one on flips that text to the opposite colour so it
 * stays readable over a busy or same-toned background.
 */
export function TextContrastStudio() {
  const [rows, setRows] = useState<InvertRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("text_inverts")
        .select("key,label,group_label,hint,inverted,sort_order")
        .order("sort_order", { ascending: true });
      if (error) toast.error(error.message);
      setRows((data ?? []) as InvertRow[]);
      setLoading(false);
    })();
  }, []);

  const toggle = (key: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, inverted: !r.inverted } : r)));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("text_inverts").upsert(
      rows.map((r) => ({
        key: r.key,
        label: r.label,
        group_label: r.group_label,
        hint: r.hint,
        inverted: r.inverted,
        sort_order: r.sort_order,
      })),
      { onConflict: "key" },
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDirty(false);
    toast.success("Text contrast saved — reload the site to see it.");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const groups = [...new Set(rows.map((r) => r.group_label))];

  return (
    <div className="space-y-10 pb-28">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Text that sits over a photograph can disappear when the picture behind it is the same tone.
        Flip any of these to switch that text to the opposite colour.
      </p>

      {groups.map((group) => (
        <section key={group} className="space-y-4">
          <h3 className="eyebrow">{group}</h3>
          <div className="divide-y divide-hairline border-y border-hairline">
            {rows
              .filter((r) => r.group_label === group)
              .map((r) => (
                <label
                  key={r.key}
                  className="flex cursor-pointer items-center justify-between gap-6 py-4"
                >
                  <span className="min-w-0">
                    <span className="block text-sm">{r.label}</span>
                    {r.hint ? (
                      <span className="mt-1 block text-xs text-muted-foreground">{r.hint}</span>
                    ) : null}
                  </span>
                  <input
                    type="checkbox"
                    checked={r.inverted}
                    onChange={() => toggle(r.key)}
                    className="size-4 shrink-0 accent-foreground"
                  />
                </label>
              ))}
          </div>
        </section>
      ))}

      <FloatingSaveBar dirty={dirty} saving={saving} onSave={save} label="Save text contrast" />
    </div>
  );
}
