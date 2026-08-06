import { createClient } from "@supabase/supabase-js";

function client() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** Gallery category URLs for the sitemap. */
export async function fetchCategoryPaths(): Promise<string[]> {
  const supabase = client();
  if (!supabase) return [];
  const { data } = await supabase.from("categories").select("slug").order("sort_order");
  return ((data as { slug: string }[] | null) ?? []).map((row) => `/gallery/${row.slug}`);
}

export type SitemapImage = { src: string; caption: string };

/** Storage key for a served image path (`/api/public/img/<key>`). */
function imageKey(src: string): string | null {
  return src.match(/\/api\/public\/img\/(.+)$/)?.[1] ?? null;
}

/**
 * Photos grouped per page path, with every image the owner marked as hidden from
 * the public internet removed so search engines never discover them.
 */
export async function fetchIndexableImages(): Promise<Record<string, SitemapImage[]>> {
  const supabase = client();
  if (!supabase) return {};

  const [{ data: photoRows }, { data: flagRows }] = await Promise.all([
    supabase
      .from("photos")
      .select("category_slug,caption,src,in_gallery,sort_order")
      .order("sort_order"),
    supabase.from("image_settings").select("path,indexable"),
  ]);

  const hidden = new Set(
    ((flagRows as { path: string; indexable: boolean }[] | null) ?? [])
      .filter((row) => row.indexable === false)
      .map((row) => row.path),
  );

  const byPath: Record<string, SitemapImage[]> = {};
  const push = (path: string, image: SitemapImage) => {
    (byPath[path] ??= []).push(image);
  };

  type PhotoRow = { category_slug: string; caption: string; src: string; in_gallery: boolean };
  for (const row of ((photoRows as PhotoRow[] | null) ?? [])) {
    if (!row.src) continue;
    const key = imageKey(row.src);
    if (key && hidden.has(key)) continue;
    const image = { src: row.src, caption: row.caption ?? "" };
    if (row.in_gallery !== false) push("/gallery", image);
    if (row.category_slug) push(`/gallery/${row.category_slug}`, image);
  }

  return byPath;
}
