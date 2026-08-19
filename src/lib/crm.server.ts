import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Ctx = { supabase: unknown; userId: string };

/** Throws unless the caller is a signed-in admin. Same accounts as the content studio. */
export async function assertCrmAdmin(context: Ctx): Promise<string> {
  const supabase = context.supabase as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
  };
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin access required");
  return context.userId;
}

/** Tables the generic CRM editor is allowed to touch. */
export const CRM_TABLES = [
  "crm_contacts",
  "crm_leads",
  "crm_bookings",
  "crm_invoices",
  "crm_tasks",
  "crm_activity",
  "crm_contracts",
  "crm_contract_fields",
  "crm_galleries",
  "crm_gallery_images",
  "crm_gallery_picks",
] as const;

export type CrmTable = (typeof CRM_TABLES)[number];

export function assertCrmTable(table: string): CrmTable {
  if (!(CRM_TABLES as readonly string[]).includes(table)) {
    throw new Error(`Unknown CRM table: ${table}`);
  }
  return table as CrmTable;
}

const ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

/** Unguessable share token. */
export function randomToken(length = 28): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** PBKDF2-SHA256 password hash: `pbkdf2$iterations$saltHex$hashHex`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100_000; // Workers cap PBKDF2 at 100k
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return `pbkdf2$${iterations}$${toHex(salt.buffer as ArrayBuffer)}$${toHex(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored) return true;
  const [scheme, iterRaw, saltHex, hashHex] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterRaw || !saltHex || !hashHex) return false;
  const salt = new Uint8Array((saltHex.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: Math.min(Number(iterRaw), 100_000), hash: "SHA-256" },
    key,
    256,
  );
  const a = toHex(bits);
  if (a.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return diff === 0;
}

/** Constant-time-ish compare for short access codes. */
export function sameCode(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface LinkGuard {
  accessCode: string;
  passwordHash: string;
  clientPasswordHash?: string;
  expiresAt: string | null;
  status?: string;
}

/** Validates expiry, access code and password for a public share link. */
export async function checkLinkAccess(
  guard: LinkGuard,
  supplied: { code?: string | undefined; password?: string | undefined },
): Promise<{ ok: true } | { ok: false; need: "expired" | "code" | "password"; reason: string }> {
  if (guard.expiresAt && new Date(guard.expiresAt).getTime() < Date.now()) {
    return { ok: false, need: "expired", reason: "This link has expired." };
  }
  if (guard.accessCode) {
    if (!supplied.code) return { ok: false, need: "code", reason: "Access code required." };
    if (!sameCode(supplied.code.trim(), guard.accessCode))
      return { ok: false, need: "code", reason: "That access code is not right." };
  }
  const hashes = [guard.passwordHash, guard.clientPasswordHash].filter(Boolean) as string[];
  if (hashes.length) {
    if (!supplied.password) return { ok: false, need: "password", reason: "Password required." };
    let matched = false;
    for (const h of hashes) {
      if (await verifyPassword(supplied.password, h)) matched = true;
    }
    if (!matched) return { ok: false, need: "password", reason: "That password is not right." };
  }
  return { ok: true };
}

/** Short-lived signed URL for a private CRM file. */
export async function signedUrl(bucket: string, path: string, seconds = 3600): Promise<string> {
  if (!path) return "";
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, seconds);
  if (error) throw new Error(error.message);
  return data?.signedUrl ?? "";
}

export async function logActivity(entry: {
  entityType: string;
  entityId?: string | null;
  kind: string;
  message: string;
  meta?: Record<string, unknown>;
  userId?: string | null;
}) {
  await supabaseAdmin.from("crm_activity").insert({
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    kind: entry.kind,
    message: entry.message,
    meta: (entry.meta ?? {}) as never,
    created_by: entry.userId ?? null,
  } as never);
}

export async function getCrmSettings() {
  const { data } = await supabaseAdmin.from("crm_settings").select("*").eq("id", true).maybeSingle();
  return data;
}
