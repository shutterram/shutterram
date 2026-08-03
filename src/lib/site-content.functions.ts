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
      ] = await Promise.all([
        supabase
          .from("settings" as never)
          .select("*")
          .limit(1)
          .then((r) => (r.data ?? []) as unknown as Row[]),
        table("socials"),
        table("categories"),
        table("photos"),
        table("edit_samples"),
        table("services"),
        table("stats"),
        table("experience"),
        table("testimonials"),
        table("process_steps"),
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
      };
    } catch (error) {
      console.error("[content] unexpected failure", error);
      return EMPTY;
    }
  },
);
