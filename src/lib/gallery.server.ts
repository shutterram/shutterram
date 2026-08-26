import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkLinkAccess, getCrmSettings, hashPassword } from "./crm.server";

export const GALLERY_BUCKET = "crm-galleries";

const enc = new TextEncoder();

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(`${process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "dev"}:gallery`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/** Time-limited signature that lets a client load one image without an account. */
export async function signImage(
  imageId: string,
  kind: "thumb" | "preview" | "orig",
): Promise<string> {
  const exp = Date.now() + 6 * 60 * 60 * 1000;
  const sig = await hmac(`${imageId}|${kind}|${exp}`);
  return `/api/public/crm/img/${imageId}?k=${kind}&e=${exp}&s=${sig}`;
}

export async function verifyImageSig(
  imageId: string,
  kind: string,
  exp: string,
  sig: string,
): Promise<boolean> {
  if (!exp || Number(exp) < Date.now()) return false;
  return (await hmac(`${imageId}|${kind}|${exp}`)) === sig;
}

export interface PublicGalleryImage {
  id: string;
  name: string;
  thumb: string;
  preview: string;
  orig: string;
  picked: boolean;
  starred: boolean;
  rating: number;
  label: string;
  comment: string;
}

export interface PublicGallery {
  ok: true;
  id: string;
  kind: string;
  title: string;
  message: string;
  welcome: string;
  submitted: boolean;
  allowDownload: boolean;
  allowClientPassword: boolean;
  hasClientPassword: boolean;
  requiresPickPin: boolean;
  maxPicks: number;
  showFilenames: boolean;
  allowRating: boolean;
  allowLabels: boolean;
  allowComments: boolean;
  gridDesktop: string;
  gridTablet: string;
  gridMobile: string;
  ogImage: string;
  defaultSort: string;
  images: PublicGalleryImage[];
}


export type PublicGalleryResult =
  | PublicGallery
  | { ok: false; need: "code" | "password" | "expired" | "missing"; reason: string };

export async function loadPublicGalleryMeta(
  token: string,
): Promise<{ title: string; description: string; ogImage: string }> {
  const { data } = await supabaseAdmin
    .from("crm_galleries")
    .select("title,message,og_image_id,cover_url,status")
    .eq("token", token)
    .maybeSingle();
  if (!data || data.status === "draft" || data.status === "archived") {
    return { title: "Your gallery | Shutter Ram", description: "Private client gallery.", ogImage: "" };
  }
  return {
    title: `${data.title || "Your gallery"} | Shutter Ram`,
    description: data.message || "View and choose your photographs from your private gallery.",
    ogImage: data.cover_url
      ? `/api/public/crm/gallery-og/${token}`
      : data.og_image_id
        ? await signImage(data.og_image_id, "preview")
        : "",
  };
}

export async function loadPublicGallery(
  token: string,
  supplied: { code?: string | undefined; password?: string | undefined },
): Promise<PublicGalleryResult> {
  const { data: gallery } = await supabaseAdmin
    .from("crm_galleries")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!gallery || gallery.status === "draft" || gallery.status === "archived") {
    return { ok: false, need: "missing", reason: "This gallery link is no longer available." };
  }

  const gate = await checkLinkAccess(
    {
      accessCode: gallery.access_code ?? "",
      passwordHash: gallery.password_hash ?? "",
      clientPasswordHash: gallery.client_password_hash ?? "",
      expiresAt: gallery.expires_at ?? null,
    },
    supplied,
  );
  if (!gate.ok) return { ok: false, need: gate.need, reason: gate.reason };

  const { data: images } = await supabaseAdmin
    .from("crm_gallery_images")
    .select("id,name,original_name,sort_order")
    .eq("gallery_id", gallery.id)
    .order("sort_order");

  const { data: picks } = await supabaseAdmin
    .from("crm_gallery_picks")
    .select("image_id,picked,starred,rating,label,comment")
    .eq("gallery_id", gallery.id);

  const pickMap = new Map(
    ((picks ?? []) as { image_id: string }[]).map((p) => [p.image_id, p as never]),
  );

  const settings = await getCrmSettings();

  await supabaseAdmin
    .from("crm_galleries")
    .update({ last_opened_at: new Date().toISOString() } as never)
    .eq("id", gallery.id);

  const out = await Promise.all(((images ?? []) as { id: string; name: string; original_name?: string }[]).map(async (img) => {
    const pick = pickMap.get(img.id) as
      | { picked: boolean; starred: boolean; rating: number; label: string; comment: string }
      | undefined;
    const [thumb, preview, orig] = await Promise.all([
      signImage(img.id, "thumb"),
      signImage(img.id, "preview"),
      signImage(img.id, "orig"),
    ]);
    return {
      id: img.id,
      name: img.original_name || img.name,
      thumb,
      preview,
      orig,
      picked: pick?.picked ?? false,
      starred: pick?.starred ?? false,
      rating: pick?.rating ?? 0,
      label: pick?.label ?? "",
      comment: pick?.comment ?? "",
    };
  }));

  return {
    ok: true,
    id: gallery.id,
    kind: gallery.kind ?? "cull",
    title: gallery.title ?? "",
    message: gallery.message ?? "",
    welcome: settings?.gallery_welcome ?? "",
    submitted: Boolean(gallery.submitted_at),
    allowDownload: gallery.allow_download ?? false,
    allowClientPassword: gallery.allow_client_password ?? true,
    hasClientPassword: Boolean(gallery.client_password_hash),
    requiresPickPin: Boolean((gallery as { pick_pin_hash?: string }).pick_pin_hash),

    maxPicks: gallery.max_picks ?? 0,
    showFilenames: settings?.gallery_show_filenames ?? false,
    allowRating: settings?.cull_allow_rating ?? true,
    allowLabels: settings?.cull_allow_labels ?? true,
    allowComments: settings?.cull_allow_comments ?? true,
    gridDesktop: gallery.grid_desktop ?? settings?.gallery_grid_desktop ?? "4",
    gridTablet: gallery.grid_tablet ?? settings?.gallery_grid_tablet ?? "3",
    gridMobile: gallery.grid_mobile ?? settings?.gallery_grid_mobile ?? "2",
    ogImage: gallery.og_image_id ? await signImage(gallery.og_image_id, "preview") : "",
    defaultSort: gallery.default_sort ?? "default",
    images: out,
  };
}

/** Checks the extra "selection PIN" that unlocks picking/commenting for the real client. */
export async function checkPickPin(
  token: string,
  pin: string | undefined,
): Promise<{ ok: boolean; reason?: string }> {
  const { data } = await supabaseAdmin
    .from("crm_galleries")
    .select("pick_pin_hash")
    .eq("token", token)
    .maybeSingle();
  const stored = (data as { pick_pin_hash?: string } | null)?.pick_pin_hash ?? "";
  if (!stored) return { ok: true };
  if (!pin) return { ok: false, reason: "Enter the selection PIN to make changes." };
  const { verifyPassword } = await import("./crm.server");
  if (!(await verifyPassword(pin.trim(), stored)))
    return { ok: false, reason: "That selection PIN is not right." };
  return { ok: true };
}

/** Client saves a pick/rating/label/comment on one image. */
export async function savePick(
  token: string,
  supplied: { code?: string | undefined; password?: string | undefined; pin?: string | undefined },
  patch: {
    imageId: string;
    picked?: boolean;
    starred?: boolean;
    rating?: number;
    label?: string;
    comment?: string;
  },
): Promise<{ ok: boolean; reason?: string }> {
  const { data: gallery } = await supabaseAdmin
    .from("crm_galleries")
    .select("id,access_code,password_hash,client_password_hash,expires_at,status,submitted_at,kind")
    .eq("token", token)
    .maybeSingle();
  if (!gallery || gallery.kind !== "cull") return { ok: false, reason: "Gallery not available." };
  // Clients may keep refining their picks after submitting; each submit simply
  // re-stamps the gallery.


  const gate = await checkLinkAccess(
    {
      accessCode: gallery.access_code ?? "",
      passwordHash: gallery.password_hash ?? "",
      clientPasswordHash: gallery.client_password_hash ?? "",
      expiresAt: gallery.expires_at ?? null,
    },
    supplied,
  );
  if (!gate.ok) return { ok: false, reason: gate.reason };

  // Starring is a harmless viewing aid; picks, ratings, labels and notes are
  // gated behind the selection PIN so forwarded links stay read-only.
  const changesSelection =
    patch.picked !== undefined ||
    patch.rating !== undefined ||
    patch.label !== undefined ||
    patch.comment !== undefined;
  if (changesSelection) {
    const pin = await checkPickPin(token, supplied.pin);
    if (!pin.ok) return pin;
  }


  const row: Record<string, unknown> = { gallery_id: gallery.id, image_id: patch.imageId };
  if (patch.picked !== undefined) row["picked"] = patch.picked;
  if (patch.starred !== undefined) row["starred"] = patch.starred;
  if (patch.rating !== undefined) row["rating"] = Math.max(0, Math.min(5, patch.rating));
  if (patch.label !== undefined) row["label"] = patch.label.slice(0, 40);
  if (patch.comment !== undefined) row["comment"] = patch.comment.slice(0, 1000);

  const { error } = await supabaseAdmin
    .from("crm_gallery_picks")
    .upsert(row as never, { onConflict: "gallery_id,image_id" });
  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

/** Client sets their own password for the link. */
export async function setClientPassword(
  token: string,
  supplied: { code?: string | undefined; password?: string | undefined },
  newPassword: string,
): Promise<{ ok: boolean; reason?: string }> {
  const { data: gallery } = await supabaseAdmin
    .from("crm_galleries")
    .select("id,access_code,password_hash,client_password_hash,expires_at,allow_client_password")
    .eq("token", token)
    .maybeSingle();
  if (!gallery) return { ok: false, reason: "Gallery not available." };
  if (!gallery.allow_client_password)
    return { ok: false, reason: "The photographer has locked the password for this gallery." };

  const gate = await checkLinkAccess(
    {
      accessCode: gallery.access_code ?? "",
      passwordHash: gallery.password_hash ?? "",
      clientPasswordHash: gallery.client_password_hash ?? "",
      expiresAt: gallery.expires_at ?? null,
    },
    supplied,
  );
  if (!gate.ok) return { ok: false, reason: gate.reason };
  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword))
    return { ok: false, reason: "Use at least 8 characters with a letter and a number." };

  await supabaseAdmin
    .from("crm_galleries")
    .update({ client_password_hash: await hashPassword(newPassword) } as never)
    .eq("id", gallery.id);
  return { ok: true };
}
