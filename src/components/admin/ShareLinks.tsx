import { useEffect, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { categories } from "@/data/portfolio";
import { supabase } from "@/integrations/supabase/client";
import { ImageField } from "@/components/admin/ContentEditor";
import { Toggle } from "@/components/admin/Toggle";

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
  code: string;
  created_at: string;
  path: string;
  og_image: string;
}

interface ShortRow {
  id: string;
  code: string;
  label: string;
  target_url: string;
  og_image: string;
  created_at: string;
}

function makeToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Five-character code used in the short URL, e.g. /a2kh3 */
function makeCode() {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function origin() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

/** The short, shareable URL for a link, e.g. https://site.com/a2kh3 */
function shortUrl(code: string) {
  return `${origin()}/${code}`;
}

/**
 * Share links — private, unlisted URLs for a single category (or the whole
 * gallery), plus a plain shortener for any other page on the site. Every link
 * is issued as a short code so nothing long or ugly ever gets shared.
 */
export function ShareLinks() {
  const [rows, setRows] = useState<ShareRow[]>([]);
  const [shorts, setShorts] = useState<ShortRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<"category" | "gallery" | "page">("category");
  const [pagePath, setPagePath] = useState(SITE_PAGES[0]!.path);
  const [ogImage, setOgImage] = useState("");
  const [slug, setSlug] = useState(categories[0]?.slug ?? "");
  const [includePrivate, setIncludePrivate] = useState(true);
  const [creating, setCreating] = useState(false);

  const [shortTarget, setShortTarget] = useState("");
  const [shortLabel, setShortLabel] = useState("");
  const [shortImage, setShortImage] = useState("");
  const [shortening, setShortening] = useState(false);

  const load = async () => {
    const [{ data, error }, { data: shortData, error: shortError }] = await Promise.all([
      supabase
        .from("share_links")
        .select("id,label,scope,category_slug,include_private,token,code,created_at,path,og_image")
        .order("created_at", { ascending: false }),
      supabase
        .from("short_links")
        .select("id,code,label,target_url,og_image,created_at")
        .order("created_at", { ascending: false }),
    ]);
    if (error) toast.error(error.message);
    if (shortError) toast.error(shortError.message);
    setRows((data ?? []) as ShareRow[]);
    setShorts((shortData ?? []) as ShortRow[]);
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
      code: makeCode(),
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

  /** Turns a pasted URL from this site into a short redirect. */
  const shorten = async () => {
    const raw = shortTarget.trim();
    if (!raw) {
      toast.error("Paste a link first.");
      return;
    }
    let target = raw;
    if (!/^https?:\/\//i.test(target) && !target.startsWith("/")) target = `https://${target}`;
    setShortening(true);
    const { error } = await supabase.from("short_links").insert({
      code: makeCode(),
      label: shortLabel.trim() || target,
      target_url: target,
      og_image: shortImage,
    });
    setShortening(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setShortTarget("");
    setShortLabel("");
    setShortImage("");
    toast.success("Short link created.");
    await load();
  };

  const removeShort = async (id: string) => {
    const { error } = await supabase.from("short_links").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Short link removed.");
    await load();
  };

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied.");
  };

  const field =
    "w-full border-0 border-b border-hairline bg-transparent pb-2 text-sm focus:border-foreground focus:outline-none";
  const smallButton =
    "inline-flex items-center gap-2 border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.24em] uppercase hover:border-foreground";

  return (
    <div className="space-y-12 pb-20">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Create an unlisted link to a category. Anyone with the link sees that page even if you chose
        to include the private photos — nothing changes for ordinary visitors, and revoking a link
        cuts access straight away. Every link is issued as a short URL such as{" "}
        <span className="whitespace-nowrap">{origin()}/a2kh3</span>.
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

          <div className="flex items-center gap-3 self-end pb-1">
            <Toggle
              checked={includePrivate}
              onChange={setIncludePrivate}
              label="Show private images in this link"
            />
            <span className="text-sm">Show private images in this link</span>
          </div>
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
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {r.code ? shortUrl(r.code) : "No short code — recreate this link"}
                  </p>
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
                  disabled={!r.code}
                  onClick={() => void copy(shortUrl(r.code))}
                  className={`${smallButton} disabled:opacity-40`}
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

      <section className="space-y-6 border border-hairline p-6">
        <div>
          <h3 className="eyebrow">Link shortener</h3>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Paste any link from your own site and get a short redirect you can share anywhere.
            Visits to it are counted in Statistics just like share links.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <label className="block">
            <span className="eyebrow">Link to shorten</span>
            <input
              value={shortTarget}
              onChange={(e) => setShortTarget(e.target.value)}
              placeholder="https://www.shutterram.com/services"
              className={`mt-3 ${field}`}
            />
          </label>
          <label className="block">
            <span className="eyebrow">Name (studio only)</span>
            <input
              value={shortLabel}
              onChange={(e) => setShortLabel(e.target.value)}
              placeholder="e.g. Services for Instagram bio"
              className={`mt-3 ${field}`}
            />
          </label>
          <div className="md:col-span-2">
            <ImageField
              value={shortImage}
              onChange={setShortImage}
              label="Link preview image (optional)"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void shorten()}
          disabled={shortening}
          className="inline-flex items-center border border-foreground bg-foreground px-7 py-3 text-[0.6875rem] tracking-[0.24em] uppercase text-background disabled:opacity-60"
        >
          {shortening ? "Shortening…" : "Shorten"}
        </button>

        {shorts.length > 0 ? (
          <div className="divide-y divide-hairline border-y border-hairline">
            {shorts.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{shortUrl(s.code)}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">→ {s.target_url}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.label} · {s.og_image ? "Custom preview image" : "Default preview image"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void copy(shortUrl(s.code))}
                  className={smallButton}
                >
                  <Copy className="size-3.5" /> Copy
                </button>
                <button
                  type="button"
                  onClick={() => void removeShort(s.id)}
                  className="inline-flex items-center gap-2 border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.24em] uppercase text-destructive hover:border-destructive"
                >
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
