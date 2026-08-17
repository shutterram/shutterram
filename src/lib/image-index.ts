import { supabase } from "@/integrations/supabase/client";

export interface ImageFlags {
  /** May the image appear anywhere on the public internet (search engines, previews)? */
  indexable: boolean;
  /** Private images are hidden from the site unless opened through a share link. */
  isPrivate: boolean;
  /** Soft drop shadow behind text sitting on this image — dark mode. */
  shadowDark: boolean;
  /** Soft drop shadow behind text sitting on this image — light mode. */
  shadowLight: boolean;
  /** Glow colour used in dark mode. */
  glowColorDark: string;
  /** Glow colour used in light mode. */
  glowColorLight: string;
  /** Glow intensity 0-100 — dark mode. */
  glowStrengthDark: number;
  /** Glow intensity 0-100 — light mode. */
  glowStrengthLight: number;
  /** How far the glow spreads, in px. */
  glowSpread: number;
}

export const defaultImageFlags: ImageFlags = {
  indexable: true,
  isPrivate: false,
  shadowDark: false,
  shadowLight: false,
  glowColorDark: "#000000",
  glowColorLight: "#ffffff",
  glowStrengthDark: 55,
  glowStrengthLight: 55,
  glowSpread: 140,
};

/**
 * Settings key for an image. Uploaded files are keyed by their storage key
 * (`/api/public/img/<key>`); images pasted in as external URLs are keyed by
 * the URL itself so their toggles work too.
 */
export function imageKeyOf(src: string): string | null {
  if (!src) return null;
  const match = src.match(/\/api\/public\/img\/(.+)$/);
  if (match?.[1]) return match[1].split("?")[0] ?? null;
  return src.trim().slice(0, 400) || null;
}

/** Reads both visibility flags for an image. Unknown images default to visible + public. */
export async function getImageFlags(src: string): Promise<ImageFlags> {
  const key = imageKeyOf(src);
  if (!key) return defaultImageFlags;
  const { data } = await supabase
    .from("image_settings")
    .select("indexable,is_private,shadow_dark,shadow_light,glow_color_dark,glow_color_light,glow_strength_dark,glow_strength_light,glow_spread")
    .eq("path", key)
    .maybeSingle();
  const row = data as
    | {
        indexable?: boolean;
        is_private?: boolean;
        shadow_dark?: boolean;
        shadow_light?: boolean;
        glow_color_dark?: string;
        glow_color_light?: string;
        glow_strength_dark?: number;
        glow_strength_light?: number;
        glow_spread?: number;
      }
    | null;
  return {
    indexable: row?.indexable ?? true,
    isPrivate: row?.is_private ?? false,
    shadowDark: row?.shadow_dark ?? false,
    shadowLight: row?.shadow_light ?? false,
    glowColorDark: row?.glow_color_dark ?? "#000000",
    glowColorLight: row?.glow_color_light ?? "#ffffff",
    glowStrengthDark: row?.glow_strength_dark ?? 55,
    glowStrengthLight: row?.glow_strength_light ?? 55,
    glowSpread: row?.glow_spread ?? 140,
  };
}

/** Stores both visibility flags for an image. */
export async function setImageFlags(src: string, flags: ImageFlags): Promise<void> {
  const key = imageKeyOf(src);
  if (!key) return;
  const { error } = await supabase
    .from("image_settings")
    .upsert(
      {
        path: key,
        indexable: flags.indexable,
        is_private: flags.isPrivate,
        shadow_dark: flags.shadowDark,
        shadow_light: flags.shadowLight,
        glow_color_dark: flags.glowColorDark,
        glow_color_light: flags.glowColorLight,
        glow_strength_dark: flags.glowStrengthDark,
        glow_strength_light: flags.glowStrengthLight,
        glow_spread: flags.glowSpread,
      } as never,
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
