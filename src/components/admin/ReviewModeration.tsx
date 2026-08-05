import { useEffect, useState } from "react";
import { Check, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ReviewRow = {
  id: string;
  name: string;
  role: string;
  occasion: string;
  email: string;
  quote: string;
  rating: number;
  images: string[];
  status: string;
  sort_order: number;
};

/** Approve, edit or delete client-submitted reviews. */
export function ReviewModeration() {
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("testimonials" as never)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setRows(((data ?? []) as unknown) as ReviewRow[]);
  }

  useEffect(() => {
    void load();
  }, []);

  if (!rows) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }

  async function patch(row: ReviewRow, changes: Partial<ReviewRow>) {
    setSavingId(row.id);
    const { error } = await supabase
      .from("testimonials" as never)
      .update(changes as never)
      .eq("id", row.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    setRows((list) => (list ?? []).map((r) => (r.id === row.id ? { ...r, ...changes } : r)));
    toast.success("Review updated");
  }

  async function remove(row: ReviewRow) {
    if (!confirm(`Delete the review from ${row.name}?`)) return;
    const { error } = await supabase.from("testimonials" as never).delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    setRows((list) => (list ?? []).filter((r) => r.id !== row.id));
    toast.success("Review deleted");
  }

  const link =
    typeof window !== "undefined" ? `${window.location.origin}/review` : "/review";
  const visible = rows.filter((r) => (filter === "all" ? true : (r.status || "approved") === filter));

  return (
    <div className="space-y-10">
      <div className="border border-hairline p-6">
        <p className="eyebrow">Client review link</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Share this private link with clients. Their review arrives here as “pending” — nothing
          shows on the site until you approve it.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <code className="border border-hairline px-3 py-2 text-xs">{link}</code>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(link);
              toast.success("Link copied");
            }}
            className="border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground"
          >
            Copy link
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {(["pending", "approved", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={
              "text-[0.6875rem] tracking-[0.24em] uppercase transition-colors " +
              (filter === f ? "text-foreground" : "text-muted-foreground hover:text-foreground")
            }
          >
            {f} ({rows.filter((r) => (f === "all" ? true : (r.status || "approved") === f)).length})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="border border-hairline p-6 text-sm text-muted-foreground">
          Nothing here yet.
        </p>
      ) : null}

      <div className="space-y-8">
        {visible.map((row) => (
          <article key={row.id} className="border border-hairline p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm">{row.name}</p>
                <p className="eyebrow mt-1">
                  {row.occasion || row.role} {row.email ? `· ${row.email}` : ""}
                </p>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: Math.max(1, row.rating) }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-foreground text-foreground" strokeWidth={0} />
                ))}
              </div>
            </div>

            <textarea
              rows={4}
              value={row.quote}
              onChange={(e) =>
                setRows((list) =>
                  (list ?? []).map((r) => (r.id === row.id ? { ...r, quote: e.target.value } : r)),
                )
              }
              className="mt-5 w-full resize-y border-b border-hairline bg-transparent py-2 text-sm leading-relaxed outline-none transition-colors focus:border-foreground"
            />

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="eyebrow">Display name</span>
                <input
                  value={row.name}
                  onChange={(e) =>
                    setRows((list) =>
                      (list ?? []).map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)),
                    )
                  }
                  className="mt-2 w-full border-b border-hairline bg-transparent py-2 text-sm outline-none focus:border-foreground"
                />
              </label>
              <label className="block">
                <span className="eyebrow">Role / occasion shown</span>
                <input
                  value={row.role}
                  onChange={(e) =>
                    setRows((list) =>
                      (list ?? []).map((r) => (r.id === row.id ? { ...r, role: e.target.value } : r)),
                    )
                  }
                  className="mt-2 w-full border-b border-hairline bg-transparent py-2 text-sm outline-none focus:border-foreground"
                />
              </label>
            </div>

            {row.images?.length ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {row.images.map((src) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer">
                    <img src={src} alt="" className="size-20 border border-hairline object-cover" />
                  </a>
                ))}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={savingId === row.id}
                onClick={() =>
                  void patch(row, {
                    quote: row.quote,
                    name: row.name,
                    role: row.role,
                    status: "approved",
                  })
                }
                className="inline-flex items-center gap-2 border border-foreground bg-foreground px-5 py-2 text-[0.625rem] tracking-[0.2em] uppercase text-background transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                <Check className="size-3" /> Save & approve
              </button>
              {(row.status || "approved") === "approved" ? (
                <button
                  type="button"
                  onClick={() => void patch(row, { status: "pending" })}
                  className="border border-hairline px-5 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground"
                >
                  Hide from site
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void remove(row)}
                className="inline-flex items-center gap-2 border border-hairline px-5 py-2 text-[0.625rem] tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
              >
                <Trash2 className="size-3" /> Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
