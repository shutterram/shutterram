import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type Row = { [key: string]: Json };

export interface SiteContentPayload {
  settings: Row | null;
  socials: Row[];
  categories: Row[];
  photos: Row[];
  edit_samples: Row[];
  services: Row[];
  stats: Row[];
  experience: Row[];
  testimonials: Row[];
  process_steps: Row[];
  page_sections: Row[];
  site_copy: Row[];
  theme_tokens: Row[];
}

const EMPTY: SiteContentPayload = {
  settings: null,
  socials: [],
  categories: [],
  photos: [],
  edit_samples: [],
  services: [],
  stats: [],
  experience: [],
  testimonials: [],
  process_steps: [],
  page_sections: [],
  site_copy: [],
  theme_tokens: [],
};

/**
 * Public, read-only fetch of every editable content row.
 * Falls back to empty (the app then renders its built-in defaults).
 */
export const getSiteContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteContentPayload> => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return EMPTY;

    const supabase = createClient<Database>(url, key, {
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

    const table = async (name: string) => {
      const { data, error } = await supabase
        .from(name as never)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) {
        console.error(`[content] failed to read ${name}: ${error.message}`);
        return [];
      }
      return (data ?? []) as unknown as Row[];
    };

    try {
      const [
        settingsRows,
        socials,
        categories,
        photos,
        edit_samples,
        services,
        stats,
        experience,
        testimonials,
        process_steps,
        page_sections,
        site_copy,
        theme_tokens,
      ] = await Promise.all([
        supabase
          .from("settings" as never)
          // The form endpoint now lives in the admin-only admin_settings table.
          .select(
            "id,name,tagline,email,phone,location,og_image,about_short,about_long,budget_ranges,hour_options,loader_shape,loader_size,loader_pulse_scale,loader_fade,glow_size,glow_blend,glow_softness,logo_header,logo_footer,logo_mobile,logo_loader,logo_favicon,logo_invert,logo_header_height,logo_header_offset_x,logo_header_offset_y,logo_mobile_height,logo_mobile_offset_x,logo_mobile_offset_y,logo_footer_height,logo_footer_offset_x,logo_footer_offset_y,logo_loader_height,logo_loader_offset_x,logo_loader_offset_y,updated_at",
          )
          .limit(1)
          .then((r) => (r.data ?? []) as unknown as Row[]),
        table("socials"),
        table("categories"),
        table("photos"),
        table("edit_samples"),
        table("services"),
        table("stats"),
        table("experience"),
        // The explicit column list is required: the email column is revoked at the
        // database level, so a `select("*")` here would fail with a permission error.
        // Reviewer emails are read only through the admin-only studio path.
        supabase
          .from("testimonials" as never)
          .select("id,name,role,occasion,quote,rating,images,status,sort_order")
          .order("sort_order", { ascending: true })
          .then((r) => (r.data ?? []) as unknown as Row[]),
        table("process_steps"),
        table("page_sections"),
        table("site_copy"),
        table("theme_tokens"),
      ]);

      return {
        settings: settingsRows[0] ?? null,
        socials,
        categories,
        photos,
        edit_samples,
        services,
        stats,
        experience,
        testimonials,
        process_steps,
        page_sections,
        site_copy,
        theme_tokens,
      };
    } catch (error) {
      console.error("[content] unexpected failure", error);
      return EMPTY;
    }
  },
);
