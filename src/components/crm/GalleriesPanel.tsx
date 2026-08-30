import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  attachImageThumbs,
  createGallery,
  deleteGallery,
  galleryResults,
  reuseGalleryPreviews,
  importDriveFolder,
  sendPicksToDrive,
  setPickDone,
  thumbUploadSlots,
  galleryUploadTargetsBatch,
  galleryOgUploadTarget,
  galleryShortLink,
  listGalleries,
  previewJobGet,
  previewJobSet,
  registerGalleryImages,
  updateGallery,
  type GallerySummary,
  type PreviewJob,
} from "@/lib/gallery.functions";
import { crmSettingsGet } from "@/lib/crm.functions";
import { GalleryViewer } from "@/components/site/GalleryViewer";
import { EmailButton } from "@/components/crm/EmailButton";
import { downloadMany } from "@/lib/download";
import { SITE_URL } from "@/lib/seo";
import { createPortal } from "react-dom";
import { Btn, Card, CheckField, Empty, Label, SelectField, TextField, copyLink } from "./ui";

/** Preview compression presets, with a rough per-photo size so you can judge before uploading. */
export const COMPRESSION = {
  light: { label: "Light — best quality", maxPx: 2400, quality: 88, approxKb: 900 },
  balanced: { label: "Balanced — recommended", maxPx: 1800, quality: 78, approxKb: 420 },
  small: { label: "Small — fastest for clients", maxPx: 1280, quality: 68, approxKb: 180 },
} as const;

export type CompressionKey = keyof typeof COMPRESSION;

function prettySize(kb: number) {
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
}

function csvCell(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

interface Prepared {
  name: string;
  original: File;
  preview: Blob;
  thumb: Blob;
  width: number;
  height: number;
  bytes: number;
}

type ImageSource = HTMLImageElement | ImageBitmap;

function sourceSize(img: ImageSource) {
  return img instanceof HTMLImageElement
    ? { w: img.naturalWidth, h: img.naturalHeight }
    : { w: img.width, h: img.height };
}

/** Runs async work over a list with a fixed number of lanes. */
async function runPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      out[index] = await worker(items[index] as T, index);
    }
  });
  await Promise.all(lanes);
  return out;
}

/** Decodes a file or URL off the main thread when the browser supports it. */
async function decodeImage(source: File | Blob | string): Promise<ImageSource> {
  if (typeof source !== "string" && typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(source);
    } catch {
      /* fall through to the <img> path */
    }
  }
  const img = new Image();
  img.crossOrigin = "anonymous";
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not read image"));
      img.src = url;
    });
  } finally {
    if (typeof source !== "string") setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  return img;
}

function releaseImage(img: ImageSource) {
  if (!(img instanceof HTMLImageElement)) img.close();
}

async function drawTo(
  img: ImageSource,
  maxPx: number,
  quality: number,
  watermark: { text: string; opacity: number; size: number } | null,
  format: "image/jpeg" = "image/jpeg",
): Promise<{ blob: Blob; width: number; height: number }> {
  const { w: sw, h: sh } = sourceSize(img);
  const scale = Math.min(1, maxPx / Math.max(sw, sh));
  const w = Math.round(sw * scale);
  const h = Math.round(sh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  // This is the same browser-managed sRGB JPEG path used by the original
  // high-quality public-gallery preview builder.
  const ctx = canvas.getContext("2d", { colorSpace: "srgb" });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img as CanvasImageSource, 0, 0, w, h);
  if (watermark?.text) {
    const size = Math.max(12, (w * watermark.size) / 100);
    ctx.font = `600 ${size}px sans-serif`;
    ctx.fillStyle = `rgba(255,255,255,${watermark.opacity / 100})`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 9);
    ctx.fillText(watermark.text, 0, 0);
    ctx.restore();
  }
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, format, quality / 100));
  if (!blob) throw new Error("Could not process image");
  return { blob, width: w, height: h };
}

/** Lanes used when encoding + uploading photos in parallel. */
const ENCODE_LANES = 5;
async function drawToByteLimit(
  img: ImageSource,
  maxBytes: number,
  watermark: { text: string; opacity: number; size: number } | null,
) {
  // Keep this identical to the original high-quality preview builder: begin
  // with the source's full resolution at JPEG quality 100, then find the best
  // quality that actually fits. Resolution is reduced only when even quality
  // 72 cannot satisfy the selected byte ceiling.
  const { w: sw, h: sh } = sourceSize(img);
  let edge = Math.max(sw, sh);
  let best = await drawTo(img, edge, 100, watermark, "image/jpeg");
  if (best.blob.size <= maxBytes) return best;

  for (let pass = 0; pass < 6; pass += 1) {
    let low = 72;
    let high = 99;
    let fitting: typeof best | null = null;
    for (let attempt = 0; attempt < 9; attempt += 1) {
      const quality = Math.round((low + high) / 2);
      const candidate = await drawTo(img, edge, quality, watermark, "image/jpeg");
      if (candidate.blob.size <= maxBytes) {
        fitting = candidate;
        low = quality + 1;
      } else {
        high = quality - 1;
      }
    }
    if (fitting) return fitting;
    edge = Math.max(1600, Math.round(edge * 0.9));
    best = await drawTo(img, edge, 72, watermark, "image/jpeg");
  }
  return best;
}

export function GalleriesPanel({
  contacts,
}: {
  contacts: { id: string; name: string; email?: string }[];
}) {
  const list = useServerFn(listGalleries);
  const create = useServerFn(createGallery);
  const remove = useServerFn(deleteGallery);
  const shortLink = useServerFn(galleryShortLink);

  const [rows, setRows] = useState<GallerySummary[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const restoredRef = useRef(false);

  const load = useMemo(
    () => async () => {
      try {
        const next = (await list({ data: {} as never })) as GallerySummary[];
        setRows(next);
        // Restore the gallery that was open before a reload, once per mount.
        if (!restoredRef.current) {
          restoredRef.current = true;
          const stored = window.localStorage.getItem("crm:gallery") ?? "";
          if (stored && next.some((g) => g.id === stored)) setOpenId(stored);
          else if (stored) window.localStorage.removeItem("crm:gallery");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load galleries");
        setRows([]);
      }
    },
    [list],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Remember which gallery is open so a reload returns to it. Gated on the
  // restore pass so the mount-time null doesn't wipe the stored key first.
  useEffect(() => {
    if (!restoredRef.current) return;
    if (openId) window.localStorage.setItem("crm:gallery", openId);
    else window.localStorage.removeItem("crm:gallery");
  }, [openId]);

  const open = rows?.find((g) => g.id === openId) ?? null;

  async function getShortLinkForGallery(id: string) {
    try {
      const { code } = await shortLink({ data: { galleryId: id } });
      await copyLink(`${SITE_URL}/${code}`, (message) => toast.success(message));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create link");
    }
  }
  if (open) {
    return (
      <GalleryDetail
        gallery={open}
        contacts={contacts}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
        onSaved={load}
      />
    );
  }

  async function add(kind: "cull" | "final") {
    try {
      const res = await create({
        data: { kind, title: kind === "cull" ? "Photo selection" : "Final gallery" },
      });
      await load();
      setOpenId(res.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create gallery");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Client galleries</h2>
        <div className="flex gap-2">
          <Btn onClick={() => void add("cull")}>New selection gallery</Btn>
          <Btn variant="solid" onClick={() => void add("final")}>
            New final gallery
          </Btn>
        </div>
      </div>

      {rows === null ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-8">
          <Empty>No galleries yet. Create one to share photos with a client.</Empty>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
          {rows.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm">{g.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {g.kind === "cull" ? "Selection" : "Final"} · {g.status} · {g.image_count} photos
                  {g.kind === "cull" ? ` · ${g.picked_count} picked` : ""}
                  {g.submitted_at ? " · submitted" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn onClick={() => void getShortLinkForGallery(g.id)}>Copy link</Btn>
                <EmailButton
                  label="Email link"
                  subject={`Your gallery: ${g.title}`}
                  body={`Your ${g.kind === "cull" ? "selection" : "photo"} gallery is ready:\n${SITE_URL}/g/${g.token}\n\nEnjoy!`}
                  clientEmail={contacts.find((x) => x.id === g.contact_id)?.email}
                  clientName={contacts.find((x) => x.id === g.contact_id)?.name}
                />
                <Btn onClick={() => setOpenId(g.id)}>Open</Btn>
                <Btn
                  variant="danger"
                  onClick={() => {
                    if (!window.confirm("Delete this gallery and all of its images from storage?"))
                      return;
                    void remove({ data: { id: g.id } }).then(load);
                  }}
                >
                  Delete
                </Btn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GalleryDetail({
  gallery,
  contacts,
  onBack,
  onSaved,
}: {
  gallery: GallerySummary;
  contacts: { id: string; name: string; email?: string }[];
  onBack: () => void;
  onSaved: () => Promise<void>;
}) {
  const update = useServerFn(updateGallery);
  const getShortLink = useServerFn(galleryShortLink);
  const register = useServerFn(registerGalleryImages);
  const results = useServerFn(galleryResults);
  const settingsGet = useServerFn(crmSettingsGet);
  const driveImport = useServerFn(importDriveFolder);
  const pushToDrive = useServerFn(sendPicksToDrive);
  const ogTarget = useServerFn(galleryOgUploadTarget);
  const attachThumbs = useServerFn(attachImageThumbs);
  const reusePreviews = useServerFn(reuseGalleryPreviews);
  const thumbSlots = useServerFn(thumbUploadSlots);
  const uploadTargetsBatch = useServerFn(galleryUploadTargetsBatch);
  const jobGet = useServerFn(previewJobGet);
  const jobSet = useServerFn(previewJobSet);
  const markDone = useServerFn(setPickDone);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const ogFileRef = useRef<HTMLInputElement | null>(null);
  const coverFileRef = useRef<HTMLInputElement | null>(null);
  const cancelRef = useRef(false);
  const lastReportRef = useRef(0);
  const [progress, setProgress] = useState("");
  const [job, setJob] = useState<PreviewJob | null>(null);
  const jobRef = useRef<PreviewJob | null>(null);
  const [busy, setBusy] = useState("");

  /** Publishes progress to the server so any device can follow the same run. */
  const startJob = async (total: number, message: string) => {
    cancelRef.current = false;
    lastReportRef.current = Date.now();
    const next = { status: "running" as const, total, done: 0, failed: 0, message, updatedAt: "" };
    jobRef.current = next;
    setJob(next);
    try {
      await jobSet({
        data: { galleryId: gallery.id, status: "running", total, done: 0, failed: 0, message },
      });
    } catch {
      /* progress reporting must never block the actual work */
    }
  };

  const reportJob = async (total: number, done: number, failed: number, message: string) => {
    const next = { status: "running" as const, total, done, failed, message, updatedAt: "" };
    jobRef.current = next;
    setJob(next);
    // Keep writes bounded while making progress visible on other devices.
    if (Date.now() - lastReportRef.current < 1000 && done < total) return;
    lastReportRef.current = Date.now();
    try {
      await jobSet({
        data: { galleryId: gallery.id, status: "running", total, done, failed, message },
      });
    } catch {
      /* ignore */
    }
  };

  // Keep a genuinely active browser run alive even while one large image is
  // decoding/uploading. A refresh stops this heartbeat, making Resume appear.
  useEffect(() => {
    if (!busy && !progress) return;
    const timer = window.setInterval(() => {
      const current = jobRef.current;
      if (!current || current.status !== "running") return;
      void jobSet({
        data: {
          galleryId: gallery.id,
          status: "running",
          total: current.total,
          done: current.done,
          failed: current.failed,
          message: current.message,
        },
      }).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [busy, progress, gallery.id, jobSet]);

  const endJob = async (
    total: number,
    done: number,
    failed: number,
    status: "done" | "cancelled",
  ) => {
    const next = { status, total, done, failed, message: "", updatedAt: "" };
    jobRef.current = next;
    setJob(next);
    try {
      await jobSet({ data: { galleryId: gallery.id, status, total, done, failed, message: "" } });
    } catch {
      /* ignore */
    }
  };
  const [form, setForm] = useState({
    title: gallery.title,
    status: gallery.status,
    contactId: gallery.contact_id ?? "",
    accessCode: gallery.access_code,
    password: "",
    pickPin: "",
    allowClientPassword: gallery.allow_client_password,
    allowDownload: gallery.allow_download,
    watermark: gallery.watermark,
    maxPicks: gallery.max_picks,
    expiresAt: gallery.expires_at ? String(gallery.expires_at).slice(0, 10) : "",
    driveFolderId: gallery.drive_folder_id,
    rawFolderId: gallery.raw_folder_id,
    source: gallery.source || "upload",
    compression: (gallery.compression || "balanced") as CompressionKey,
    gridDesktop: gallery.grid_desktop || "4",
    gridTablet: gallery.grid_tablet || "3",
    gridMobile: gallery.grid_mobile || "2",
    ogImageId: gallery.og_image_id ?? "",
    downscalePreviews: gallery.downscale_previews ?? true,
    previewMaxPx: gallery.preview_max_px ?? 1600,
    previewMaxKb: Math.min(
      5120,
      Math.max(100, Math.round((gallery.preview_max_bytes ?? 1048576) / 1024)),
    ),
    defaultSort: gallery.default_sort || "default",
    coverUrl: gallery.cover_url || "",
    coverMode: gallery.cover_mode || "first",
    coverImageId: gallery.cover_image_id ?? "",
    coverPath: gallery.cover_path || "",
    message: gallery.message || "",
    showMessage: gallery.show_message ?? true,
  });
  const [picked, setPicked] = useState<Awaited<ReturnType<typeof galleryResults>> | null>(null);
  const [choosingOg, setChoosingOg] = useState(false);
  const [choosingCover, setChoosingCover] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [filter, setFilter] = useState<
    "all" | "picked" | "starred" | "rated" | "labelled" | "noted" | "nopreview" | "done"
  >("all");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const anchorRef = useRef<number | null>(null);
  const anchorAddRef = useRef(true);
  const [driveMove, setDriveMove] = useState<{
    open: boolean;
    mode: "copy" | "move";
    destination: "raw" | "delivery";
    folderName: string;
    link: string;
    results: { imageId: string; name: string; ok: boolean }[];
    imageIds: string[];
  }>({
    open: false,
    mode: "copy",
    destination: "raw",
    folderName: "",
    link: "",
    results: [],
    imageIds: [],
  });

  useEffect(() => {
    void (async () => {
      try {
        setPicked(await results({ data: { galleryId: gallery.id } }));
      } catch {
        setPicked([]);
      }
    })();
  }, [results, gallery.id]);

  // Esc deselects everything, like a desktop file manager.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSel(new Set());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Any device that opens this gallery follows the same rebuild, because the
  // progress lives in the database rather than in this browser tab.
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const current = await jobGet({ data: { galleryId: gallery.id } });
        if (!stop) setJob(current);
      } catch {
        /* ignore */
      }
    };
    void tick();
    const timer = window.setInterval(tick, 4000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [jobGet, gallery.id]);

  /**
   * Saving only stores settings. Rebuilding previews is deliberately never
   * triggered here — it runs solely from the "Rebuild previews" button.
   */
  async function save() {
    try {
      await update({
        data: {
          id: gallery.id,
          title: form.title,
          status: form.status,
          contactId: form.contactId || null,
          accessCode: form.accessCode,
          allowClientPassword: form.allowClientPassword,
          allowDownload: form.allowDownload,
          watermark: form.watermark,
          maxPicks: Number(form.maxPicks) || 0,
          expiresAt: form.expiresAt || null,
          driveFolderId: form.driveFolderId,
          rawFolderId: form.rawFolderId,
          source: form.source,
          compression: form.compression,
          gridDesktop: form.gridDesktop,
          gridTablet: form.gridTablet,
          gridMobile: form.gridMobile,
          ogImageId: form.ogImageId || null,
          downscalePreviews: form.downscalePreviews,
          previewMaxPx: form.previewMaxPx,
          previewMaxBytes: form.previewMaxKb * 1024,
          defaultSort: form.defaultSort,
          coverUrl: form.coverUrl,
          coverMode: form.coverMode,
          coverImageId: form.coverImageId || null,
          coverPath: form.coverPath,
          message: form.message,
          showMessage: form.showMessage,
          ...(form.password ? { password: form.password } : {}),
          ...(form.pickPin ? { pickPin: form.pickPin } : {}),
        },
      });
      toast.success("Gallery saved");
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
  }

  async function upload(files: FileList) {
    const settings = (await settingsGet({ data: {} as never })) as Record<string, unknown> | null;
    const thumbMax = Number(settings?.["thumb_max_px"] ?? 600);
    const mark = form.watermark
      ? {
          text: String(settings?.["watermark_text"] ?? ""),
          opacity: Number(settings?.["watermark_opacity"] ?? 35),
          size: Number(settings?.["watermark_size"] ?? 8),
        }
      : null;

    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;

    const registered: Parameters<typeof register>[0]["data"]["images"] = [];
    let finished = 0;
    let failed = 0;
    const total = images.length;
    await startJob(total, "Uploading photos");

    // Photos are handled in chunks so the signed upload slots are requested in
    // one round-trip per chunk instead of one per photo, and several photos
    // are encoded and uploaded at the same time.
    const CHUNK = 25;
    for (let start = 0; start < images.length; start += CHUNK) {
      if (cancelRef.current) break;
      const chunk = images.slice(start, start + CHUNK);
      const slots = await uploadTargetsBatch({
        data: { galleryId: gallery.id, names: chunk.map((f) => f.name) },
      });
      const prepared = await runPool(chunk, ENCODE_LANES, async (file, index) => {
        if (cancelRef.current) return null;
        const t = slots.targets[index];
        if (!t) return null;
        try {
          const img = await decodeImage(file);
          const preview = form.downscalePreviews
            ? await drawToByteLimit(img, form.previewMaxKb * 1024, mark)
            : await drawTo(img, 12000, 100, mark);
          const thumb = await drawTo(img, thumbMax, 70, mark);
          releaseImage(img);
          const [a, b, c] = await Promise.all([
            supabase.storage
              .from(slots.bucket)
              .uploadToSignedUrl(t.previewPath, t.previewToken, preview.blob, {
                contentType: preview.blob.type || "image/jpeg",
              }),
            supabase.storage
              .from(slots.bucket)
              .uploadToSignedUrl(t.thumbPath, t.thumbToken, thumb.blob, {
                contentType: "image/jpeg",
              }),
            supabase.storage
              .from(slots.bucket)
              .uploadToSignedUrl(t.originalPath, t.originalToken, file, {
                contentType: file.type || "application/octet-stream",
              }),
          ]);
          if (a.error || b.error || c.error) throw new Error(a.error?.message ?? "Upload failed");
          return {
            name: file.name,
            originalName: file.name,
            originalPath: t.originalPath,
            previewPath: t.previewPath,
            thumbPath: t.thumbPath,
            width: preview.width,
            height: preview.height,
            bytes: file.size,
          };
        } catch {
          failed += 1;
          return null;
        } finally {
          finished += 1;
          setProgress(`Uploading ${finished} of ${total}…`);
          void reportJob(total, finished, failed, "Uploading photos");
        }
      });
      const ok = prepared.filter(Boolean) as typeof registered;
      if (ok.length) {
        registered.push(...ok);
        await register({ data: { galleryId: gallery.id, images: ok } });
      }
    }

    await endJob(total, finished, failed, cancelRef.current ? "cancelled" : "done");
    if (registered.length) {
      toast.success(`${registered.length} photos added`);
      setPicked(await results({ data: { galleryId: gallery.id } }));
      await onSaved();
    }
    setProgress("");
    if (fileRef.current) fileRef.current.value = "";
  }

  /** Builds colour-consistent JPEG thumbs and previews for Drive-linked photos. */
  async function buildThumbs(rows: NonNullable<typeof picked>, force = false) {
    if (!force) {
      // Never rebuild something we already hold for another gallery of the
      // same kind — link those rows to the existing files first.
      try {
        const reused = await reusePreviews({ data: { galleryId: gallery.id } });
        if (reused.linked) {
          toast.success(`${reused.linked} previews reused from an existing gallery`);
          rows = await results({ data: { galleryId: gallery.id } });
          setPicked(rows);
        }
      } catch {
        /* reuse is an optimisation, never a blocker */
      }
    }
    // A Drive row is only fully processed when it has both the grid thumbnail
    // and, when compression is enabled, the dedicated opened-preview JPEG.
    // Older imports often had only a thumbnail, which made the viewer fall
    // back to that tiny file instead of generating the configured preview.
    const all = force
      ? rows
      : rows.filter((row) => !row.hasThumb || (form.downscalePreviews && !row.hasPreview));
    // Resume is based on database truth, never an array index, so failed or
    // reordered photos cannot be skipped accidentally.
    const missing = all;
    if (!missing.length) return;

    cancelRef.current = false;
    const total = missing.length;
    let finished = 0;
    let failed = 0;
    let firstError = "";
    await startJob(total, "Rebuilding previews");

    const CHUNK = 25;
    for (let start = 0; start < missing.length; start += CHUNK) {
      if (cancelRef.current) break;
      const chunk = missing.slice(start, start + CHUNK);
      const { bucket, slots } = await thumbSlots({
        data: {
          galleryId: gallery.id,
          items: chunk.map((row) => ({ imageId: row.id, withPreview: form.downscalePreviews })),
        },
      });
      const attachments = await runPool(chunk, ENCODE_LANES, async (row, index) => {
        if (cancelRef.current) return null;
        const slot = slots[index];
        if (!slot) return null;
        try {
          const work = (async () => {
            const image = await decodeImage(row.source || row.orig);
            const thumb = await drawTo(image, 600, 70, null);
            const preview =
              form.downscalePreviews && slot.preview
                ? await drawToByteLimit(image, form.previewMaxKb * 1024, null)
                : null;
            releaseImage(image);
            const uploads = await Promise.all([
              supabase.storage
                .from(bucket)
                .uploadToSignedUrl(slot.thumb.path, slot.thumb.token, thumb.blob, {
                  contentType: "image/jpeg",
                }),
              preview && slot.preview
                ? supabase.storage
                    .from(bucket)
                    .uploadToSignedUrl(slot.preview.path, slot.preview.token, preview.blob, {
                      contentType: preview.blob.type || "image/jpeg",
                    })
                : null,
            ]);
            if (uploads[0].error || uploads[1]?.error) throw new Error("upload failed");
            return {
              imageId: row.id,
              thumbPath: slot.thumb.path,
              ...(preview && slot.preview ? { previewPath: slot.preview.path } : {}),
            };
          })();
          const timeout = new Promise<never>((_, reject) => {
            const started = Date.now();
            const timer = window.setInterval(() => {
              if (cancelRef.current || Date.now() - started > 45_000) {
                window.clearInterval(timer);
                reject(new Error(cancelRef.current ? "Rebuild cancelled" : "Photo timed out"));
              }
            }, 250);
          });
          return await Promise.race([work, timeout]);
        } catch (error) {
          // Remember why, so the run can explain itself instead of silently
          // reporting "skipped".
          if (!firstError)
            firstError = error instanceof Error ? error.message : "Could not read this photo";
          failed += 1;
          return null;
        } finally {
          finished += 1;
          setBusy(`Building gallery JPEGs ${finished} of ${total}…`);
          void reportJob(total, finished, failed, "Rebuilding previews");
        }
      });
      const items = attachments.filter(Boolean) as {
        imageId: string;
        thumbPath: string;
        previewPath?: string;
      }[];
      if (items.length) await attachThumbs({ data: { items } });
    }

    await endJob(total, finished, failed, cancelRef.current ? "cancelled" : "done");
    setBusy("");
    setProgress("");
    if (failed) toast.error(`${failed} photos skipped — ${firstError || "unknown error"}`);
    setPicked(await results({ data: { galleryId: gallery.id } }));
  }

  async function importDrive(replace: boolean) {
    if (!form.driveFolderId.trim()) {
      toast.error("Add the Google Drive folder ID first.");
      return;
    }
    try {
      setBusy("Reading your Drive folder…");
      await save();
      const res = await driveImport({
        data: {
          galleryId: gallery.id,
          folderId: form.driveFolderId,
          rawFolderId: form.rawFolderId,
          replace,
        },
      });
      toast.success(
        `${res.added} photos linked${res.rawMatched ? ` · ${res.rawMatched} RAW matches` : ""}`,
      );
      let rows = await results({ data: { galleryId: gallery.id } });
      // Duplicate galleries reuse previews already built for the same kind of
      // gallery instead of re-encoding and re-storing the same photos.
      const reused = await reusePreviews({ data: { galleryId: gallery.id } });
      if (reused.linked) {
        toast.success(`${reused.linked} previews reused from an existing gallery`);
        rows = await results({ data: { galleryId: gallery.id } });
      }
      setPicked(rows);
      if (replace && form.ogImageId && !rows.some((row) => row.id === form.ogImageId)) {
        setForm((current) => ({ ...current, ogImageId: "" }));
      }
      // Previews are no longer built automatically after an import — use the
      // "Rebuild previews" button whenever you're ready so saving and syncing
      // stay instant.
      toast.message("Photos linked — click Rebuild previews when you're ready to build them");
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import from Drive");
    } finally {
      setBusy("");
    }
  }

  async function rebuildDrivePreviews(resume = false) {
    if (!picked?.length) return;
    try {
      const latest = resume ? await results({ data: { galleryId: gallery.id } }) : picked;
      await buildThumbs(latest, !resume);
      toast.success(
        resume
          ? "Rebuild resumed and finished from where it stopped"
          : "Opened previews rebuilt with the current limits",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rebuild previews");
      setBusy("");
    }
  }

  async function uploadOg(file: File) {
    if (!file.type.startsWith("image/")) return;
    try {
      setBusy("Preparing link preview…");
      const image = new Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not read image"));
        image.src = url;
      });
      const rendered = await drawTo(image, 1600, 90, null);
      URL.revokeObjectURL(url);
      const target = await ogTarget({ data: { galleryId: gallery.id } });
      const uploaded = await supabase.storage
        .from(target.bucket)
        .uploadToSignedUrl(target.path, target.token, rendered.blob, { contentType: "image/jpeg" });
      if (uploaded.error) throw uploaded.error;
      setForm((current) => ({ ...current, coverUrl: target.path, ogImageId: "" }));
      toast.success("Link preview image uploaded — save the gallery to apply it");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload link preview");
    } finally {
      setBusy("");
      if (ogFileRef.current) ogFileRef.current.value = "";
    }
  }

  /** Uploads the wide picture shown at the top of the client's gallery page. */
  async function uploadCover(file: File) {
    if (!file.type.startsWith("image/")) return;
    try {
      setBusy("Preparing cover picture…");
      const image = await decodeImage(file);
      const rendered = await drawTo(image, 2200, 82, null);
      releaseImage(image);
      const target = await ogTarget({ data: { galleryId: gallery.id, kind: "cover" } });
      const uploaded = await supabase.storage
        .from(target.bucket)
        .uploadToSignedUrl(target.path, target.token, rendered.blob, { contentType: "image/jpeg" });
      if (uploaded.error) throw uploaded.error;
      setForm((current) => ({ ...current, coverPath: target.path, coverMode: "upload" }));
      toast.success("Cover picture uploaded — save the gallery to apply it");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload cover picture");
    } finally {
      setBusy("");
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  }

  async function sendRawsToDrive() {
    try {
      setBusy(
        driveMove.mode === "move"
          ? "Moving RAW files inside Drive…"
          : "Copying RAW files inside Drive…",
      );
      const res = await pushToDrive({
        data: {
          galleryId: gallery.id,
          mode: driveMove.mode,
          destination: driveMove.destination,
          folderName: driveMove.folderName,
          imageIds: driveMove.imageIds,
        },
      });
      toast.success(
        `${res.copied} RAW files ${res.mode === "move" ? "moved" : "copied"}${res.missing.length ? ` · ${res.missing.length} without a match` : ""}`,
      );
      setDriveMove((s) => ({
        ...s,
        link: res.link,
        folderName: res.folderName,
        results: res.results,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not copy to Drive");
    } finally {
      setBusy("");
    }
  }

  const fileBase = () => (form.title || "gallery").replace(/[^a-z0-9\-_ ]/gi, "");

  function saveTextFile(text: string, name: string, type: string) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadWorksheet(rows?: NonNullable<typeof picked>) {
    const list = rows?.length ? rows : (picked ?? []).filter((p) => p.picked);
    const header = ["File name", "Stars", "Label", "Comment", "Starred", "RAW matched", "Done"];
    const body = list.map((r) =>
      [
        r.name,
        r.rating || "",
        r.label ?? "",
        r.comment ?? "",
        r.starred ? "yes" : "",
        r.hasRaw ? "yes" : "",
        r.done ? "yes" : "",
      ]
        .map(csvCell)
        .join(","),
    );
    const csv = [header.join(","), ...body].join("\r\n");
    saveTextFile("\uFEFF" + csv, `${fileBase()}-worksheet.csv`, "text/csv;charset=utf-8");
  }

  function downloadNames(rows: NonNullable<typeof picked>) {
    const lines = rows
      .map((p) =>
        [p.name, p.rating ? `★${p.rating}` : "", p.label ?? "", p.comment ?? ""]
          .filter(Boolean)
          .join(" · "),
      )
      .join("\n");
    saveTextFile(lines, `${fileBase()}-names.txt`, "text/plain;charset=utf-8");
  }

  /** Zips the chosen photos in the browser and saves them in one archive. */
  async function downloadFiles(rows: NonNullable<typeof picked>) {
    if (!rows.length) return;
    try {
      setBusy(`Preparing ${rows.length} photo${rows.length === 1 ? "" : "s"}…`);
      await downloadMany(
        rows.map((r) => ({ url: r.orig || r.preview || r.thumb, name: r.name })),
        `${fileBase()}-photos.zip`,
        (done, total) => setBusy(`Packing ${done} of ${total}…`),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download those photos");
    } finally {
      setBusy("");
    }
  }

  const pickedOnly = (picked ?? []).filter((p) => p.picked);
  const missingPreview = (picked ?? []).filter(
    (p) => !p.hasThumb || (form.downscalePreviews && !p.hasPreview),
  );
  const visible = (picked ?? []).filter((p) => {
    if (filter === "picked") return p.picked;
    if (filter === "starred") return p.starred;
    if (filter === "rated") return p.rating > 0;
    if (filter === "labelled") return Boolean(p.label);
    if (filter === "noted") return Boolean(p.comment);
    if (filter === "done") return p.done;
    if (filter === "nopreview") return !p.hasThumb || (form.downscalePreviews && !p.hasPreview);
    return true;
  });
  const selectedRows = (picked ?? []).filter((r) => sel.has(r.id));

  /** Windows-style click behaviour: plain toggle, shift extends from the anchor. */
  function selectAt(index: number, shift: boolean) {
    const row = visible[index];
    if (!row) return;
    if (shift && anchorRef.current !== null) {
      const [from, to] = [anchorRef.current, index].sort((a, b) => a - b) as [number, number];
      const add = anchorAddRef.current;
      setSel((prev) => {
        const next = new Set(prev);
        for (const r of visible.slice(from, to + 1)) {
          if (add) next.add(r.id);
          else next.delete(r.id);
        }
        return next;
      });
      return;
    }
    const add = !sel.has(row.id);
    anchorRef.current = index;
    anchorAddRef.current = add;
    setSel((prev) => {
      const next = new Set(prev);
      if (add) next.add(row.id);
      else next.delete(row.id);
      return next;
    });
  }

  /** Opens the Drive copy/move dialog for a chosen set (empty = the client's picks). */
  function openDriveMove(ids: string[]) {
    setDriveMove((s) => ({
      ...s,
      open: true,
      link: "",
      results: [],
      imageIds: ids,
      folderName: s.folderName || `${form.title || "Gallery"} — SELECTED`,
    }));
  }

  /** Rebuild just the photos handed in, so a failed tail can be retried on its own. */
  async function rebuildRows(rows: NonNullable<typeof picked>, message: string) {
    if (!rows.length) return;
    try {
      await buildThumbs(rows, true);
      setSel(new Set());
      setSelectMode(false);
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not rebuild previews");
      setBusy("");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Btn onClick={onBack}>← Galleries</Btn>
          <h2 className="mt-4 font-display text-2xl">{form.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn
            onClick={() => {
              void getShortLink({ data: { galleryId: gallery.id } })
                .then(({ code }) => copyLink(`${SITE_URL}/${code}`, (m) => toast.success(m)))
                .catch((error) =>
                  toast.error(error instanceof Error ? error.message : "Could not create link"),
                );
            }}
          >
            Copy client link
          </Btn>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void upload(e.target.files);
            }}
          />
          {form.source === "drive" ? (
            <>
              <Btn onClick={() => void importDrive(false)}>Import from Drive</Btn>
              {picked?.length ? (
                <Btn
                  variant={selectMode ? "solid" : "ghost"}
                  onClick={() => setSelectMode((v) => !v)}
                >
                  {selectMode ? "Exit rebuild mode" : "Rebuild previews"}
                </Btn>
              ) : null}
              <Btn
                onClick={() => {
                  if (!window.confirm("Replace every photo in this gallery with the Drive folder?"))
                    return;
                  void importDrive(true);
                }}
              >
                Re-sync Drive
              </Btn>
            </>
          ) : (
            <>
              <Btn onClick={() => fileRef.current?.click()}>Add photos</Btn>
              {picked?.length ? (
                <Btn
                  variant={selectMode ? "solid" : "ghost"}
                  onClick={() => setSelectMode((v) => !v)}
                >
                  {selectMode ? "Exit rebuild mode" : "Rebuild previews"}
                </Btn>
              ) : null}
            </>
          )}
          {pickedOnly.length ? (
            <>
              <Btn onClick={() => downloadWorksheet()}>Download worksheet</Btn>
              <Btn onClick={() => openDriveMove([])}>Send picks to Drive</Btn>
              <Btn onClick={() => downloadNames(pickedOnly)}>Download picked names</Btn>
            </>
          ) : null}

          <Btn variant="solid" onClick={() => void save()}>
            Save
          </Btn>
        </div>
      </div>

      {driveMove.open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/90 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-3xl border border-border bg-background p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-xl">Send picks to Drive</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pickedOnly.length} picked photo{pickedOnly.length === 1 ? "" : "s"} · files stay
                  inside Drive, nothing is re-uploaded.
                </p>
              </div>
              <Btn onClick={() => setDriveMove((s) => ({ ...s, open: false }))}>Close</Btn>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <SelectField
                label="Action"
                value={driveMove.mode}
                onChange={(v) => setDriveMove((s) => ({ ...s, mode: v as "copy" | "move" }))}
                options={[
                  { value: "copy", label: "Copy files" },
                  { value: "move", label: "Move files" },
                ]}
              />
              <SelectField
                label="New folder inside"
                value={driveMove.destination}
                onChange={(v) =>
                  setDriveMove((s) => ({ ...s, destination: v as "raw" | "delivery" }))
                }
                options={[
                  { value: "raw", label: "The RAW folder itself" },
                  { value: "delivery", label: "Delivery / parent folder" },
                ]}
              />
              <TextField
                label="Folder name"
                value={driveMove.folderName}
                onChange={(v) => setDriveMove((s) => ({ ...s, folderName: v }))}
              />
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {driveMove.mode === "move"
                ? "Moving re-parents the original RAW files — they will no longer appear in their current folder."
                : "Copying leaves the originals where they are."}
            </p>
            {!form.rawFolderId ? (
              <p className="mt-2 text-xs text-destructive">
                Add the RAW files Drive folder in this gallery's settings first, then save — the
                picks are matched against the RAW originals.
              </p>
            ) : null}

            <div className="mt-6 max-h-[45vh] overflow-y-auto border border-border p-3">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {pickedOnly.map((p) => {
                  const result = driveMove.results.find((r) => r.imageId === p.id);
                  return (
                    <figure key={p.id} className="relative">
                      <img
                        src={p.thumb}
                        alt={p.name}
                        className={
                          "aspect-square w-full object-cover " +
                          (result && !result.ok ? "opacity-40" : "")
                        }
                      />
                      {result ? (
                        <span
                          className={
                            "absolute left-0 top-0 px-1.5 py-0.5 text-[0.5rem] tracking-[0.2em] uppercase " +
                            (result.ok
                              ? "bg-foreground text-background"
                              : "bg-destructive text-destructive-foreground")
                          }
                        >
                          {result.ok ? (driveMove.mode === "move" ? "Moved" : "Copied") : "No RAW"}
                        </span>
                      ) : !p.hasRaw ? (
                        <span className="absolute left-0 top-0 bg-destructive px-1.5 py-0.5 text-[0.5rem] tracking-[0.2em] uppercase text-destructive-foreground">
                          No RAW
                        </span>
                      ) : null}
                      <figcaption className="truncate pt-1 text-[0.6rem] text-muted-foreground">
                        {p.name}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Btn variant="solid" onClick={() => void sendRawsToDrive()}>
                {busy
                  ? "Working…"
                  : driveMove.mode === "move"
                    ? "Move picked files"
                    : "Copy picked files"}
              </Btn>
              {driveMove.link ? (
                <a
                  className="text-xs underline underline-offset-4"
                  href={driveMove.link}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Open the new folder in Google Drive
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {job && (job.status === "running" || job.status === "stalled") ? (
        <div className="mt-4 border border-border p-3">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {job.message || "Processing"} · {job.done} of {job.total}
              {job.failed ? ` · ${job.failed} skipped` : ""}
              {job.status === "stalled" || (job.status === "running" && !busy && !progress)
                ? " · paused"
                : ""}
            </span>
            {job.status === "running" && (busy || progress) ? (
              <button
                type="button"
                className="underline"
                onClick={() => {
                  cancelRef.current = true;
                  setBusy("");
                  setProgress("Cancelling — finishing the photos already in flight…");
                }}
              >
                Cancel
              </button>
            ) : null}
            {(job.status === "stalled" || job.status === "running") && !busy && !progress ? (
              <span className="flex gap-3">
                <button
                  type="button"
                  className="underline"
                  onClick={() => void rebuildDrivePreviews(true)}
                >
                  Resume from {job.done}
                </button>
                <button
                  type="button"
                  className="underline"
                  onClick={() => void rebuildDrivePreviews(false)}
                >
                  Restart
                </button>
              </span>
            ) : null}
          </div>
          <div className="mt-2 h-1 w-full bg-muted">
            <div
              className="h-1 bg-foreground transition-all"
              style={{
                width: `${job.total ? Math.min(100, Math.round((job.done / job.total) * 100)) : 0}%`,
              }}
            />
          </div>
        </div>
      ) : null}
      {progress || busy ? (
        <p className="mt-4 text-sm text-muted-foreground">{progress || busy}</p>
      ) : null}
      {gallery.delivery_folder_link ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Selected RAW folder:{" "}
          <a
            className="underline"
            href={gallery.delivery_folder_link}
            target="_blank"
            rel="noreferrer noopener"
          >
            open in Google Drive
          </a>
        </p>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <Label>
            {gallery.kind === "cull" ? "Client selections" : "Photos"} · {picked?.length ?? 0} total
          </Label>
          {gallery.kind === "cull" && pickedOnly.length ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {pickedOnly.length} picked
              {gallery.submitted_at ? " · submitted by the client" : " · not submitted yet"}
            </p>
          ) : null}
          {picked === null ? (
            <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
          ) : picked.length === 0 ? (
            <div className="mt-6">
              <Empty>No photos uploaded yet.</Empty>
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {(
                  [
                    ["all", `All ${picked.length}`],
                    ["picked", `Picked ${pickedOnly.length}`],
                    ["starred", `Starred ${picked.filter((r) => r.starred).length}`],
                    ["rated", `Rated ${picked.filter((r) => r.rating > 0).length}`],
                    ["labelled", `Labelled ${picked.filter((r) => r.label).length}`],
                    ["noted", `Noted ${picked.filter((r) => r.comment).length}`],
                    ["done", `Done ${picked.filter((r) => r.done).length}`],
                    ["nopreview", `No preview ${missingPreview.length}`],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={
                      "border px-3 py-1.5 text-[0.6rem] tracking-[0.18em] uppercase transition-colors " +
                      (filter === key
                        ? "border-foreground bg-foreground text-background"
                        : "border-hairline text-muted-foreground hover:text-foreground")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {sel.size
                    ? `${sel.size} selected`
                    : selectMode
                      ? "Selection mode — click photos, shift-click for a range"
                      : "Click a photo to open it · right-click or shift-click to select"}
                </span>
                <Btn onClick={() => setSel(new Set(visible.map((r) => r.id)))}>
                  Select all shown
                </Btn>
                <Btn onClick={() => setSel(new Set())}>Deselect all</Btn>
                {missingPreview.length ? (
                  <Btn onClick={() => void rebuildRows(missingPreview, "Missing previews rebuilt")}>
                    Rebuild missing only ({missingPreview.length})
                  </Btn>
                ) : null}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {visible.map((p, index) => {
                  const isSel = sel.has(p.id);
                  const built = p.hasThumb && (!form.downscalePreviews || p.hasPreview);
                  return (
                    <figure
                      key={p.id}
                      className={
                        "relative cursor-pointer " +
                        (isSel
                          ? "outline outline-2 outline-offset-2 outline-foreground"
                          : choosingOg || choosingCover
                            ? "outline-offset-2 hover:outline hover:outline-1 hover:outline-foreground"
                            : "")
                      }
                      onContextMenu={(event) => {
                        if (choosingOg || choosingCover) return;
                        event.preventDefault();
                        selectAt(index, event.shiftKey);
                      }}
                      onClick={(event) => {
                        if (choosingCover) {
                          setForm((current) => ({
                            ...current,
                            coverMode: "pick",
                            coverImageId: p.id,
                          }));
                          setChoosingCover(false);
                          toast.success("Cover picture selected — save the gallery to apply it");
                          return;
                        }
                        if (choosingOg) {
                          setForm((current) => ({ ...current, ogImageId: p.id, coverUrl: "" }));
                          setChoosingOg(false);
                          toast.success("Link preview selected — save the gallery to apply it");
                          return;
                        }
                        if (
                          selectMode ||
                          event.shiftKey ||
                          event.metaKey ||
                          event.ctrlKey ||
                          sel.size > 0
                        ) {
                          selectAt(index, event.shiftKey);
                          return;
                        }
                        anchorRef.current = index;
                        setViewer(index);
                      }}
                    >
                      <div className="relative">
                        <img
                          src={p.thumb}
                          alt={p.name}
                          className="aspect-square w-full object-cover"
                        />
                        {choosingOg || choosingCover ? (
                          <span className="absolute inset-x-0 bottom-0 bg-background/90 px-2 py-2 text-center text-[0.55rem] tracking-[0.2em] uppercase">
                            {choosingCover ? "Use as cover" : "Use as link preview"}
                          </span>
                        ) : null}
                        <span
                          className={
                            "absolute right-0 top-0 px-2 py-1 text-[0.5rem] tracking-[0.18em] uppercase " +
                            (built
                              ? "bg-background/85 text-muted-foreground"
                              : "bg-destructive text-destructive-foreground")
                          }
                        >
                          {built ? "Built" : p.hasThumb ? "No preview" : "Not built"}
                        </span>
                        {p.picked ? (
                          <span className="absolute left-0 top-0 bg-foreground px-2 py-1 text-[0.55rem] tracking-[0.2em] uppercase text-background">
                            Picked
                          </span>
                        ) : null}
                        {p.picked && !choosingOg && !choosingCover ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              const next = !p.done;
                              setPicked(
                                (rows) =>
                                  rows?.map((r) => (r.id === p.id ? { ...r, done: next } : r)) ??
                                  rows,
                              );
                              void markDone({
                                data: { galleryId: gallery.id, imageId: p.id, done: next },
                              });
                            }}
                            className={
                              "absolute bottom-0 left-0 px-2 py-1 text-[0.55rem] tracking-[0.2em] uppercase " +
                              (p.done ? "bg-foreground text-background" : "bg-background/80")
                            }
                          >
                            {p.done ? "Done" : "Mark done"}
                          </button>
                        ) : null}
                      </div>
                      <figcaption className="mt-1 space-y-0.5">
                        <span className="block truncate text-[0.65rem]">{p.name}</span>
                        <span className="flex flex-wrap items-center gap-1 text-[0.6rem] text-muted-foreground">
                          {p.starred ? <span title="Starred">★</span> : null}
                          {p.rating ? <span>{"★".repeat(p.rating)}</span> : null}
                          {p.label ? (
                            <span className="border border-hairline px-1">{p.label}</span>
                          ) : null}
                          {p.comment ? <span title={p.comment}>Note</span> : null}
                        </span>
                        {p.comment ? (
                          <span className="block line-clamp-2 text-[0.65rem] text-muted-foreground">
                            {p.comment}
                          </span>
                        ) : null}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <Card className="lg:sticky lg:top-8 lg:self-start">
          <Label>Gallery settings</Label>
          <div className="mt-3 space-y-3">
            <TextField
              label="Title"
              value={form.title}
              onChange={(v) => setForm({ ...form, title: v })}
            />
            <SelectField
              label="Client"
              value={form.contactId}
              onChange={(v) => setForm({ ...form, contactId: v })}
              options={[
                { value: "", label: "— none —" },
                ...contacts.map((c) => ({ value: c.id, label: c.name || "Unnamed" })),
              ]}
            />
            <SelectField
              label="Status"
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v })}
              options={[
                { value: "draft", label: "Draft (link disabled)" },
                { value: "live", label: "Live" },
                { value: "submitted", label: "Submitted" },
                { value: "archived", label: "Archived" },
              ]}
            />
            <TextField
              label="Access code (optional)"
              value={form.accessCode}
              onChange={(v) => setForm({ ...form, accessCode: v })}
              onReset={() => {
                if (!window.confirm("Clear the access code on this gallery?")) return;
                void update({ data: { id: gallery.id, accessCode: "" } })
                  .then(async () => {
                    setForm({ ...form, accessCode: "" });
                    toast.success("Access code reset");
                    await onSaved();
                  })
                  .catch((error) =>
                    toast.error(error instanceof Error ? error.message : "Could not reset"),
                  );
              }}
              resetHint="Clears the code"
            />
            <TextField
              label="Password (leave blank to keep)"
              type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              onReset={() => {
                if (!window.confirm("Clear the gallery password (and any password the client set)?"))
                  return;
                void update({ data: { id: gallery.id, password: "", clearClientPassword: true } })
                  .then(async () => {
                    setForm({ ...form, password: "" });
                    toast.success("Password reset");
                    await onSaved();
                  })
                  .catch((error) =>
                    toast.error(error instanceof Error ? error.message : "Could not reset"),
                  );
              }}
              resetHint="Opens without a password"
            />
            <div>
              <TextField
                label={`Selection PIN — numbers only ${gallery.has_pick_pin ? "(set — leave blank to keep)" : "(optional)"}`}
                type="password"
                numeric
                maxLength={12}
                value={form.pickPin}
                onChange={(v) => setForm({ ...form, pickPin: v })}
                onReset={() => {
                  if (!window.confirm("Clear the selection PIN on this gallery?")) return;
                  void update({ data: { id: gallery.id, pickPin: "" } })
                    .then(async () => {
                      setForm({ ...form, pickPin: "" });
                      toast.success("Selection PIN reset");
                      await onSaved();
                    })
                    .catch((error) =>
                      toast.error(error instanceof Error ? error.message : "Could not reset"),
                    );
                }}
                resetHint="Anyone with the link can pick"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Only people with this PIN can pick photos, rate or leave notes. Anyone with the link
                (friends, family) can still view.
              </p>
            </div>

            <div className="border border-hairline p-3">
              <p className="text-xs text-muted-foreground">
                Forgot the PIN or password? Clear every client lock on this gallery — access code,
                gallery password, the password the client set, and the selection PIN. The link keeps
                working; it just opens without asking for anything.
              </p>
              <Btn
                className="mt-3"
                onClick={() => {
                  if (!window.confirm("Reset every access code, password and PIN on this gallery?"))
                    return;
                  void update({
                    data: {
                      id: gallery.id,
                      accessCode: "",
                      password: "",
                      pickPin: "",
                      clearClientPassword: true,
                    },
                  })
                    .then(async () => {
                      setForm({ ...form, accessCode: "", password: "", pickPin: "" });
                      toast.success("All client locks reset");
                      await onSaved();
                    })
                    .catch((error) =>
                      toast.error(error instanceof Error ? error.message : "Could not reset"),
                    );
                }}
              >
                Reset all client locks
              </Btn>
            </div>

            <CheckField
              label="Let the client set their own password"
              checked={form.allowClientPassword}
              onChange={(v) => setForm({ ...form, allowClientPassword: v })}
            />
            <CheckField
              label="Allow downloads"
              checked={form.allowDownload}
              onChange={(v) => setForm({ ...form, allowDownload: v })}
            />
            <CheckField
              label="Watermark new uploads"
              checked={form.watermark}
              onChange={(v) => setForm({ ...form, watermark: v })}
            />
            <CheckField
              label="Compress opened previews"
              checked={form.downscalePreviews}
              onChange={(v) => setForm({ ...form, downscalePreviews: v })}
            />
            {form.downscalePreviews ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Opened preview size limit
                    </span>
                    <span className="text-sm tabular-nums">
                      {form.previewMaxKb >= 1024
                        ? `${(form.previewMaxKb / 1024).toFixed(form.previewMaxKb % 1024 === 0 ? 0 : 1)} MB`
                        : `${form.previewMaxKb} KB`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={100}
                    max={5120}
                    step={100}
                    value={form.previewMaxKb}
                    onChange={(e) => setForm({ ...form, previewMaxKb: Number(e.target.value) })}
                    className="w-full accent-foreground"
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>100 KB</span>
                    <span>5 MB</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Applies to every gallery type, including Drive-linked ones. Previews keep full
                  resolution at the best quality that fits this budget; grid thumbnails stay small
                  and downloads remain original.
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Opened photos use the original file from Drive or storage. Grid thumbnails remain
                optimized.
              </p>
            )}
            <TextField
              label="Maximum picks (0 = unlimited)"
              type="number"
              value={String(form.maxPicks)}
              onChange={(v) => setForm({ ...form, maxPicks: Number(v) || 0 })}
            />
            <TextField
              label="Expires on"
              type="date"
              value={form.expiresAt}
              onChange={(v) => setForm({ ...form, expiresAt: v })}
            />
            {(["Desktop", "Tablet", "Mobile"] as const).map((label) => {
              const key = `grid${label}` as "gridDesktop" | "gridTablet" | "gridMobile";
              return (
                <SelectField
                  key={key}
                  label={`${label} default grid`}
                  value={form[key]}
                  onChange={(v) => setForm({ ...form, [key]: v })}
                  options={Array.from({ length: 8 }, (_, index) => ({
                    value: String(index + 1),
                    label: `${index + 1} column${index ? "s" : ""}`,
                  }))}
                />
              );
            })}
            <SelectField
              label="Default sorting order"
              value={form.defaultSort}
              onChange={(v) => setForm({ ...form, defaultSort: v })}
              options={[
                { value: "default", label: "Gallery order" },
                { value: "name", label: "File name A–Z" },
                { value: "name-desc", label: "File name Z–A" },
                ...(gallery.kind === "cull" ? [{ value: "picked", label: "Picked first" }] : []),
              ]}
            />
            <div>
              <Label>Link preview image</Label>
              <input
                ref={ogFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadOg(file);
                }}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {picked?.length ? (
                  <Btn onClick={() => setChoosingOg((current) => !current)}>
                    {choosingOg ? "Cancel selection" : "Select from gallery"}
                  </Btn>
                ) : null}
                <Btn onClick={() => ogFileRef.current?.click()}>Upload custom image</Btn>
                {form.ogImageId || form.coverUrl ? (
                  <Btn onClick={() => setForm({ ...form, ogImageId: "", coverUrl: "" })}>Clear</Btn>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {choosingOg
                  ? "Click a photo in the gallery on the left."
                  : form.coverUrl
                    ? "A custom link preview is selected."
                    : form.ogImageId
                      ? "A gallery photo is selected."
                      : "Choose a gallery photo or upload a separate image used only when the link is shared."}
              </p>
            </div>
            <div>
              <Label>Cover picture</Label>
              <input
                ref={coverFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadCover(file);
                }}
              />
              <div className="mt-3">
                <SelectField
                  label="Source"
                  value={form.coverMode}
                  onChange={(v) => setForm({ ...form, coverMode: v })}
                  options={[
                    { value: "first", label: "First photo of the gallery" },
                    { value: "og", label: "Same as link preview image" },
                    { value: "pick", label: "Chosen gallery photo" },
                    { value: "upload", label: "Uploaded picture" },
                    { value: "none", label: "No cover picture" },
                  ]}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {picked?.length ? (
                  <Btn onClick={() => setChoosingCover((current) => !current)}>
                    {choosingCover ? "Cancel selection" : "Select from gallery"}
                  </Btn>
                ) : null}
                <Btn onClick={() => coverFileRef.current?.click()}>Upload cover</Btn>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {choosingCover
                  ? "Click a photo in the gallery on the left."
                  : "Shown large at the top of the client's gallery page. Falls back to the first photo if the chosen picture is unavailable."}
              </p>
            </div>
            <div>
              <CheckField
                label="Show a message to the client"
                checked={form.showMessage}
                onChange={(v) => setForm({ ...form, showMessage: v })}
              />
              {form.showMessage ? (
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(event) => setForm({ ...form, message: event.target.value })}
                  placeholder="Add a personal note for this client…"
                  className="mt-3 w-full border-0 border-b border-border bg-transparent py-2 text-sm outline-none focus:border-foreground"
                />
              ) : null}
            </div>
            <SelectField
              label="Photo source"
              value={form.source}
              onChange={(v) => setForm({ ...form, source: v })}
              options={[
                { value: "upload", label: "Direct upload" },
                { value: "drive", label: "Google Drive folder" },
              ]}
            />
            {form.source === "drive" ? (
              <>
                <TextField
                  label="Preview folder ID (Drive)"
                  value={form.driveFolderId}
                  onChange={(v) => setForm({ ...form, driveFolderId: v })}
                />
                <TextField
                  label="RAW files folder ID (optional)"
                  value={form.rawFolderId}
                  onChange={(v) => setForm({ ...form, rawFolderId: v })}
                />
                <p className="text-xs text-muted-foreground">
                  RAW files are matched to previews by file name, so IMG_2841.jpg finds
                  IMG_2841.CR2.
                </p>
              </>
            ) : (
              <>
                <SelectField
                  label="Preview compression"
                  value={form.compression}
                  onChange={(v) => setForm({ ...form, compression: v as CompressionKey })}
                  options={Object.entries(COMPRESSION).map(([value, c]) => ({
                    value,
                    label: c.label,
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  About {prettySize(COMPRESSION[form.compression].approxKb)} per photo ·{" "}
                  {prettySize(COMPRESSION[form.compression].approxKb * 100)} for 100 photos · long
                  edge {COMPRESSION[form.compression].maxPx}px
                </p>
              </>
            )}
          </div>
        </Card>
      </div>

      {viewer !== null && visible[viewer] ? (
        <GalleryViewer
          images={visible.map((r) => ({
            id: r.id,
            name: r.name,
            preview: r.preview,
            orig: r.orig,
          }))}
          index={viewer}
          onIndex={setViewer}
          onClose={() => setViewer(null)}
          showFilenames
          allowDownload
          footer={(image) => {
            const row = visible.find((r) => r.id === image.id);
            if (!row) return null;
            return (
              <span className="flex flex-wrap items-center justify-center gap-3 text-[0.65rem] tracking-[0.14em] uppercase">
                {row.picked ? <span>Picked</span> : null}
                {row.starred ? <span>Starred</span> : null}
                {row.rating ? <span>{"\u2605".repeat(row.rating)}</span> : null}
                {row.label ? <span>{row.label}</span> : null}
                {row.done ? <span>Done</span> : null}
                {row.comment ? <span className="normal-case">{row.comment}</span> : null}
              </span>
            );
          }}
        />
      ) : null}

      {(selectMode || sel.size > 0) && viewer === null
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center px-4 pb-4">
              <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 border border-hairline bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
                <span className="text-[0.625rem] tracking-[0.2em] uppercase text-muted-foreground">
                  {sel.size ? `${sel.size} selected` : "Select photos"}
                </span>
                {sel.size ? (
                  <>
                    <Btn
                      variant="solid"
                      onClick={() =>
                        void rebuildRows(
                          selectedRows,
                          `${selectedRows.length} photo${selectedRows.length === 1 ? "" : "s"} rebuilt`,
                        )
                      }
                    >
                      Rebuild ({sel.size})
                    </Btn>
                    <Btn onClick={() => downloadNames(selectedRows)}>Download names</Btn>
                    <Btn onClick={() => downloadWorksheet(selectedRows)}>Worksheet</Btn>
                    <Btn onClick={() => void downloadFiles(selectedRows)}>Download</Btn>
                    <Btn onClick={() => openDriveMove(selectedRows.map((r) => r.id))}>
                      Send to Drive
                    </Btn>
                    <Btn onClick={() => setSel(new Set())}>Clear</Btn>
                  </>
                ) : null}
                <Btn
                  onClick={() => {
                    setSel(new Set());
                    setSelectMode(false);
                  }}
                >
                  Done
                </Btn>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
