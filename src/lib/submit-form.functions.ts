import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  subject: z.string().trim().min(1).max(200),
  values: z.record(z.string().max(80), z.string().max(5000)),
});

/**
 * Forwards a contact/quote submission to the third-party form service.
 * The endpoint URL lives in the database and is only readable server-side,
 * so it is never shipped to the browser.
 */
export const forwardFormSubmission = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; delivered: boolean; error?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("form_endpoint")
      .limit(1)
      .maybeSingle();

    const endpoint = settings?.form_endpoint?.trim();
    if (!endpoint || !/^https:\/\//i.test(endpoint)) {
      return { ok: true, delivered: false };
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ _subject: data.subject, ...data.values }),
      });
      if (!res.ok) {
        console.error(`[form] endpoint responded with ${res.status}`);
        return { ok: false, delivered: false, error: "Form service is unavailable." };
      }
      return { ok: true, delivered: true };
    } catch (error) {
      console.error("[form] submission failed", error);
      return { ok: false, delivered: false, error: "Could not reach the form service." };
    }
  });
