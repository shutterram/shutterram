import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ContractField, PublicContractResult } from "./contracts.server";

export interface ContractSummary {
  id: string;
  title: string;
  status: string;
  token: string;
  contact_id: string | null;
  page_count: number;
  expires_at: string | null;
  access_code: string;
  has_password: boolean;
  signer_name: string;
  signed_at: string | null;
  drive_link: string;
  created_at: string;
}

/** Admin: every contract with its share state. */
export const listContracts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ContractSummary[]> => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("crm_contracts")
      .select("*")
      .order("created_at", { ascending: false });
    return ((data ?? []) as Record<string, unknown>[]).map((c) => ({
      id: String(c["id"]),
      title: String(c["title"] ?? ""),
      status: String(c["status"] ?? "draft"),
      token: String(c["token"] ?? ""),
      contact_id: (c["contact_id"] as string | null) ?? null,
      page_count: Number(c["page_count"] ?? 1),
      expires_at: (c["expires_at"] as string | null) ?? null,
      access_code: String(c["access_code"] ?? ""),
      has_password: Boolean(c["password_hash"]),
      signer_name: String(c["signer_name"] ?? ""),
      signed_at: (c["signed_at"] as string | null) ?? null,
      drive_link: String(c["drive_link"] ?? ""),
      created_at: String(c["created_at"] ?? ""),
    }));
  });

/** Admin: create a contract from an uploaded PDF (base64). */
export const createContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      title: string;
      contactId?: string | null;
      pdfBase64: string;
      pageCount: number;
    }) => input,
  )
  .handler(async ({ data, context }): Promise<{ id: string; token: string }> => {
    const { assertCrmAdmin, randomToken, logActivity } = await import("./crm.server");
    const userId = await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { CONTRACT_BUCKET } = await import("./contracts.server");

    const bin = atob(data.pdfBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    if (bytes.length > 25 * 1024 * 1024) throw new Error("PDF is larger than 25MB.");

    const token = randomToken(28);
    const id = crypto.randomUUID();
    const path = `originals/${id}/document.pdf`;
    const up = await supabaseAdmin.storage
      .from(CONTRACT_BUCKET)
      .upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (up.error) throw new Error(up.error.message);

    const { error } = await supabaseAdmin.from("crm_contracts").insert({
      id,
      title: data.title || "Contract",
      contact_id: data.contactId ?? null,
      token,
      file_path: path,
      page_count: Math.max(1, data.pageCount),
      status: "draft",
    } as never);
    if (error) throw new Error(error.message);

    await logActivity({
      entityType: "contract",
      entityId: id,
      kind: "created",
      message: `Uploaded contract "${data.title}"`,
      userId,
    });
    return { id, token };
  });

/** Admin: full contract detail plus a viewing URL for the field editor. */
export const getContractDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin, signedUrl } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { CONTRACT_BUCKET } = await import("./contracts.server");
    const { data: c } = await supabaseAdmin
      .from("crm_contracts")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!c) throw new Error("Contract not found");
    const { data: fields } = await supabaseAdmin
      .from("crm_contract_fields")
      .select("*")
      .eq("contract_id", data.id)
      .order("sort_order");
    return {
      id: c.id,
      title: c.title ?? "",
      status: c.status ?? "draft",
      token: c.token ?? "",
      message: c.message ?? "",
      contactId: c.contact_id ?? null,
      bookingId: c.booking_id ?? null,
      accessCode: c.access_code ?? "",
      hasPassword: Boolean(c.password_hash),
      expiresAt: c.expires_at ?? null,
      pageCount: c.page_count ?? 1,
      signedAt: c.signed_at ?? null,
      timezone: (c as { timezone?: string | null }).timezone ?? "",
      signerName: c.signer_name ?? "",
      driveLink: c.drive_link ?? "",
      fileUrl: await signedUrl(CONTRACT_BUCKET, c.file_path ?? ""),
      signedUrl: c.signed_path ? await signedUrl(CONTRACT_BUCKET, c.signed_path) : "",
      fields: (fields ?? []) as unknown as ContractField[],
    };
  });

/** Admin: replace the field layout for a contract. */
export const saveContractFields = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { contractId: string; fields: ContractField[] }) => input)
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("crm_contract_fields").delete().eq("contract_id", data.contractId);
    if (data.fields.length) {
      const rows = data.fields.map((f, i) => ({
        id: f.id,
        contract_id: data.contractId,
        page: f.page,
        x: f.x,
        y: f.y,
        w: f.w,
        h: f.h,
        kind: f.kind,
        label: f.label,
        placeholder: f.placeholder ?? "",
        required: f.required,
        role: f.role ?? "client",
        value: (f.value ?? "").slice(0, 400000),
        font_size: Number(f.font_size) || 0,
        bold: Boolean(f.bold),
        sort_order: i,

      }));
      const { error } = await supabaseAdmin.from("crm_contract_fields").insert(rows as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Admin: share settings — publish, access code, password, expiry. */
export const updateContractSharing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      title?: string;
      message?: string;
      status?: string;
      accessCode?: string;
      password?: string | null;
      expiresAt?: string | null;
      contactId?: string | null;
      bookingId?: string | null;
      timezone?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin, hashPassword } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch["title"] = data.title;
    if (data.message !== undefined) patch["message"] = data.message;
    if (data.status !== undefined) patch["status"] = data.status;
    if (data.accessCode !== undefined) patch["access_code"] = data.accessCode.trim();
    if (data.expiresAt !== undefined) patch["expires_at"] = data.expiresAt || null;
    if (data.contactId !== undefined) patch["contact_id"] = data.contactId;
    if (data.bookingId !== undefined) patch["booking_id"] = data.bookingId;
    if (data.timezone !== undefined) patch["timezone"] = data.timezone.trim();
    if (data.password !== undefined) {
      patch["password_hash"] = data.password ? await hashPassword(data.password) : "";
    }
    const { error } = await supabaseAdmin
      .from("crm_contracts")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public: open a contract by its unguessable link. */
export const openContract = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; code?: string; password?: string }) => input)
  .handler(async ({ data }): Promise<PublicContractResult> => {
    const { loadPublicContract } = await import("./contracts.server");
    return loadPublicContract(String(data.token).slice(0, 64), {
      code: data.code,
      password: data.password,
    });
  });

/** Public: submit the completed, signed contract. */
export const signContract = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      token: string;
      code?: string;
      password?: string;
      values: Record<string, string>;
      boxes?: Record<string, { w: number; h: number }>;
      signer: { name: string; email?: string; phone?: string };
      resign?: boolean;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { completeSigning } = await import("./contracts.server");
    const request = getRequest();
    const ip =
      request?.headers.get("cf-connecting-ip") ??
      request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "";
    return completeSigning({
      token: String(data.token).slice(0, 64),
      code: data.code,
      password: data.password,
      values: data.values,
      boxes: data.boxes,
      signer: data.signer,
      resign: data.resign,
      ip,
      userAgent: request?.headers.get("user-agent") ?? "",
    });
  });

