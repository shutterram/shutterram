import { supabase } from "@/integrations/supabase/client";

/** Storage key for a served image path (`/api/public/img/<key>`). */
export function imageKeyOf(src: string): string | null {
  if (!src) return null;
  const match = src.match(/\/api\/public\/img\/(.+)$/);
  return match?.[1] ?? null;
}

/** Reads the search-visibility flag for an image. Unknown images default to visible. */
export async function getImageIndexable(src: string): Promise<boolean> {
  const key = imageKeyOf(src);
  if (!key) return true;
  const { data } = await supabase
    .from("image_settings")
    .select("indexable")
    .eq("path", key)
    .maybeSingle();
  return data?.indexable ?? true;
}

/** Stores the search-visibility flag for an image. */
export async function setImageIndexable(src: string, indexable: boolean): Promise<void> {
  const key = imageKeyOf(src);
  if (!key) return;
  const { error } = await supabase
    .from("image_settings")
    .upsert({ path: key, indexable }, { onConflict: "path" });
  if (error) throw error;
}
