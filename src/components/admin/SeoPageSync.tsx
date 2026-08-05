import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Pages that always exist on the site. */
const STATIC_PAGES: { path: string; title: string }[] = [
  { path: "/", title: "Home" },
  { path: "/gallery", title: "Previous Works" },
  { path: "/about", title: "About Me" },
  { path: "/services", title: "Services" },
  { path: "/contact", title: "Contact" },
];

/**
 * Keeps the SEO list in step with the site: every static page and every gallery
 * category gets its own row, so each one can carry its own social share image.
 */
export function SeoPageSync() {
  const [missing, setMissing] = useState<{ path: string; title: string }[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [cats, pages] = await Promise.all([
      supabase.from("categories" as never).select("slug,title"),
      supabase.from("seo_pages" as never).select("path"),
    ]);
    const existing = new Set(
      ((pages.data ?? []) as unknown as { path: string }[]).map((p) => p.path),
    );
    const wanted = [
      ...STATIC_PAGES,
      ...((cats.data ?? []) as unknown as { slug: string; title: string }[]).map((c) => ({
        path: `/gallery/${c.slug}`,
        title: c.title,
      })),
    ];
    setMissing(wanted.filter((p) => !existing.has(p.path)));
  }

  useEffect(() => {
    void load();
  }, []);

  async function addMissing() {
    if (!missing?.length) return;
    setBusy(true);
    const { error } = await supabase.from("seo_pages" as never).insert(
      missing.map((p, i) => ({
        path: p.path,
        title: `${p.title} | Shutter Ram`,
        sort_order: 100 + i,
      })) as never,
    );
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pages added — reloading");
    window.location.reload();
  }

  if (!missing) return null;

  return (
    <div className="mb-10 border border-hairline p-6">
      <p className="eyebrow">Page coverage</p>
      {missing.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Every page on the site — including each gallery category — has its own SEO entry and
          social share image below.
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            {missing.length} page{missing.length === 1 ? "" : "s"} on the site have no SEO entry
            yet: {missing.map((m) => m.path).join(", ")}. Add them to give each one its own title,
            description and social share image.
          </p>
          <button
            type="button"
            onClick={() => void addMissing()}
            disabled={busy}
            className="mt-5 inline-flex items-center gap-2 border border-foreground px-5 py-2 text-[0.625rem] tracking-[0.2em] uppercase disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : null}
            Add missing pages
          </button>
        </>
      )}
    </div>
  );
}
