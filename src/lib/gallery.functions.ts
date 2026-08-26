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
  raw_folder_id: string;
  source: string;
  compression: string;
  delivery_folder_link: string;
  access_code: string;
  has_password: boolean;
  has_client_password: boolean;
  has_pick_pin: boolean;
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
  grid_desktop: string;
  grid_tablet: string;
  grid_mobile: string;
  og_image_id: string | null;
  downscale_previews: boolean;
  preview_max_px: number;
  preview_max_bytes: number;
  default_sort: string;
  cover_url: string;
  cover_mode: string;
  cover_image_id: string | null;
  cover_path: string;
  message: string;
  show_message: boolean;
}

export const galleryMeta = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const { loadPublicGalleryMeta } = await import("./gallery.server");
    return loadPublicGalleryMeta(String(data.token).slice(0, 64));
  });

/** Admin: creates or reuses a compact, metadata-rich client gallery link. */
export const galleryShortLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { galleryId: string }) => ({
    galleryId: String(input.galleryId).slice(0, 64),
  }))
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: gallery, error: galleryError } = await supabaseAdmin
      .from("crm_galleries")
      .select("token,title")
      .eq("id", data.galleryId)
      .maybeSingle();
    if (galleryError || !gallery) throw new Error(galleryError?.message ?? "Gallery not found");

    const target = `/g/${gallery.token}`;
    const ogImage = `/api/public/crm/gallery-og/${gallery.token}`;
    const { data: existing } = await supabaseAdmin
      .from("short_links")
      .select("code")
      .eq("target_url", target)
      .limit(1)
      .maybeSingle();
    if (existing?.code) {
      await supabaseAdmin
        .from("short_links")
        .update({ label: gallery.title, og_image: ogImage } as never)
        .eq("code", existing.code);
      return { code: existing.code };
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = crypto.randomUUID().replaceAll("-", "").slice(0, 7);
      const { error } = await supabaseAdmin.from("short_links").insert({
        code,
        label: gallery.title,
        target_url: target,
        og_image: ogImage,
      } as never);
      if (!error) return { code };
      if (error.code !== "23505") throw new Error(error.message);
    }
    throw new Error("Could not create a short gallery link");
  });

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
      raw_folder_id: String(g["raw_folder_id"] ?? ""),
      source: String(g["source"] ?? "upload"),
      compression: String(g["compression"] ?? "balanced"),
      delivery_folder_link: String(g["delivery_folder_link"] ?? ""),
      access_code: String(g["access_code"] ?? ""),
      has_password: Boolean(g["password_hash"]),
      has_client_password: Boolean(g["client_password_hash"]),
      has_pick_pin: Boolean(g["pick_pin_hash"]),
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
      grid_desktop: String(g["grid_desktop"] ?? "4"),
      grid_tablet: String(g["grid_tablet"] ?? "3"),
      grid_mobile: String(g["grid_mobile"] ?? "2"),
      og_image_id: (g["og_image_id"] as string | null) ?? null,
      downscale_previews: Boolean(g["downscale_previews"] ?? true),
      preview_max_px: Number(g["preview_max_px"] ?? 1600),
      preview_max_bytes: Number(g["preview_max_bytes"] ?? 10485760),
      default_sort: String(g["default_sort"] ?? "default"),
      cover_url: String(g["cover_url"] ?? ""),
      cover_mode: String(g["cover_mode"] ?? "first"),
      cover_image_id: (g["cover_image_id"] as string | null) ?? null,
      cover_path: String(g["cover_path"] ?? ""),
      message: String(g["message"] ?? ""),
      show_message: Boolean(g["show_message"] ?? true),
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
      pickPin?: string | null;
      clearClientPassword?: boolean;
      allowClientPassword?: boolean;
      allowDownload?: boolean;
      watermark?: boolean;
      maxPicks?: number;
      expiresAt?: string | null;
      driveFolderId?: string;
      rawFolderId?: string;
      source?: string;
      compression?: string;
      contactId?: string | null;
      gridDesktop?: string;
      gridTablet?: string;
      gridMobile?: string;
      ogImageId?: string | null;
      downscalePreviews?: boolean;
      previewMaxPx?: number;
      previewMaxBytes?: number;
      defaultSort?: string;
      coverUrl?: string;
      coverMode?: string;
      coverImageId?: string | null;
      coverPath?: string;
      showMessage?: boolean;
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
    if (data.rawFolderId !== undefined) patch["raw_folder_id"] = data.rawFolderId.trim();
    if (data.source !== undefined) patch["source"] = data.source;
    if (data.compression !== undefined) patch["compression"] = data.compression;
    if (data.contactId !== undefined) patch["contact_id"] = data.contactId;
    if (data.gridDesktop !== undefined) patch["grid_desktop"] = data.gridDesktop;
    if (data.gridTablet !== undefined) patch["grid_tablet"] = data.gridTablet;
    if (data.gridMobile !== undefined) patch["grid_mobile"] = data.gridMobile;
    if (data.ogImageId !== undefined) {
      // Re-syncing a Drive gallery replaces its image rows. The editor may still
      // hold the former cover image id, so never write that stale foreign key.
      if (data.ogImageId) {
        const { data: coverImage } = await supabaseAdmin
          .from("crm_gallery_images")
          .select("id")
          .eq("id", data.ogImageId)
          .eq("gallery_id", data.id)
          .maybeSingle();
        patch["og_image_id"] = coverImage?.id ?? null;
      } else {
        patch["og_image_id"] = null;
      }
    }
    if (data.downscalePreviews !== undefined) patch["downscale_previews"] = data.downscalePreviews;
    if (data.previewMaxPx !== undefined)
      patch["preview_max_px"] = Math.max(640, Math.min(3200, Math.round(data.previewMaxPx)));
    if (data.previewMaxBytes !== undefined)
      patch["preview_max_bytes"] = Math.max(
        102400,
        Math.min(5242880, Math.round(data.previewMaxBytes)),
      );
    if (
      data.defaultSort !== undefined &&
      ["default", "name", "name-desc", "picked"].includes(data.defaultSort)
    )
      patch["default_sort"] = data.defaultSort;
    if (data.coverUrl !== undefined) patch["cover_url"] = data.coverUrl;
    if (data.coverMode !== undefined && ["none", "first", "og", "pick", "upload"].includes(data.coverMode))
      patch["cover_mode"] = data.coverMode;
    if (data.coverPath !== undefined) patch["cover_path"] = data.coverPath;
    if (data.showMessage !== undefined) patch["show_message"] = data.showMessage;
    if (data.coverImageId !== undefined) {
      // Same guard as the link-preview image: a Drive re-sync replaces rows,
      // so never write an id that no longer belongs to this gallery.
      if (data.coverImageId) {
        const { data: chosen } = await supabaseAdmin
          .from("crm_gallery_images")
          .select("id")
          .eq("id", data.coverImageId)
          .eq("gallery_id", data.id)
          .maybeSingle();
        patch["cover_image_id"] = chosen?.id ?? null;
      } else {
        patch["cover_image_id"] = null;
      }
    }
    if (data.clearClientPassword) patch["client_password_hash"] = "";
    if (data.password !== undefined)
      patch["password_hash"] = data.password ? await hashPassword(data.password) : "";
    if (data.pickPin !== undefined)
      patch["pick_pin_hash"] = data.pickPin ? await hashPassword(String(data.pickPin).trim()) : "";
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
    const previewPath = `${stem}-preview.jpg`;
    const thumbPath = `${stem}-thumb.jpg`;
    const originalPath = `${stem}-original`;
    const [preview, thumb, original] = await Promise.all([
      supabaseAdmin.storage.from(GALLERY_BUCKET).createSignedUploadUrl(previewPath),
      supabaseAdmin.storage.from(GALLERY_BUCKET).createSignedUploadUrl(thumbPath),
      supabaseAdmin.storage.from(GALLERY_BUCKET).createSignedUploadUrl(originalPath),
    ]);
    if (preview.error || thumb.error || original.error)
      throw new Error(
        preview.error?.message ??
          thumb.error?.message ??
          original.error?.message ??
          "Upload failed",
      );
    return {
      originalPath,
      previewPath,
      thumbPath,
      originalToken: original.data.token,
      previewToken: preview.data.token,
      thumbToken: thumb.data.token,
      bucket: GALLERY_BUCKET,
    };
  });

/** Admin: upload slot for a gallery's standalone social preview or cover image. */
export const galleryOgUploadTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { galleryId: string; kind?: "og" | "cover" }) => input)
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { GALLERY_BUCKET } = await import("./gallery.server");
    const path = `${data.galleryId}/${data.kind === "cover" ? "cover" : "og"}-${crypto.randomUUID()}.jpg`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from(GALLERY_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Could not prepare link image upload");
    return { bucket: GALLERY_BUCKET, path, token: signed.token };
  });

export const registerGalleryImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      galleryId: string;
      images: {
        name: string;
        originalName?: string;
        originalPath?: string;
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
      original_name: img.originalName ?? img.name,
      original_path: img.originalPath ?? "",
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
      .select(
        "id,name,original_name,drive_file_id,drive_raw_file_id,thumb_path,preview_path,sort_order",
      )
      .eq("gallery_id", data.galleryId)
      .order("sort_order");
    const { data: picks } = await supabaseAdmin
      .from("crm_gallery_picks")
      .select("image_id,picked,starred,rating,label,comment,done")
      .eq("gallery_id", data.galleryId);
    const map = new Map(
      ((picks ?? []) as { image_id: string }[]).map((p) => [p.image_id, p as never]),
    );
    const out = [];
    for (const img of (images ?? []) as {
      id: string;
      name: string;
      original_name?: string;
      drive_file_id?: string;
      drive_raw_file_id?: string;
      thumb_path?: string;
      preview_path?: string;
    }[]) {
      const p = map.get(img.id) as
        | {
            picked: boolean;
            starred: boolean;
            rating: number;
            label: string;
            comment: string;
            done: boolean;
          }
        | undefined;
      out.push({
        id: img.id,
        name: img.original_name || img.name,
        hasThumb: Boolean(img.thumb_path),
        hasPreview: Boolean(img.preview_path),
        hasRaw: Boolean(img.drive_raw_file_id),
        thumb: await signImage(img.id, "thumb"),
        preview: await signImage(img.id, "preview"),
        orig: await signImage(img.id, "orig"),
        picked: p?.picked ?? false,
        starred: p?.starred ?? false,
        done: p?.done ?? false,
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
      pin?: string;
      imageId: string;
      picked?: boolean;
      starred?: boolean;
      rating?: number;
      label?: string;
      comment?: string;
    }) => input,
  )
  .handler(async ({ data }) => {
    const { savePick } = await import("./gallery.server");
    return savePick(
      String(data.token).slice(0, 64),
      { code: data.code, password: data.password, pin: data.pin },
      {
        imageId: data.imageId,
        ...(data.picked !== undefined ? { picked: data.picked } : {}),
        ...(data.starred !== undefined ? { starred: data.starred } : {}),
        ...(data.rating !== undefined ? { rating: data.rating } : {}),
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.comment !== undefined ? { comment: data.comment } : {}),
      },
    );
  });

export const submitGallery = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { token: string; code?: string; password?: string; pin?: string }) => input,
  )
  .handler(async ({ data }) => {
    const { loadPublicGallery, checkPickPin } = await import("./gallery.server");
    const pinGate = await checkPickPin(String(data.token).slice(0, 64), data.pin);
    if (!pinGate.ok) return { ok: false, reason: pinGate.reason };
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

/* ---------------- Google Drive linked galleries ---------------- */

/**
 * Admin: pull an entire Drive folder into a gallery. Optionally matches each
 * preview to its RAW counterpart in a second folder, by file-name stem.
 */
export const importDriveFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { galleryId: string; folderId: string; rawFolderId?: string; replace?: boolean }) =>
      input,
  )
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { listFolderImages, listFolderFiles, matchByStem } =
      await import("./google-drive.server");

    const folderId = data.folderId.trim();
    if (!folderId) throw new Error("Add a Google Drive folder ID first.");
    const files = await listFolderImages(folderId);
    if (!files.length) throw new Error("No images found in that Drive folder.");

    const rawMatches = data.rawFolderId?.trim()
      ? matchByStem(await listFolderFiles(data.rawFolderId.trim()))
      : new Map<string, { id: string }>();

    if (data.replace) {
      await supabaseAdmin.from("crm_gallery_images").delete().eq("gallery_id", data.galleryId);
    }
    const { count } = await supabaseAdmin
      .from("crm_gallery_images")
      .select("id", { count: "exact", head: true })
      .eq("gallery_id", data.galleryId);
    const base = count ?? 0;

    let matched = 0;
    const rows = files.map((f, i) => {
      const stem = f.name.replace(/\.[^.]+$/, "").toLowerCase();
      const raw = rawMatches.get(stem);
      if (raw) matched += 1;
      return {
        gallery_id: data.galleryId,
        name: f.name,
        original_name: f.name,
        drive_file_id: f.id,
        drive_raw_file_id: raw?.id ?? "",
        bytes: Number(f.size ?? 0),
        sort_order: base + i,
      };
    });
    const { error } = await supabaseAdmin.from("crm_gallery_images").insert(rows as never);
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("crm_galleries")
      .update({
        source: "drive",
        drive_folder_id: folderId,
        ...(data.rawFolderId !== undefined ? { raw_folder_id: data.rawFolderId.trim() } : {}),
      } as never)
      .eq("id", data.galleryId);

    return { added: rows.length, rawMatched: matched };
  });

/** Admin: attach a browser-generated thumbnail to an existing (Drive) image row. */
export const attachImageThumb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { imageId: string; thumbPath: string; previewPath?: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("crm_gallery_images")
      .update({
        thumb_path: data.thumbPath,
        ...(data.previewPath ? { preview_path: data.previewPath } : {}),
      } as never)
      .eq("id", data.imageId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: signed upload slot for a single thumbnail. */
export const thumbUploadTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { galleryId: string; kind?: "thumb" | "preview" }) => input)
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { GALLERY_BUCKET } = await import("./gallery.server");
    const kind = data.kind === "preview" ? "preview" : "thumb";
    const path = `${data.galleryId}/${crypto.randomUUID()}-${kind}.jpg`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from(GALLERY_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Could not prepare upload");
    return { bucket: GALLERY_BUCKET, path, token: signed.token };
  });

/** Admin: tick a photo off while editing. */
export const setPickDone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { galleryId: string; imageId: string; done: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("crm_gallery_picks")
      .upsert({ gallery_id: data.galleryId, image_id: data.imageId, done: data.done } as never, {
        onConflict: "gallery_id,image_id",
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Admin: copy the RAW files behind the client's picks into a fresh Drive folder
 * and return its link. Copies happen inside Drive, so nothing is transferred.
 */
export const sendPicksToDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { galleryId: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { ensureFolder, copyFileToFolder, driveFolderLink } =
      await import("./google-drive.server");
    const { getCrmSettings } = await import("./crm.server");

    const { data: gallery } = await supabaseAdmin
      .from("crm_galleries")
      .select("id,title,raw_folder_id,delivery_folder_id")
      .eq("id", data.galleryId)
      .maybeSingle();
    if (!gallery) throw new Error("Gallery not found.");
    if (!gallery.raw_folder_id)
      throw new Error("Add the RAW files Drive folder to this gallery first.");

    const { data: images } = await supabaseAdmin
      .from("crm_gallery_images")
      .select("id,name,original_name,drive_raw_file_id")
      .eq("gallery_id", data.galleryId);
    const { data: picks } = await supabaseAdmin
      .from("crm_gallery_picks")
      .select("image_id,picked")
      .eq("gallery_id", data.galleryId);
    const pickedIds = new Set(
      ((picks ?? []) as { image_id: string; picked: boolean }[])
        .filter((p) => p.picked)
        .map((p) => p.image_id),
    );
    const chosen = (
      (images ?? []) as {
        id: string;
        name: string;
        original_name: string;
        drive_raw_file_id: string;
      }[]
    ).filter((i) => pickedIds.has(i.id));
    if (!chosen.length) throw new Error("The client has not picked any photos yet.");

    const settings = await getCrmSettings();
    const parent = String(
      (settings as Record<string, unknown> | null)?.["drive_raw_parent_folder_id"] ?? "",
    );
    const folderId = await ensureFolder(
      `${gallery.title || "Gallery"} — SELECTED RAW`,
      gallery.delivery_folder_id || parent,
    );

    let copied = 0;
    const missing: string[] = [];
    for (const img of chosen) {
      if (!img.drive_raw_file_id) {
        missing.push(img.original_name || img.name);
        continue;
      }
      try {
        await copyFileToFolder(img.drive_raw_file_id, folderId);
        copied += 1;
      } catch {
        missing.push(img.original_name || img.name);
      }
    }

    const link = driveFolderLink(folderId);
    await supabaseAdmin
      .from("crm_galleries")
      .update({ delivery_folder_id: folderId, delivery_folder_link: link } as never)
      .eq("id", data.galleryId);

    return { copied, missing, link };
  });

/** Public: unlock selection mode with the photographer's selection PIN. */
export const unlockGalleryPicking = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; pin: string }) => input)
  .handler(async ({ data }) => {
    const { checkPickPin } = await import("./gallery.server");
    return checkPickPin(String(data.token).slice(0, 64), String(data.pin));
  });

/* ------------------------------------------------------------------ */
/* Batched upload helpers — one round-trip for many photos instead of  */
/* three per photo, which is what made 500-photo runs crawl.           */
/* ------------------------------------------------------------------ */

export interface ThumbSlot {
  imageId: string;
  thumb: { path: string; token: string };
  preview: { path: string; token: string } | null;
}

/** Admin: signed upload slots for many thumbnails/previews at once. */
export const thumbUploadSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { galleryId: string; items: { imageId: string; withPreview: boolean }[] }) => input,
  )
  .handler(async ({ data, context }): Promise<{ bucket: string; slots: ThumbSlot[] }> => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { GALLERY_BUCKET } = await import("./gallery.server");
    const slots = await Promise.all(
      data.items.slice(0, 200).map(async (item) => {
        const thumbPath = `${data.galleryId}/${crypto.randomUUID()}-thumb.jpg`;
        const previewPath = `${data.galleryId}/${crypto.randomUUID()}-preview.jpg`;
        const [thumb, preview] = await Promise.all([
          supabaseAdmin.storage.from(GALLERY_BUCKET).createSignedUploadUrl(thumbPath),
          item.withPreview
            ? supabaseAdmin.storage.from(GALLERY_BUCKET).createSignedUploadUrl(previewPath)
            : null,
        ]);
        if (thumb.error || !thumb.data) throw new Error(thumb.error?.message ?? "Upload failed");
        return {
          imageId: item.imageId,
          thumb: { path: thumbPath, token: thumb.data.token },
          preview:
            preview && preview.data ? { path: previewPath, token: preview.data.token } : null,
        } satisfies ThumbSlot;
      }),
    );
    return { bucket: GALLERY_BUCKET, slots };
  });

/** Admin: attach many freshly built thumbnails/previews in one call. */
export const attachImageThumbs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { items: { imageId: string; thumbPath: string; previewPath?: string }[] }) => input,
  )
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.all(
      data.items.slice(0, 200).map((item) =>
        supabaseAdmin
          .from("crm_gallery_images")
          .update({
            thumb_path: item.thumbPath,
            ...(item.previewPath ? { preview_path: item.previewPath } : {}),
          } as never)
          .eq("id", item.imageId),
      ),
    );
    return { ok: true };
  });

/** Admin: signed upload slots for many new uploads at once. */
export const galleryUploadTargetsBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { galleryId: string; names: string[] }) => input)
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { GALLERY_BUCKET } = await import("./gallery.server");
    const targets = await Promise.all(
      data.names.slice(0, 200).map(async (name) => {
        const stem = `${data.galleryId}/${crypto.randomUUID()}`;
        const previewPath = `${stem}-preview.jpg`;
        const thumbPath = `${stem}-thumb.jpg`;
        const originalPath = `${stem}-original`;
        const [preview, thumb, original] = await Promise.all([
          supabaseAdmin.storage.from(GALLERY_BUCKET).createSignedUploadUrl(previewPath),
          supabaseAdmin.storage.from(GALLERY_BUCKET).createSignedUploadUrl(thumbPath),
          supabaseAdmin.storage.from(GALLERY_BUCKET).createSignedUploadUrl(originalPath),
        ]);
        if (preview.error || thumb.error || original.error)
          throw new Error(
            preview.error?.message ?? thumb.error?.message ?? original.error?.message ?? "Failed",
          );
        return {
          name,
          previewPath,
          previewToken: preview.data!.token,
          thumbPath,
          thumbToken: thumb.data!.token,
          originalPath,
          originalToken: original.data!.token,
        };
      }),
    );
    return { bucket: GALLERY_BUCKET, targets };
  });

/* ------------------------------------------------------------------ */
/* Preview-rebuild progress, stored server side so the bar survives a  */
/* logout and can be watched from any other device.                    */
/* ------------------------------------------------------------------ */

export interface PreviewJob {
  status: "running" | "done" | "stalled" | "cancelled";
  total: number;
  done: number;
  failed: number;
  message: string;
  updatedAt: string;
}

export const previewJobGet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { galleryId: string }) => input)
  .handler(async ({ data, context }): Promise<PreviewJob | null> => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("crm_preview_jobs")
      .select("status,total,done,failed,message,updated_at")
      .eq("gallery_id", data.galleryId)
      .maybeSingle();
    if (!row) return null;
    // A run only lives inside the browser tab that started it, so a job that
    // stopped reporting for two minutes is treated as interrupted.
    const stale = Date.now() - new Date(row.updated_at as string).getTime() > 120_000;
    return {
      status: row.status === "running" && stale ? "stalled" : (row.status as PreviewJob["status"]),
      total: row.total as number,
      done: row.done as number,
      failed: row.failed as number,
      message: (row.message as string) ?? "",
      updatedAt: row.updated_at as string,
    };
  });

export const previewJobSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      galleryId: string;
      status: "running" | "done" | "cancelled";
      total: number;
      done: number;
      failed?: number;
      message?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { assertCrmAdmin } = await import("./crm.server");
    await assertCrmAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("crm_preview_jobs").upsert(
      {
        gallery_id: data.galleryId,
        status: data.status,
        total: data.total,
        done: data.done,
        failed: data.failed ?? 0,
        message: data.message ?? "",
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "gallery_id" },
    );
    return { ok: true };
  });
