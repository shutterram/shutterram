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
