import { zip, unzip, strToU8, strFromU8 } from "fflate";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "site-images";

export interface TemplateBundle {
  format?: string;
  scope?: string;
  data?: Record<string, unknown[]> | undefined;
}

/** Storage keys referenced anywhere inside a template payload. */
export function keysInTemplate(file: unknown): string[] {
  const found = new Set<string>();
  const text = JSON.stringify(file ?? null) ?? "";
  const re = /\/api\/public\/img\/([A-Za-z0-9._-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) if (m[1]) found.add(m[1]);
  return [...found];
}

function zipAsync(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (err, out) => (err ? reject(err) : resolve(out)));
  });
}

function unzipAsync(data: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(data, (err, out) => (err ? reject(err) : resolve(out)));
  });
}

/**
 * Builds a .zip holding the template JSON plus every image file it points at,
 * so the bundle can be restored even after the originals are deleted — or
 * loaded into a completely different site.
 */
export async function buildTemplateZip(
  file: unknown,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const keys = keysInTemplate(file);
  const entries: Record<string, Uint8Array> = {
    "template.json": strToU8(JSON.stringify(file, null, 2)),
  };
  let done = 0;
  for (const key of keys) {
    const { data } = await supabase.storage.from(BUCKET).download(key);
    if (data) entries[`images/${key}`] = new Uint8Array(await data.arrayBuffer());
    onProgress?.(++done, keys.length);
  }
  const packed = await zipAsync(entries);
  return new Blob([packed as unknown as BlobPart], { type: "application/zip" });
}

/**
 * Reads a template file. Plain .json files pass straight through; .zip bundles
 * have their images re-uploaded to storage first (existing files are kept).
 */
export async function readTemplateFile(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<TemplateBundle> {
  const isZip = file.name.toLowerCase().endsWith(".zip") || file.type === "application/zip";
  if (!isZip) return JSON.parse(await file.text()) as TemplateBundle;

  const unpacked = await unzipAsync(new Uint8Array(await file.arrayBuffer()));
  const manifest = unpacked["template.json"];
  if (!manifest) throw new Error("That zip doesn't contain a Shutter Ram template.");

  const imageEntries = Object.entries(unpacked).filter(([name]) => name.startsWith("images/"));
  let done = 0;
  for (const [name, bytes] of imageEntries) {
    const key = name.slice("images/".length);
    if (!key) continue;
    const ext = key.split(".").pop()?.toLowerCase() ?? "";
    const type =
      ext === "png"
        ? "image/png"
        : ext === "svg"
          ? "image/svg+xml"
          : ext === "webp"
            ? "image/webp"
            : "image/jpeg";
    await supabase.storage
      .from(BUCKET)
      .upload(key, new Blob([bytes as unknown as BlobPart], { type }), {
        cacheControl: "31536000",
        contentType: type,
        upsert: false,
      });
    onProgress?.(++done, imageEntries.length);
  }

  return JSON.parse(strFromU8(manifest)) as TemplateBundle;
}
