import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  attachImageThumb,
  createGallery,
  galleryResults,
  importDriveFolder,
  sendPicksToDrive,
  setPickDone,
  thumbUploadTarget,
  galleryUploadTargets,
  galleryOgUploadTarget,
  listGalleries,
  registerGalleryImages,
  updateGallery,
  type GallerySummary,
} from "@/lib/gallery.functions";
import { crmDelete, crmSettingsGet } from "@/lib/crm.functions";
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

async function drawTo(
  img: HTMLImageElement,
  maxPx: number,
  quality: number,
  watermark: { text: string; opacity: number; size: number } | null,
  format: "image/jpeg" = "image/jpeg",
): Promise<{ blob: Blob; width: number; height: number }> {
  const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  // Standardise generated previews to browser-managed sRGB JPEG so their
  // appearance remains consistent across the gallery and downloaded preview.
  const ctx = canvas.getContext("2d", { colorSpace: "srgb" });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, w, h);
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

async function drawToByteLimit(
  img: HTMLImageElement,
  maxBytes: number,
  watermark: { text: string; opacity: number; size: number } | null,
) {
  // Everything is plain JPEG: universally supported, predictable quality
  // control, and no surprise PNG/WebP behaviour.
  let edge = Math.max(img.naturalWidth, img.naturalHeight);
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
      } else high = quality - 1;
    }
    if (fitting) return fitting;
    edge = Math.max(1600, Math.round(edge * 0.9));
    best = await drawTo(img, edge, 72, watermark, "image/jpeg");
  }
  return best;
}

export function GalleriesPanel({ contacts }: { contacts: { id: string; name: string }[] }) {
  const list = useServerFn(listGalleries);
  const create = useServerFn(createGallery);
  const remove = useServerFn(crmDelete);

  const [rows, setRows] = useState<GallerySummary[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useMemo(
    () => async () => {
      try {
        setRows(await list({ data: {} as never }));
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

  const open = rows?.find((g) => g.id === openId) ?? null;
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
                <Btn
                  onClick={() =>
                    copyLink(`${window.location.origin}/g/${g.token}`, (m) => toast.success(m))
                  }
                >
                  Copy link
                </Btn>
                <Btn onClick={() => setOpenId(g.id)}>Open</Btn>
                <Btn
                  variant="danger"
                  onClick={() => {
                    if (!window.confirm("Delete this gallery?")) return;
                    void remove({ data: { table: "crm_galleries", id: g.id } }).then(load);
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
  contacts: { id: string; name: string }[];
  onBack: () => void;
  onSaved: () => Promise<void>;
}) {
  const update = useServerFn(updateGallery);
  const targets = useServerFn(galleryUploadTargets);
  const register = useServerFn(registerGalleryImages);
  const results = useServerFn(galleryResults);
  const settingsGet = useServerFn(crmSettingsGet);
  const driveImport = useServerFn(importDriveFolder);
  const pushToDrive = useServerFn(sendPicksToDrive);
  const thumbTarget = useServerFn(thumbUploadTarget);
  const ogTarget = useServerFn(galleryOgUploadTarget);
  const attachThumb = useServerFn(attachImageThumb);
  const markDone = useServerFn(setPickDone);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const ogFileRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState("");
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
      Math.max(100, Math.round((gallery.preview_max_bytes ?? 1572864) / 1024)),
    ),
    defaultSort: gallery.default_sort || "default",
    coverUrl: gallery.cover_url || "",
  });
  const [busy, setBusy] = useState("");
  const [picked, setPicked] = useState<Awaited<ReturnType<typeof galleryResults>> | null>(null);
  const [choosingOg, setChoosingOg] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setPicked(await results({ data: { galleryId: gallery.id } }));
      } catch {
        setPicked([]);
      }
    })();
  }, [results, gallery.id]);

  async function save(rebuildChangedPreviews = true) {
    const previewSettingsChanged =
      form.downscalePreviews !== gallery.downscale_previews ||
      form.previewMaxPx !== gallery.preview_max_px ||
      form.previewMaxKb * 1024 !== gallery.preview_max_bytes;
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
          ...(form.password ? { password: form.password } : {}),
          ...(form.pickPin ? { pickPin: form.pickPin } : {}),
        },
      });
      if (
        rebuildChangedPreviews &&
        previewSettingsChanged &&
        form.downscalePreviews &&
        picked?.length
      ) {
        setBusy("Applying the new preview size to existing photos…");
        await buildThumbs(picked, true);
        toast.success("Gallery saved and previews rebuilt");
      } else {
        toast.success("Gallery saved");
      }
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

    const done: Prepared[] = [];
    let index = 0;
    for (const file of Array.from(files)) {
      index += 1;
      setProgress(`Preparing ${index} of ${files.length}…`);
      if (!file.type.startsWith("image/")) continue;
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });
      const preview = form.downscalePreviews
        ? await drawToByteLimit(img, form.previewMaxKb * 1024, mark)
        : await drawTo(img, 12000, 100, mark);
      const thumb = await drawTo(img, thumbMax, 70, mark);
      URL.revokeObjectURL(url);
      done.push({
        name: file.name,
        original: file,
        preview: preview.blob,
        thumb: thumb.blob,
        width: preview.width,
        height: preview.height,
        bytes: file.size,
      });
    }

    const registered: Parameters<typeof register>[0]["data"]["images"] = [];
    let n = 0;
    for (const item of done) {
      n += 1;
      setProgress(`Uploading ${n} of ${done.length}…`);
      const t = await targets({ data: { galleryId: gallery.id, name: item.name } });
      const [a, b, c] = await Promise.all([
        supabase.storage
          .from(t.bucket)
          .uploadToSignedUrl(t.previewPath, t.previewToken, item.preview, {
            contentType: item.preview.type || "image/jpeg",
          }),
        supabase.storage.from(t.bucket).uploadToSignedUrl(t.thumbPath, t.thumbToken, item.thumb, {
          contentType: "image/jpeg",
        }),
        supabase.storage
          .from(t.bucket)
          .uploadToSignedUrl(t.originalPath, t.originalToken, item.original, {
            contentType: item.original.type || "application/octet-stream",
          }),
      ]);
      if (a.error || b.error || c.error) {
        toast.error(a.error?.message ?? b.error?.message ?? c.error?.message ?? "Upload failed");
        continue;
      }
      registered.push({
        name: item.name,
        originalName: item.name,
        originalPath: t.originalPath,
        previewPath: t.previewPath,
        thumbPath: t.thumbPath,
        width: item.width,
        height: item.height,
        bytes: item.bytes,
      });
    }

    if (registered.length) {
      await register({ data: { galleryId: gallery.id, images: registered } });
      toast.success(`${registered.length} photos added`);
      await onSaved();
    }
    setProgress("");
    if (fileRef.current) fileRef.current.value = "";
  }

  /** Builds colour-consistent JPEG thumbs and previews for Drive-linked photos. */
  async function buildThumbs(rows: NonNullable<typeof picked>, force = false) {
    // A Drive row is only fully processed when it has both the grid thumbnail
    // and, when compression is enabled, the dedicated opened-preview JPEG.
    // Older imports often had only a thumbnail, which made the viewer fall
    // back to that tiny file instead of generating the configured preview.
    const missing = force
      ? rows
      : rows.filter((row) => !row.hasThumb || (form.downscalePreviews && !row.hasPreview));
    if (!missing.length) return;
    let n = 0;
    for (const row of missing) {
      n += 1;
      setBusy(`Building gallery JPEGs ${n} of ${missing.length}…`);
      try {
        const image = new Image();
        const loaded = new Promise<void>((res, rej) => {
          image.onload = () => res();
          image.onerror = () => rej(new Error("load failed"));
        });
        image.src = row.orig;
        await loaded;
        const thumb = await drawTo(image, 600, 70, null);
        const preview = form.downscalePreviews
          ? await drawToByteLimit(image, form.previewMaxKb * 1024, null)
          : null;
        const [thumbSlot, previewSlot] = await Promise.all([
          thumbTarget({ data: { galleryId: gallery.id, kind: "thumb" } }),
          preview ? thumbTarget({ data: { galleryId: gallery.id, kind: "preview" } }) : null,
        ]);
        const uploads = await Promise.all([
          supabase.storage
            .from(thumbSlot.bucket)
            .uploadToSignedUrl(thumbSlot.path, thumbSlot.token, thumb.blob, {
              contentType: "image/jpeg",
            }),
          preview && previewSlot
            ? supabase.storage
                .from(previewSlot.bucket)
                .uploadToSignedUrl(previewSlot.path, previewSlot.token, preview.blob, {
                  contentType: preview.blob.type || "image/jpeg",
                })
            : null,
        ]);
        if (uploads[0].error || uploads[1]?.error) continue;
        await attachThumb({
          data: {
            imageId: row.id,
            thumbPath: thumbSlot.path,
            ...(previewSlot ? { previewPath: previewSlot.path } : {}),
          },
        });
      } catch {
        /* skip photos Drive refuses to serve */
      }
    }
    setBusy("");
    setPicked(await results({ data: { galleryId: gallery.id } }));
  }

  async function importDrive(replace: boolean) {
    if (!form.driveFolderId.trim()) {
      toast.error("Add the Google Drive folder ID first.");
      return;
    }
    try {
      setBusy("Reading your Drive folder…");
      await save(false);
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
      const rows = await results({ data: { galleryId: gallery.id } });
      setPicked(rows);
      if (replace && form.ogImageId && !rows.some((row) => row.id === form.ogImageId)) {
        setForm((current) => ({ ...current, ogImageId: "" }));
      }
      await buildThumbs(rows);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import from Drive");
    } finally {
      setBusy("");
    }
  }

  async function rebuildDrivePreviews() {
    if (!picked?.length) return;
    try {
      await save(false);
      await buildThumbs(picked, true);
      toast.success("Opened previews rebuilt with the new limits");
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
      const rendered = await drawTo(image, 1600, 84, null);
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

  async function sendRawsToDrive() {
    try {
      setBusy("Copying RAW files inside Drive…");
      const res = await pushToDrive({ data: { galleryId: gallery.id } });
      toast.success(
        `${res.copied} RAW files copied${res.missing.length ? ` · ${res.missing.length} without a match` : ""}`,
      );
      window.open(res.link, "_blank", "noopener");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not copy to Drive");
    } finally {
      setBusy("");
    }
  }

  function downloadWorksheet() {
    const rows = (picked ?? []).filter((p) => p.picked);
    const header = ["File name", "Stars", "Label", "Comment", "Starred", "RAW matched", "Done"];
    const body = rows.map((r) =>
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
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(form.title || "gallery").replace(/[^a-z0-9\-_ ]/gi, "")}-worksheet.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const pickedOnly = (picked ?? []).filter((p) => p.picked);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Btn onClick={onBack}>← Galleries</Btn>
          <h2 className="mt-4 font-display text-2xl">{form.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn
            onClick={() =>
              copyLink(`${window.location.origin}/g/${gallery.token}`, (m) => toast.success(m))
            }
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
                <Btn onClick={() => void rebuildDrivePreviews()}>Rebuild previews</Btn>
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
            <Btn onClick={() => fileRef.current?.click()}>Add photos</Btn>
          )}
          {pickedOnly.length ? (
            <>
              <Btn onClick={downloadWorksheet}>Download worksheet</Btn>
              {form.rawFolderId ? (
                <Btn onClick={() => void sendRawsToDrive()}>Send picks to Drive</Btn>
              ) : null}
            </>
          ) : null}
          {pickedOnly.length ? (
            <Btn
              onClick={() => {
                const lines = pickedOnly
                  .map((p) =>
                    [p.name, p.rating ? `★${p.rating}` : "", p.label ?? "", p.comment ?? ""]
                      .filter(Boolean)
                      .join(" · "),
                  )
                  .join("\n");
                const url = URL.createObjectURL(
                  new Blob([lines], { type: "text/plain;charset=utf-8" }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = `${(form.title || "gallery").replace(/[^a-z0-9\-_ ]/gi, "")}-picks.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download picked names
            </Btn>
          ) : null}

          <Btn variant="solid" onClick={() => void save()}>
            Save
          </Btn>
        </div>
      </div>

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
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {picked.map((p) => (
                <figure
                  key={p.id}
                  className={
                    "relative " +
                    (choosingOg
                      ? "cursor-pointer outline-offset-2 hover:outline hover:outline-1 hover:outline-foreground"
                      : "")
                  }
                  onClick={() => {
                    if (!choosingOg) return;
                    setForm((current) => ({ ...current, ogImageId: p.id, coverUrl: "" }));
                    setChoosingOg(false);
                    toast.success("Link preview selected — save the gallery to apply it");
                  }}
                >
                  <img src={p.thumb} alt={p.name} className="aspect-square w-full object-cover" />
                  {choosingOg ? (
                    <span className="absolute inset-x-0 bottom-0 bg-background/90 px-2 py-2 text-center text-[0.55rem] tracking-[0.2em] uppercase">
                      Use as link preview
                    </span>
                  ) : null}
                  {p.picked ? (
                    <span className="absolute left-0 top-0 bg-foreground px-2 py-1 text-[0.55rem] tracking-[0.2em] uppercase text-background">
                      Picked
                    </span>
                  ) : null}
                  {p.rating ? (
                    <span className="absolute right-1 top-1 text-xs text-white drop-shadow">
                      {"★".repeat(p.rating)}
                    </span>
                  ) : null}
                  {p.picked ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        const next = !p.done;
                        setPicked(
                          (rows) =>
                            rows?.map((r) => (r.id === p.id ? { ...r, done: next } : r)) ?? rows,
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
                  {p.comment ? (
                    <figcaption className="mt-1 line-clamp-2 text-[0.65rem] text-muted-foreground">
                      {p.comment}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
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
            />
            <TextField
              label="Password (leave blank to keep)"
              type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
            />
            <div>
              <TextField
                label={`Selection PIN ${gallery.has_pick_pin ? "(set — leave blank to keep)" : "(optional)"}`}
                type="password"
                value={form.pickPin}
                onChange={(v) => setForm({ ...form, pickPin: v })}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Only people with this PIN can pick photos, rate or leave notes. Anyone with the link
                (friends, family) can still view.
                {gallery.has_pick_pin ? (
                  <>
                    {" "}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        void update({ data: { id: gallery.id, pickPin: "" } }).then(async () => {
                          toast.success("Selection PIN removed");
                          await onSaved();
                        });
                      }}
                    >
                      Remove PIN
                    </button>
                  </>
                ) : null}
              </p>
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
    </div>
  );
}
