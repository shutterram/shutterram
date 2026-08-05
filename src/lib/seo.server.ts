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

/** Site-wide default social share image, editable in the studio. */
async function fetchDefaultOgImage(
  supabase: NonNullable<ReturnType<typeof client>>,
): Promise<string> {
  const { data } = await supabase.from("settings").select("og_image").limit(1).maybeSingle();
  return ((data as { og_image?: string } | null)?.og_image ?? "").trim();
}

/** Reads the studio-managed SEO record for a single page path. */
export async function fetchSeo(path: string): Promise<SeoRow | null> {
  const supabase = client();
  if (!supabase) return null;

  const [{ data, error }, defaultImage] = await Promise.all([
    supabase
      .from("seo_pages")
      .select("path,title,description,keywords,og_title,og_description,og_image,canonical,robots")
      .eq("path", path)
      .maybeSingle(),
    fetchDefaultOgImage(supabase),
  ]);

  if (error) {
    console.error(`[seo] failed to read ${path}: ${error.message}`);
    return null;
  }
  const row = (data as SeoRow | null) ?? null;
  if (!row && !defaultImage) return null;
  if (!row) return { og_image: defaultImage } as SeoRow;
  return { ...row, og_image: row.og_image?.trim() ? row.og_image : defaultImage };
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
