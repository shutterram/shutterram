import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type CopyRow = {
  id: string;
  key: string;
  label: string;
  group_label: string;
  value: string;
  sort_order: number;
};

/** Editor for every reusable label, button and heading across the site. */
export function CopyEditor() {
  const [rows, setRows] = useState<CopyRow[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void supabase
      .from("site_copy" as never)
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setRows(((data ?? []) as unknown) as CopyRow[]);
      });
  }, []);

  if (!rows) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }

  async function save() {
    if (!rows) return;
    setSaving(true);
    const { error } = await supabase
      .from("site_copy" as never)
      .upsert(rows.map((r) => ({ id: r.id, value: r.value })) as never);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Wording saved");
  }

  const term = query.trim().toLowerCase();
  const visible = term
    ? rows.filter(
        (r) =>
          r.label.toLowerCase().includes(term) ||
          r.value.toLowerCase().includes(term) ||
          r.group_label.toLowerCase().includes(term),
      )
    : rows;

  const groups = [...new Set(visible.map((r) => r.group_label))];

  return (
    <div className="space-y-12">
      <div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Every reusable word on the site — navigation, buttons, page headings and the loading /
          error screens. Section headings and intros live under “Page sections”.
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search wording…"
          className="mt-6 w-full max-w-sm border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground"
        />
      </div>

      {groups.map((group) => (
        <section key={group}>
          <p className="eyebrow">{group}</p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {visible
              .filter((r) => r.group_label === group)
              .map((row) => (
                <label key={row.id} className="block">
                  <span className="eyebrow">{row.label}</span>
                  {row.value.length > 70 ? (
                    <textarea
                      rows={3}
                      value={row.value}
                      onChange={(e) =>
                        setRows((list) =>
                          (list ?? []).map((r) =>
                            r.id === row.id ? { ...r, value: e.target.value } : r,
                          ),
                        )
                      }
                      className="mt-2 w-full resize-y border-b border-hairline bg-transparent py-2 text-sm leading-relaxed outline-none transition-colors focus:border-foreground"
                    />
                  ) : (
                    <input
                      value={row.value}
                      onChange={(e) =>
                        setRows((list) =>
                          (list ?? []).map((r) =>
                            r.id === row.id ? { ...r, value: e.target.value } : r,
                          ),
                        )
                      }
                      className="mt-2 w-full border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground"
                    />
                  )}
                </label>
              ))}
          </div>
        </section>
      ))}

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="inline-flex items-center gap-2 border border-foreground bg-foreground px-7 py-3 text-[0.625rem] tracking-[0.24em] uppercase text-background transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {saving ? <Loader2 className="size-3 animate-spin" /> : null}
        Save wording
      </button>
    </div>
  );
}
