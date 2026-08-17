import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FloatingSaveBar } from "@/components/admin/FloatingSaveBar";
import { supabase } from "@/integrations/supabase/client";
import { Toggle } from "@/components/admin/Toggle";

interface InvertRow {
  key: string;
  label: string;
  group_label: string;
  hint: string;
  inverted: boolean;
  shadow_dark: boolean;
  shadow_light: boolean;
  sort_order: number;
}

type SwitchField = "inverted" | "shadow_dark" | "shadow_light";

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
        .select("key,label,group_label,hint,inverted,shadow_dark,shadow_light,sort_order")
        .order("sort_order", { ascending: true });
      if (error) toast.error(error.message);
      setRows((data ?? []) as InvertRow[]);
      setLoading(false);
    })();
  }, []);

  const toggle = (key: string, field: SwitchField) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: !r[field] } : r)));
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
        shadow_dark: r.shadow_dark,
        shadow_light: r.shadow_light,
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
        Flip the colour, or add a soft drop shadow behind the text — separately for dark mode and
        light mode, so you can switch on only the one that needs it.
      </p>

      {groups.map((group) => (
        <section key={group} className="space-y-4">
          <h3 className="eyebrow">{group}</h3>
          <div className="divide-y divide-hairline border-y border-hairline">
            {rows
              .filter((r) => r.group_label === group)
              .map((r) => (
                <div
                  key={r.key}
                  className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
                >
                  <span className="min-w-0">
                    <span className="block text-sm">{r.label}</span>
                    {r.hint ? (
                      <span className="mt-1 block text-xs text-muted-foreground">{r.hint}</span>
                    ) : null}
                  </span>
                  <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3">
                    {(
                      [
                        { field: "inverted", label: "Flip colour" },
                        { field: "shadow_dark", label: "Shadow — dark mode" },
                        { field: "shadow_light", label: "Shadow — light mode" },
                      ] as { field: SwitchField; label: string }[]
                    ).map((s) => (
                      <label
                        key={s.field}
                        className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"
                      >
                        <Toggle
                          size="sm"
                          checked={r[s.field]}
                          onChange={() => toggle(r.key, s.field)}
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}

      {dirty ? (
        <FloatingSaveBar saving={saving} onClick={() => void save()} label="Save text contrast" />
      ) : null}
    </div>
  );
}
