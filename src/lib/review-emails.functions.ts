import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only lookup of reviewer email addresses. Emails are not readable
 * through the Data API (column privileges are revoked), so the studio reads
 * them here after the caller's admin role is verified.
 */
export const getReviewEmails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Record<string, string>> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return {};

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("testimonials").select("id,email");
    if (error) {
      console.error(`[reviews] email lookup failed: ${error.message}`);
      return {};
    }
    const map: Record<string, string> = {};
    for (const row of data ?? []) map[row.id as string] = (row.email as string) ?? "";
    return map;
  });
