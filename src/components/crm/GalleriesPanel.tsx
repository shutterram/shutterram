import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  createGallery,
  galleryResults,
  galleryUploadTargets,
  listGalleries,
  registerGalleryImages,
  updateGallery,
  type GallerySummary,
} from "@/lib/gallery.functions";
import { crmDelete, crmSettingsGet } from "@/lib/crm.functions";
import { Btn, Card, CheckField, Empty, Label, SelectField, TextField, copyLink } from "./ui";

interface Prepared {
  name: string;
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
): Promise<{ blob: Blob; width: number; height: number }> {
  const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
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
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/webp", quality / 100),
  );
  if (!blob) throw new Error("Could not process image");
  return { blob, width: w, height: h };
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

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState("");
  const [form, setForm] = useState({
    title: gallery.title,
    status: gallery.status,
    contactId: gallery.contact_id ?? "",
    accessCode: gallery.access_code,
    password: "",
    allowClientPassword: gallery.allow_client_password,
    allowDownload: gallery.allow_download,
    watermark: gallery.watermark,
    maxPicks: gallery.max_picks,
    expiresAt: gallery.expires_at ? String(gallery.expires_at).slice(0, 10) : "",
    driveFolderId: gallery.drive_folder_id,
  });
  const [picked, setPicked] = useState<Awaited<ReturnType<typeof galleryResults>> | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setPicked(await results({ data: { galleryId: gallery.id } }));
      } catch {
        setPicked([]);
      }
    })();
  }, [results, gallery.id]);

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
          ...(form.password ? { password: form.password } : {}),
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
    const previewMax = Number(settings?.["preview_max_px"] ?? 1800);
    const thumbMax = Number(settings?.["thumb_max_px"] ?? 600);
    const quality = Number(settings?.["preview_quality"] ?? 78);
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
      const preview = await drawTo(img, previewMax, quality, mark);
      const thumb = await drawTo(img, thumbMax, 70, mark);
      URL.revokeObjectURL(url);
      done.push({
        name: file.name,
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
      const [a, b] = await Promise.all([
        supabase.storage
          .from(t.bucket)
          .uploadToSignedUrl(t.previewPath, t.previewToken, item.preview, {
            contentType: "image/webp",
          }),
        supabase.storage.from(t.bucket).uploadToSignedUrl(t.thumbPath, t.thumbToken, item.thumb, {
          contentType: "image/webp",
        }),
      ]);
      if (a.error || b.error) {
        toast.error(a.error?.message ?? b.error?.message ?? "Upload failed");
        continue;
      }
      registered.push({
        name: item.name,
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
          <Btn onClick={() => fileRef.current?.click()}>Add photos</Btn>
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

      {progress ? <p className="mt-4 text-sm text-muted-foreground">{progress}</p> : null}

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
                <figure key={p.id} className="relative">
                  <img src={p.thumb} alt={p.name} className="aspect-square w-full object-cover" />
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
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
            />
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
            <TextField
              label="Google Drive folder ID"
              value={form.driveFolderId}
              onChange={(v) => setForm({ ...form, driveFolderId: v })}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
