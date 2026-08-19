import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkLinkAccess, getCrmSettings, logActivity, signedUrl } from "./crm.server";
import { ensureFolder, uploadToDrive } from "./google-drive.server";
import { safeTimezone, todayInZone } from "./timezones";
import { fieldDisplay } from "./contract-fields";

export const CONTRACT_BUCKET = "crm-docs";

export interface ContractField {
  id: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: string;
  label: string;
  placeholder: string;
  required: boolean;
  value: string;
  sort_order: number;
  role: string;
  /** Point size for the burned text; 0 = use the CRM default. */
  font_size?: number;
  bold?: boolean;
}

export interface PublicContract {
  ok: true;
  id: string;
  title: string;
  message: string;
  status: string;
  fileUrl: string;
  pageCount: number;
  fields: ContractField[];
  signedAt: string | null;
  signedUrl: string;
  footerNote: string;
  timezone: string;
  defaultFieldPt: number;
  defaultDatePt: number;
}

export type PublicContractResult =
  | PublicContract
  | { ok: false; need: "code" | "password" | "expired" | "missing"; reason: string };

export async function loadPublicContract(
  token: string,
  supplied: { code?: string | undefined; password?: string | undefined },
): Promise<PublicContractResult> {
  const { data: contract } = await supabaseAdmin
    .from("crm_contracts")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!contract || contract.status === "draft" || contract.status === "void") {
    return { ok: false, need: "missing", reason: "This contract link is no longer available." };
  }

  const gate = await checkLinkAccess(
    {
      accessCode: contract.access_code ?? "",
      passwordHash: contract.password_hash ?? "",
      expiresAt: contract.expires_at ?? null,
    },
    supplied,
  );
  if (!gate.ok) return { ok: false, need: gate.need, reason: gate.reason };

  const { data: fields } = await supabaseAdmin
    .from("crm_contract_fields")
    .select("*")
    .eq("contract_id", contract.id)
    .order("sort_order", { ascending: true });

  if (!contract.opened_at) {
    await supabaseAdmin
      .from("crm_contracts")
      .update({ opened_at: new Date().toISOString(), status: contract.status === "sent" ? "opened" : contract.status } as never)
      .eq("id", contract.id);
  }

  const settings = await getCrmSettings();

  return {
    ok: true,
    id: contract.id,
    title: contract.title ?? "",
    message: contract.message ?? "",
    status: contract.status ?? "sent",
    fileUrl: await signedUrl(CONTRACT_BUCKET, contract.file_path ?? ""),
    pageCount: contract.page_count ?? 1,
    fields: (fields ?? []) as unknown as ContractField[],
    signedAt: contract.signed_at ?? null,
    signedUrl: contract.signed_path ? await signedUrl(CONTRACT_BUCKET, contract.signed_path) : "",
    footerNote: settings?.contract_footer_note ?? "",
    defaultFieldPt:
      Number((settings as { contract_field_font_size?: number } | null)?.contract_field_font_size) ||
      11,
    defaultDatePt:
      Number((settings as { contract_date_font_size?: number } | null)?.contract_date_font_size) ||
      11,
    timezone: safeTimezone(
      (contract as { timezone?: string | null }).timezone ||
        (settings as { contract_timezone?: string | null } | null)?.contract_timezone ||
        null,
    ),
  };
}

function dataUrlToBytes(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  // Tolerate truncated / padded base64 so a bad value can never 500 the signing call.
  let b64 = dataUrl.slice(comma + 1).replace(/\s/g, "");
  b64 = b64.slice(0, b64.length - (b64.length % 4));
  if (!b64) return null;
  let bin: string;
  try {
    bin = atob(b64);
  } catch {
    return null;
  }
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** Burns the client's answers and signature into the PDF and files the copy away. */
export async function completeSigning(args: {
  token: string;
  code?: string | undefined;
  password?: string | undefined;
  values: Record<string, string>;
  boxes?: Record<string, { w: number; h: number }> | undefined;
  signer: { name: string; email?: string | undefined; phone?: string | undefined };
  resign?: boolean | undefined;
  ip: string;
  userAgent: string;
}): Promise<{ ok: true; signedUrl: string } | { ok: false; reason: string }> {
  const { data: contract } = await supabaseAdmin
    .from("crm_contracts")
    .select("*")
    .eq("token", args.token)
    .maybeSingle();
  if (!contract) return { ok: false, reason: "This contract link is no longer available." };
  if (contract.signed_at && !args.resign) {
    return { ok: false, reason: "This contract has already been signed." };
  }

  const gate = await checkLinkAccess(
    {
      accessCode: contract.access_code ?? "",
      passwordHash: contract.password_hash ?? "",
      expiresAt: contract.expires_at ?? null,
    },
    { code: args.code, password: args.password },
  );
  if (!gate.ok) return { ok: false, reason: gate.reason };

  const { data: fieldRows } = await supabaseAdmin
    .from("crm_contract_fields")
    .select("*")
    .eq("contract_id", contract.id);
  const fields = (fieldRows ?? []) as unknown as ContractField[];

  const crmSettings = await getCrmSettings();
  const tz = safeTimezone(
    (contract as { timezone?: string | null }).timezone ||
      (crmSettings as { contract_timezone?: string | null } | null)?.contract_timezone ||
      null,
  );
  const signedOn = new Date();
  const today = todayInZone(tz, signedOn);
  for (const f of fields) {
    if ((f.role ?? "client") !== "client") {
      // Photographer fields keep their saved answer; empty dates default to today.
      args.values[f.id] = f.value || (f.kind === "date" ? today : "");
      continue;
    }
    if (f.kind === "date" && !args.values[f.id]) {
      args.values[f.id] = today;
    }
    if (f.required && !args.values[f.id]) {
      return { ok: false, reason: `Please complete "${f.label || "all required fields"}".` };
    }
  }


  const download = await supabaseAdmin.storage
    .from(CONTRACT_BUCKET)
    .download(contract.file_path ?? "");
  if (download.error || !download.data) return { ok: false, reason: "Original document missing." };

  const { PDFDocument, StandardFonts, rgb } = (await import(
    "pdf-lib/dist/pdf-lib.esm.js"
  )) as unknown as typeof import("pdf-lib");
  const pdf = await PDFDocument.load(await download.data.arrayBuffer());
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const defaultPt =
    Number((crmSettings as { contract_field_font_size?: number } | null)?.contract_field_font_size) ||
    11;
  const defaultDatePt =
    Number((crmSettings as { contract_date_font_size?: number } | null)?.contract_date_font_size) ||
    11;
  const pages = pdf.getPages();

  for (const f of fields) {
    const page = pages[Math.max(0, (f.page ?? 1) - 1)];
    if (!page) continue;
    const { width, height } = page.getSize();
    const override = args.boxes?.[f.id];
    const fw = override?.w ?? f.w;
    const fh = override?.h ?? f.h;
    const bx = f.x * width;
    const bw = fw * width;
    const bh = fh * height;
    const by = height - f.y * height - bh;
    const value = args.values[f.id] ?? "";
    if (!value) continue;

    if (f.kind === "signature" || f.kind === "initials") {
      const bytes = dataUrlToBytes(value);
      if (!bytes) continue;
      let img;
      try {
        img = await pdf.embedPng(bytes);
      } catch {
        continue;
      }
      const scale = Math.min(bw / img.width, bh / img.height);
      page.drawImage(img, {
        x: bx,
        y: by,
        width: img.width * scale,
        height: img.height * scale,
      });
    } else {
      const text = fieldDisplay(f.kind, String(value));
      if (!text) continue;
      const face = f.bold ? fontBold : font;
      const size =
        Number(f.font_size) > 0
          ? Number(f.font_size)
          : f.kind === "date"
            ? defaultDatePt
            : defaultPt;
      page.drawText(text.slice(0, 300), {
        x: bx + 2,
        y: by + (bh - size) / 2 + size * 0.16,
        size,
        font: face,
        color: rgb(0.05, 0.05, 0.05),
      });
    }
  }

  // Audit footer on the last page.
  const last = pages[pages.length - 1];
  if (last) {
    last.drawText(
      `Signed by ${args.signer.name} on ${signedOn.toUTCString()} · IP ${args.ip}`,
      { x: 24, y: 16, size: 7, font, color: rgb(0.4, 0.4, 0.4) },
    );
  }

  const out = await pdf.save();
  const safeTitle = (contract.title || "contract").replace(/[^a-z0-9\-_ ]/gi, "").slice(0, 60);
  const signedPath = `signed/${contract.id}/${safeTitle || "contract"}-signed.pdf`;
  const upload = await supabaseAdmin.storage
    .from(CONTRACT_BUCKET)
    .upload(signedPath, out, { contentType: "application/pdf", upsert: true });
  if (upload.error) return { ok: false, reason: upload.error.message };

  let driveFileId = "";
  let driveLink = "";
  try {
    const settings = await getCrmSettings();
    const parent = settings?.drive_contracts_folder_id ?? "";
    if (parent) {
      const folder = await ensureFolder("Signed Contracts", parent);
      const res = await uploadToDrive({
        name: `${safeTitle || "contract"}-${today}.pdf`,
        mimeType: "application/pdf",
        bytes: out,
        parentId: folder,
      });
      driveFileId = res.id;
      driveLink = res.webViewLink;
    }
  } catch (error) {
    console.error("[contracts] Drive upload failed", error);
  }

  await supabaseAdmin
    .from("crm_contracts")
    .update({
      status: "signed",
      signed_path: signedPath,
      signed_at: signedOn.toISOString(),
      signer_name: args.signer.name,
      signer_email: args.signer.email ?? "",
      signer_phone: args.signer.phone ?? "",
      signed_ip: args.ip,
      signed_user_agent: args.userAgent.slice(0, 300),
      drive_file_id: driveFileId,
      drive_link: driveLink,
    } as never)
    .eq("id", contract.id);

  for (const f of fields) {
    await supabaseAdmin
      .from("crm_contract_fields")
      .update({ value: (args.values[f.id] ?? "").slice(0, 400000) } as never)
      .eq("id", f.id);
  }

  await logActivity({
    entityType: "contract",
    entityId: contract.id,
    kind: "signed",
    message: `${args.signer.name} signed "${contract.title}"`,
    meta: { driveLink },
  });

  return { ok: true, signedUrl: await signedUrl(CONTRACT_BUCKET, signedPath) };
}
