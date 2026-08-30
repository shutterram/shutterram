import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PublicFinancialDocument } from "./financial-documents.server";

export const openFinancialDocument = createServerFn({ method: "GET" })
  .inputValidator((input: { kind: "invoice" | "bill"; token: string }) => input)
  .handler(async ({ data }): Promise<PublicFinancialDocument | null> => {
    const { loadPublicFinancialDocument } = await import("./financial-documents.server");
    return loadPublicFinancialDocument(data.kind, String(data.token).slice(0, 64));
  });

export const financialDocumentShortLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { kind: "invoice" | "bill"; id: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const table = data.kind === "invoice" ? "crm_invoices" : "crm_bills";
    const { data: document, error } = await supabaseAdmin
      .from(table)
      .select("number,public_token")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !document) throw new Error(error?.message ?? "Document not found");
    const target = `/${data.kind}/${document.public_token}`;
    const { data: existing } = await supabaseAdmin
      .from("short_links")
      .select("code")
      .eq("target_url", target)
      .maybeSingle();
    if (existing?.code) return { code: existing.code };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = crypto.randomUUID().replaceAll("-", "").slice(0, 7);
      const { error: insertError } = await supabaseAdmin.from("short_links").insert({
        code,
        label: `${data.kind === "invoice" ? "Invoice" : "Receipt"} ${document.number}`,
        target_url: target,
        og_image: "",
      });
      if (!insertError) return { code };
      if (insertError.code !== "23505") throw new Error(insertError.message);
    }
    throw new Error("Could not create a short document link");
  });

export const contractShortLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id).slice(0, 64) }))
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: contract, error } = await supabaseAdmin
      .from("crm_contracts")
      .select("title,token")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !contract) throw new Error(error?.message ?? "Contract not found");
    const target = `/sign/${contract.token}`;
    const { data: existing } = await supabaseAdmin
      .from("short_links")
      .select("code")
      .eq("target_url", target)
      .maybeSingle();
    if (existing?.code) return { code: existing.code };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = crypto.randomUUID().replaceAll("-", "").slice(0, 7);
      const { error: insertError } = await supabaseAdmin.from("short_links").insert({
        code,
        label: contract.title || "Contract",
        target_url: target,
        og_image: "",
      });
      if (!insertError) return { code };
      if (insertError.code !== "23505") throw new Error(insertError.message);
    }
    throw new Error("Could not create a short contract link");
  });
