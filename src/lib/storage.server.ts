/** Storage housekeeping helpers — bucket listing, orphan detection and deletes. */

const BUCKET = "site-images";

export interface StoredFile {
  key: string;
  size: number;
  updatedAt: string;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Every file currently sitting in the images bucket. */
export async function listBucketFiles(): Promise<StoredFile[]> {
  const db = await admin();
  const out: StoredFile[] = [];
  const pageSize = 100;
  for (let offset = 0; offset < 5000; offset += pageSize) {
    const { data, error } = await db.storage
      .from(BUCKET)
      .list("", { limit: pageSize, offset, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new Error(error.message);
    const page = data ?? [];
    for (const f of page) {
      if (!f.name || f.name === ".emptyFolderPlaceholder") continue;
      out.push({
        key: f.name,
        size: Number((f.metadata as { size?: number } | null)?.size ?? 0),
        updatedAt: String(f.updated_at ?? f.created_at ?? ""),
      });
    }
    if (page.length < pageSize) break;
  }
  return out;
}

/** Pull every storage key mentioned anywhere in a blob of JSON. */
export function keysInJson(value: unknown, into: Set<string>) {
  const text = JSON.stringify(value ?? null);
  if (!text) return;
  const re = /\/api\/public\/img\/([A-Za-z0-9._-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) if (m[1]) into.add(m[1]);
}

/** Keys referenced by live content, plus (optionally) by saved versions/templates. */
export async function referencedKeys(includeHistory: boolean): Promise<Set<string>> {
  const db = await admin();
  const keys = new Set<string>();

  const { data: content, error } = await db.rpc("content_snapshot" as never, {
    _tables: null,
  } as never);
  if (error) throw new Error(error.message);
  keysInJson(content, keys);

  if (includeHistory) {
    const { data: versions } = await db
      .from("site_versions" as never)
      .select("data")
      .order("created_at", { ascending: false })
      .limit(200);
    keysInJson(versions, keys);
  }

  const { data: reviews } = await db.from("testimonials" as never).select("images");
  keysInJson(reviews, keys);

  return keys;
}

/** Remove files from the bucket and forget their per-image settings. */
export async function removeFiles(keys: string[]): Promise<number> {
  if (!keys.length) return 0;
  const db = await admin();
  const { error } = await db.storage.from(BUCKET).remove(keys);
  if (error) throw new Error(error.message);
  await db
    .from("image_settings" as never)
    .delete()
    .in("path", keys);
  return keys.length;
}
