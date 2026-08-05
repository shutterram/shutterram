import { createClient } from "@supabase/supabase-js";

export type SeoRow = {
  path: string;
  title: string;
  description: string;
  keywords: string;
  og_title: string;
  og_description: string;
  og_image: string;
  canonical: string;
  robots: string;
};

/** Reads the studio-managed SEO record for a single page path. */
export async function fetchSeo(path: string): Promise<SeoRow | null> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
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

  const { data, error } = await supabase
    .from("seo_pages")
    .select("path,title,description,keywords,og_title,og_description,og_image,canonical,robots")
    .eq("path", path)
    .maybeSingle();

  if (error) {
    console.error(`[seo] failed to read ${path}: ${error.message}`);
    return null;
  }
  return (data as SeoRow | null) ?? null;
}

/** Reads every SEO record (used by the sitemap). */
export async function fetchAllSeo(): Promise<SeoRow[]> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return [];
  const supabase = createClient(url, key, {
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
  const { data } = await supabase
    .from("seo_pages")
    .select("path,title,description,keywords,og_title,og_description,og_image,canonical,robots")
    .order("sort_order", { ascending: true });
  return (data as SeoRow[] | null) ?? [];
}
