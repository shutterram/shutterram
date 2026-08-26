import { downloadZip } from "client-zip";

/** Adds ?d=1 so the server sends the file as an attachment with its real name. */
export function attachmentUrl(url: string) {
  return url.includes("?") ? `${url}&d=1` : `${url}?d=1`;
}

/** Straightforward single-file download, straight from the source. */
export function downloadOne(url: string, name: string) {
  const a = document.createElement("a");
  a.href = attachmentUrl(url);
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Zips several photos in the browser and saves the archive. Bytes stream from
 * the photo source through the tab, so nothing extra is stored on our side.
 */
export async function downloadMany(
  items: { url: string; name: string }[],
  zipName: string,
  onProgress?: (done: number, total: number) => void,
) {
  const files: { name: string; input: Blob }[] = [];
  const used = new Set<string>();
  let done = 0;
  for (const item of items) {
    const res = await fetch(attachmentUrl(item.url));
    if (!res.ok) throw new Error(`Could not fetch ${item.name}`);
    let name = item.name || `photo-${done + 1}.jpg`;
    while (used.has(name)) name = name.replace(/(\.[^.]+)?$/, (ext) => `-copy${ext || ""}`);
    used.add(name);
    files.push({ name, input: await res.blob() });
    done += 1;
    onProgress?.(done, items.length);
  }
  const blob = await downloadZip(files).blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName.endsWith(".zip") ? zipName : `${zipName}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
