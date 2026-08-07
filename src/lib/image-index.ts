import { supabase } from "@/integrations/supabase/client";

export interface ImageFlags {
  /** May the image appear anywhere on the public internet (search engines, previews)? */
  indexable: boolean;
  /** Private images are hidden from the site unless opened through a share link. */
  isPrivate: boolean;
}

export const defaultImageFlags: ImageFlags = { indexable: true, isPrivate: false };

/** Storage key for a served image path (`/api/public/img/<key>`). */
export function imageKeyOf(src: string): string | null {
  if (!src) return null;
  const match = src.match(/\/api\/public\/img\/(.+)$/);
  return match?.[1] ?? null;
}

/** Reads both visibility flags for an image. Unknown images default to visible + public. */
export async function getImageFlags(src: string): Promise<ImageFlags> {
  const key = imageKeyOf(src);
  if (!key) return defaultImageFlags;
  const { data } = await supabase
    .from("image_settings")
    .select("indexable,is_private")
    .eq("path", key)
    .maybeSingle();
  return {
    indexable: data?.indexable ?? true,
    isPrivate: (data as { is_private?: boolean } | null)?.is_private ?? false,
  };
}

/** Stores both visibility flags for an image. */
export async function setImageFlags(src: string, flags: ImageFlags): Promise<void> {
  const key = imageKeyOf(src);
  if (!key) return;
  const { error } = await supabase
    .from("image_settings")
    .upsert(
      { path: key, indexable: flags.indexable, is_private: flags.isPrivate } as never,
      { onConflict: "path" },
    );
  if (error) throw error;
}

/** Reads the search-visibility flag for an image. Unknown images default to visible. */
export async function getImageIndexable(src: string): Promise<boolean> {
  return (await getImageFlags(src)).indexable;
}

/** Stores the search-visibility flag for an image, leaving the private flag alone. */
export async function setImageIndexable(src: string, indexable: boolean): Promise<void> {
  const current = await getImageFlags(src);
  await setImageFlags(src, { ...current, indexable });
}
