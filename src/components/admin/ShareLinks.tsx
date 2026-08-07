import { useEffect, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { categories } from "@/data/portfolio";
import { supabase } from "@/integrations/supabase/client";
import { ImageField } from "@/components/admin/ContentEditor";

/** Every page a link can point at, beyond the gallery and its categories. */
const SITE_PAGES = [
  { path: "/", label: "Home" },
  { path: "/about", label: "About" },
  { path: "/services", label: "Services" },
  { path: "/contact", label: "Contact" },
  { path: "/review", label: "Leave a review" },
];

interface ShareRow {
  id: string;
  label: string;
  scope: string;
  category_slug: string;
  include_private: boolean;
  token: string;
  created_at: string;
  path: string;
  og_image: string;
}

function makeToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Full visitor URL for a link, e.g. https://site.com/gallery/weddings?k=<token> */
function linkUrl(row: ShareRow) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const path =
    row.scope === "category"
      ? `/gallery/${row.category_slug}`
      : row.scope === "page"
        ? row.path || "/"
        : "/gallery";
  return `${origin}${path}?k=${row.token}`;
}

/**
 * Share links — private, unlisted URLs for a single category (or the whole
 * gallery). Each link decides on its own whether the private photos inside
 * that category are revealed to whoever opens it.
 */
export function ShareLinks() {
  const [rows, setRows] = useState<ShareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<"category" | "gallery" | "page">("category");
  const [pagePath, setPagePath] = useState(SITE_PAGES[0]!.path);
  const [ogImage, setOgImage] = useState("");
  const [slug, setSlug] = useState(categories[0]?.slug ?? "");
  const [includePrivate, setIncludePrivate] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("share_links")
      .select("id,label,scope,category_slug,include_private,token,created_at,path,og_image")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as ShareRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    if (scope === "category" && !slug) {
      toast.error("Pick a category first.");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("share_links").insert({
      label:
        label.trim() ||
        (scope === "gallery" ? "Full gallery" : scope === "page" ? pagePath : slug),
      scope,
      category_slug: scope === "category" ? slug : "",
      path: scope === "page" ? pagePath : "",
      og_image: ogImage,
      include_private: includePrivate,
      token: makeToken(),
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLabel("");
    setOgImage("");
    toast.success("Share link created.");
    await load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("share_links").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Link revoked — it stops working immediately.");
    await load();
  };

  const copy = async (row: ShareRow) => {
    await navigator.clipboard.writeText(linkUrl(row));
    toast.success("Link copied.");
  };

  const field =
    "w-full border-0 border-b border-hairline bg-transparent pb-2 text-sm focus:border-foreground focus:outline-none";

  return (
    <div className="space-y-12 pb-20">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Create an unlisted link to a category. Anyone with the link sees that page even if you chose
        to include the private photos — nothing changes for ordinary visitors, and revoking a link
        cuts access straight away.
      </p>

      <section className="space-y-6 border border-hairline p-6">
        <h3 className="eyebrow">New link</h3>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="block">
            <span className="eyebrow">Name (studio only)</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Sharma wedding — full set"
              className={`mt-3 ${field}`}
            />
          </label>

          <label className="block">
            <span className="eyebrow">Covers</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as "category" | "gallery" | "page")}
              className={`mt-3 ${field}`}
            >
              <option value="category">One category</option>
              <option value="gallery">The whole gallery</option>
              <option value="page">Any other page</option>
            </select>
          </label>

          {scope === "category" ? (
            <label className="block">
              <span className="eyebrow">Category</span>
              <select
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className={`mt-3 ${field}`}
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {scope === "page" ? (
            <label className="block">
              <span className="eyebrow">Page</span>
              <select
                value={pagePath}
                onChange={(e) => setPagePath(e.target.value)}
                className={`mt-3 ${field}`}
              >
                {SITE_PAGES.map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="md:col-span-2">
            <ImageField
              value={ogImage}
              onChange={setOgImage}
              label="Link preview image (optional — falls back to the page's own)"
            />
          </div>

          <label className="flex items-center gap-3 self-end pb-1">
            <input
              type="checkbox"
              checked={includePrivate}
              onChange={(e) => setIncludePrivate(e.target.checked)}
              className="size-4 accent-foreground"
            />
            <span className="text-sm">Show private images in this link</span>
          </label>
        </div>

        <button
          type="button"
          onClick={() => void create()}
          disabled={creating}
          className="inline-flex items-center border border-foreground bg-foreground px-7 py-3 text-[0.6875rem] tracking-[0.24em] uppercase text-background disabled:opacity-60"
        >
          {creating ? "Creating…" : "Create link"}
        </button>
      </section>

      <section className="space-y-4">
        <h3 className="eyebrow">Existing links</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No share links yet.</p>
        ) : (
          <div className="divide-y divide-hairline border-y border-hairline">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{r.label}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{linkUrl(r)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.scope === "gallery"
                      ? "Whole gallery"
                      : r.scope === "page"
                        ? `Page: ${r.path || "/"}`
                        : `Category: ${r.category_slug}`}{" "}
                    · {r.og_image ? "Custom preview image" : "Default preview image"} ·{" "}
                    {r.include_private ? "Private images shown" : "Private images hidden"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void copy(r)}
                  className="inline-flex items-center gap-2 border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.24em] uppercase hover:border-foreground"
                >
                  <Copy className="size-3.5" /> Copy
                </button>
                <button
                  type="button"
                  onClick={() => void remove(r.id)}
                  className="inline-flex items-center gap-2 border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.24em] uppercase text-destructive hover:border-destructive"
                >
                  <Trash2 className="size-3.5" /> Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
