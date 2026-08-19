import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PublicGalleryResult } from "./gallery.server";

export interface GallerySummary {
  id: string;
  kind: string;
  title: string;
  token: string;
  status: string;
  contact_id: string | null;
  drive_folder_id: string;
  access_code: string;
  has_password: boolean;
  has_client_password: boolean;
  allow_client_password: boolean;
  allow_download: boolean;
  watermark: boolean;
  max_picks: number;
  expires_at: string | null;
  submitted_at: string | null;
  last_opened_at: string | null;
  image_count: number;
  picked_count: number;
  created_at: string;
}

export const listGalleries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GallerySummary[]> => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("crm_galleries")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: images } = await supabaseAdmin.from("crm_gallery_images").select("gallery_id");
    const { data: picks } = await supabaseAdmin
      .from("crm_gallery_picks")
      .select("gallery_id,picked");

    const counts = new Map<string, number>();
    for (const i of (images ?? []) as { gallery_id: string }[])
      counts.set(i.gallery_id, (counts.get(i.gallery_id) ?? 0) + 1);
    const picked = new Map<string, number>();
    for (const p of (picks ?? []) as { gallery_id: string; picked: boolean }[])
      if (p.picked) picked.set(p.gallery_id, (picked.get(p.gallery_id) ?? 0) + 1);

    return ((data ?? []) as Record<string, unknown>[]).map((g) => ({
      id: String(g["id"]),
      kind: String(g["kind"] ?? "cull"),
      title: String(g["title"] ?? ""),
      token: String(g["token"] ?? ""),
      status: String(g["status"] ?? "draft"),
      contact_id: (g["contact_id"] as string | null) ?? null,
      drive_folder_id: String(g["drive_folder_id"] ?? ""),
      access_code: String(g["access_code"] ?? ""),
      has_password: Boolean(g["password_hash"]),
      has_client_password: Boolean(g["client_password_hash"]),
      allow_client_password: Boolean(g["allow_client_password"]),
      allow_download: Boolean(g["allow_download"]),
      watermark: Boolean(g["watermark"]),
      max_picks: Number(g["max_picks"] ?? 0),
      expires_at: (g["expires_at"] as string | null) ?? null,
      submitted_at: (g["submitted_at"] as string | null) ?? null,
      last_opened_at: (g["last_opened_at"] as string | null) ?? null,
      image_count: counts.get(String(g["id"])) ?? 0,
      picked_count: picked.get(String(g["id"])) ?? 0,
      created_at: String(g["created_at"] ?? ""),
    }));
  });

export const createGallery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { kind: "cull" | "final"; title: string; contactId?: string | null }) => input,
  )
  .handler(async ({ data, context }): Promise<{ id: string; token: string }> => {
    const { assertCrmAdmin, randomToken, logActivity } = await import("./crm.server");
    const userId = await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = crypto.randomUUID();
    const token = randomToken(30);
    const { error } = await supabaseAdmin.from("crm_galleries").insert({
      id,
      token,
      kind: data.kind,
      title: data.title || (data.kind === "cull" ? "Selection gallery" : "Final gallery"),
      contact_id: data.contactId ?? null,
      status: "draft",
    } as never);
    if (error) throw new Error(error.message);
    await logActivity({
      entityType: "gallery",
      entityId: id,
      kind: "created",
      message: `Created ${data.kind} gallery "${data.title}"`,
      userId,
    });
    return { id, token };
  });

export const updateGallery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      title?: string;
      message?: string;
      status?: string;
      accessCode?: string;
      password?: string | null;
      clearClientPassword?: boolean;
      allowClientPassword?: boolean;
      allowDownload?: boolean;
      watermark?: boolean;
      maxPicks?: number;
      expiresAt?: string | null;
      driveFolderId?: string;
      contactId?: string | null;
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
    if (data.allowClientPassword !== undefined)
      patch["allow_client_password"] = data.allowClientPassword;
    if (data.allowDownload !== undefined) patch["allow_download"] = data.allowDownload;
    if (data.watermark !== undefined) patch["watermark"] = data.watermark;
    if (data.maxPicks !== undefined) patch["max_picks"] = data.maxPicks;
    if (data.expiresAt !== undefined) patch["expires_at"] = data.expiresAt || null;
    if (data.driveFolderId !== undefined) patch["drive_folder_id"] = data.driveFolderId.trim();
    if (data.contactId !== undefined) patch["contact_id"] = data.contactId;
    if (data.clearClientPassword) patch["client_password_hash"] = "";
    if (data.password !== undefined)
      patch["password_hash"] = data.password ? await hashPassword(data.password) : "";
    const { error } = await supabaseAdmin
      .from("crm_galleries")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: signed upload targets so the browser can push watermarked previews straight to storage. */
export const galleryUploadTargets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { galleryId: string; name: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { GALLERY_BUCKET } = await import("./gallery.server");
    const stem = `${data.galleryId}/${crypto.randomUUID()}`;
    const previewPath = `${stem}-preview.webp`;
    const thumbPath = `${stem}-thumb.webp`;
    const [preview, thumb] = await Promise.all([
      supabaseAdmin.storage.from(GALLERY_BUCKET).createSignedUploadUrl(previewPath),
      supabaseAdmin.storage.from(GALLERY_BUCKET).createSignedUploadUrl(thumbPath),
    ]);
    if (preview.error || thumb.error)
      throw new Error(preview.error?.message ?? thumb.error?.message ?? "Upload failed");
    return {
      previewPath,
      thumbPath,
      previewToken: preview.data.token,
      thumbToken: thumb.data.token,
      bucket: GALLERY_BUCKET,
    };
  });

export const registerGalleryImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      galleryId: string;
      images: {
        name: string;
        previewPath?: string;
        thumbPath?: string;
        driveFileId?: string;
        width?: number;
        height?: number;
        bytes?: number;
      }[];
      replace?: boolean;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.replace) {
      await supabaseAdmin.from("crm_gallery_images").delete().eq("gallery_id", data.galleryId);
    }
    const { count } = await supabaseAdmin
      .from("crm_gallery_images")
      .select("id", { count: "exact", head: true })
      .eq("gallery_id", data.galleryId);
    const base = count ?? 0;
    const rows = data.images.map((img, i) => ({
      gallery_id: data.galleryId,
      name: img.name,
      preview_path: img.previewPath ?? "",
      thumb_path: img.thumbPath ?? "",
      drive_file_id: img.driveFileId ?? "",
      width: img.width ?? 0,
      height: img.height ?? 0,
      bytes: img.bytes ?? 0,
      sort_order: base + i,
    }));
    if (rows.length) {
      const { error } = await supabaseAdmin.from("crm_gallery_images").insert(rows as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true, added: rows.length };
  });

/** Admin: the client's selections for a culling gallery. */
export const galleryResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { galleryId: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { signImage } = await import("./gallery.server");
    const { data: images } = await supabaseAdmin
      .from("crm_gallery_images")
      .select("id,name,sort_order")
      .eq("gallery_id", data.galleryId)
      .order("sort_order");
    const { data: picks } = await supabaseAdmin
      .from("crm_gallery_picks")
      .select("image_id,picked,rating,label,comment")
      .eq("gallery_id", data.galleryId);
    const map = new Map(
      ((picks ?? []) as { image_id: string }[]).map((p) => [p.image_id, p as never]),
    );
    const out = [];
    for (const img of (images ?? []) as { id: string; name: string }[]) {
      const p = map.get(img.id) as
        | { picked: boolean; rating: number; label: string; comment: string }
        | undefined;
      out.push({
        id: img.id,
        name: img.name,
        thumb: await signImage(img.id, "thumb"),
        preview: await signImage(img.id, "preview"),
        picked: p?.picked ?? false,
        rating: p?.rating ?? 0,
        label: p?.label ?? "",
        comment: p?.comment ?? "",
      });
    }
    return out;
  });

/* ---------------- public (client) side ---------------- */

export const openGallery = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; code?: string; password?: string }) => input)
  .handler(async ({ data }): Promise<PublicGalleryResult> => {
    const { loadPublicGallery } = await import("./gallery.server");
    return loadPublicGallery(String(data.token).slice(0, 64), {
      code: data.code,
      password: data.password,
    });
  });

export const saveGalleryPick = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      token: string;
      code?: string;
      password?: string;
      imageId: string;
      picked?: boolean;
      rating?: number;
      label?: string;
      comment?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { savePick } = await import("./gallery.server");
    return savePick(
      String(data.token).slice(0, 64),
      { code: data.code, password: data.password },
      {
        imageId: data.imageId,
        ...(data.picked !== undefined ? { picked: data.picked } : {}),
        ...(data.rating !== undefined ? { rating: data.rating } : {}),
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.comment !== undefined ? { comment: data.comment } : {}),
      },
    );
  });

export const submitGallery = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; code?: string; password?: string }) => input)
  .handler(async ({ data }) => {
    const { loadPublicGallery } = await import("./gallery.server");
    const { logActivity } = await import("./crm.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const gallery = await loadPublicGallery(String(data.token).slice(0, 64), {
      code: data.code,
      password: data.password,
    });
    if (!gallery.ok) return { ok: false, reason: gallery.reason };
    await supabaseAdmin
      .from("crm_galleries")
      .update({ submitted_at: new Date().toISOString(), status: "submitted" } as never)
      .eq("id", gallery.id);
    await logActivity({
      entityType: "gallery",
      entityId: gallery.id,
      kind: "submitted",
      message: `Client submitted selections for "${gallery.title}"`,
    });
    return { ok: true };
  });

export const setGalleryClientPassword = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { token: string; code?: string; password?: string; newPassword: string }) => input,
  )
  .handler(async ({ data }) => {
    const { setClientPassword } = await import("./gallery.server");
    return setClientPassword(
      String(data.token).slice(0, 64),
      { code: data.code, password: data.password },
      String(data.newPassword),
    );
  });
