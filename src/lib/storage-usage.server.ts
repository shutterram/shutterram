/** Storage usage reporting — walks every bucket and groups the bytes it finds. */

export interface UsageFile {
  bucket: string;
  path: string;
  size: number;
  updatedAt: string;
}

export interface UsageGroup {
  key: string;
  label: string;
  bytes: number;
  files: number;
}

export interface UsageBucket {
  bucket: string;
  label: string;
  bytes: number;
  files: number;
  groups: UsageGroup[];
  truncated: boolean;
}

export interface StorageUsageReport {
  totalBytes: number;
  totalFiles: number;
  buckets: UsageBucket[];
  largest: UsageFile[];
  kinds: UsageGroup[];
  scannedAt: string;
}

const BUCKETS: { name: string; label: string }[] = [
  { name: "site-images", label: "Website images" },
  { name: "crm-galleries", label: "Client galleries" },
  { name: "crm-docs", label: "Contracts & documents" },
];

const PAGE = 100;
const MAX_FILES_PER_BUCKET = 6000;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const BUCKET_LABELS: Record<string, string> = Object.fromEntries(
  BUCKETS.map((b) => [b.name, b.label]),
);

/** Recursively list one bucket. Folders come back with no metadata. */
export async function walkBucket(bucket: string) {
  const db = await admin();
  const files: UsageFile[] = [];
  const queue: string[] = [""];
  let truncated = false;

  while (queue.length) {
    const prefix = queue.shift() as string;
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await db.storage
        .from(bucket)
        .list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw new Error(error.message);
      const page = data ?? [];
      for (const entry of page) {
        if (!entry.name || entry.name === ".emptyFolderPlaceholder") continue;
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        const meta = entry.metadata as { size?: number } | null;
        if (!meta) {
          queue.push(path);
          continue;
        }
        files.push({
          bucket,
          path,
          size: Number(meta.size ?? 0),
          updatedAt: String(entry.updated_at ?? entry.created_at ?? ""),
        });
      }
      if (page.length < PAGE) break;
      if (files.length >= MAX_FILES_PER_BUCKET) {
        truncated = true;
        break;
      }
    }
    if (files.length >= MAX_FILES_PER_BUCKET) {
      truncated = true;
      break;
    }
  }

  return { files, truncated };
}

/** Human label for the first path segment of a file. */
function groupKey(bucket: string, path: string) {
  const first = path.includes("/") ? path.slice(0, path.indexOf("/")) : "";
  if (bucket === "crm-galleries") return first || "loose files";
  if (bucket === "crm-docs") return first || "loose files";
  return "images";
}

/** What kind of asset a file is, for the cross-site breakdown. */
function kindOf(file: UsageFile) {
  if (file.bucket === "crm-docs") return file.path.startsWith("signed") ? "Signed contracts" : "Contract originals";
  if (file.bucket === "site-images") return "Website images";
  if (file.path.endsWith("-thumb.jpg")) return "Gallery thumbnails";
  if (file.path.endsWith("-preview.jpg")) return "Gallery opened previews";
  if (file.path.includes("-original")) return "Gallery originals";
  return "Other gallery files";
}

export async function buildStorageUsage(): Promise<StorageUsageReport> {
  const db = await admin();
  const results = await Promise.all(
    BUCKETS.map(async (b) => ({ ...b, ...(await walkBucket(b.name)) })),
  );

  const { data: galleries } = await db
    .from("crm_galleries" as never)
    .select("id,title,kind");
  const titles = new Map<string, string>();
  for (const g of (galleries ?? []) as { id: string; title: string; kind: string }[]) {
    titles.set(g.id, g.title || `${g.kind} gallery`);
  }

  const buckets: UsageBucket[] = [];
  const kindTotals = new Map<string, UsageGroup>();
  const all: UsageFile[] = [];

  for (const result of results) {
    const groups = new Map<string, UsageGroup>();
    let bytes = 0;
    for (const file of result.files) {
      bytes += file.size;
      all.push(file);
      const key = groupKey(result.name, file.path);
      const label =
        result.name === "crm-galleries" ? (titles.get(key) ?? `Removed gallery (${key.slice(0, 8)})`) : key;
      const group = groups.get(key) ?? { key, label, bytes: 0, files: 0 };
      group.bytes += file.size;
      group.files += 1;
      groups.set(key, group);

      const kind = kindOf(file);
      const bucketKind = kindTotals.get(kind) ?? { key: kind, label: kind, bytes: 0, files: 0 };
      bucketKind.bytes += file.size;
      bucketKind.files += 1;
      kindTotals.set(kind, bucketKind);
    }
    buckets.push({
      bucket: result.name,
      label: result.label,
      bytes,
      files: result.files.length,
      groups: [...groups.values()].sort((a, b) => b.bytes - a.bytes),
      truncated: result.truncated,
    });
  }

  return {
    totalBytes: buckets.reduce((sum, b) => sum + b.bytes, 0),
    totalFiles: buckets.reduce((sum, b) => sum + b.files, 0),
    buckets: buckets.sort((a, b) => b.bytes - a.bytes),
    kinds: [...kindTotals.values()].sort((a, b) => b.bytes - a.bytes),
    largest: all.sort((a, b) => b.size - a.size).slice(0, 25),
    scannedAt: new Date().toISOString(),
  };
}

export interface BrowseEntry extends UsageFile {
  label: string;
  kind: string;
}

export interface BrowseResult {
  bucket: string;
  label: string;
  files: BrowseEntry[];
  truncated: boolean;
  totalBytes: number;
}

/** Every file in one bucket, newest first, labelled for the admin browser. */
export async function browseBucketFiles(bucket: string): Promise<BrowseResult> {
  if (!BUCKET_LABELS[bucket]) throw new Error("Unknown storage area");
  const db = await admin();
  const { files, truncated } = await walkBucket(bucket);

  const titles = new Map<string, string>();
  if (bucket === "crm-galleries") {
    const { data } = await db.from("crm_galleries" as never).select("id,title,kind");
    for (const g of (data ?? []) as { id: string; title: string; kind: string }[]) {
      titles.set(g.id, g.title || `${g.kind} gallery`);
    }
  }

  const entries: BrowseEntry[] = files.map((f) => {
    const first = f.path.includes("/") ? f.path.slice(0, f.path.indexOf("/")) : "";
    const label =
      bucket === "crm-galleries"
        ? (titles.get(first) ?? (first ? `Removed gallery (${first.slice(0, 8)})` : "Loose files"))
        : (first || BUCKET_LABELS[bucket]!);
    return { ...f, label, kind: kindOf(f) };
  });

  entries.sort((a, b) => b.size - a.size);

  return {
    bucket,
    label: BUCKET_LABELS[bucket]!,
    files: entries,
    truncated,
    totalBytes: entries.reduce((sum, f) => sum + f.size, 0),
  };
}

/** Permanently delete files from one bucket. */
export async function deleteBucketFiles(bucket: string, paths: string[]): Promise<number> {
  if (!BUCKET_LABELS[bucket]) throw new Error("Unknown storage area");
  if (!paths.length) return 0;
  const db = await admin();
  const { error } = await db.storage.from(bucket).remove(paths);
  if (error) throw new Error(error.message);
  if (bucket === "site-images") {
    await db
      .from("image_settings" as never)
      .delete()
      .in("path", paths);
  }
  if (bucket === "crm-galleries") {
    const thumbs = paths.filter((path) => path.endsWith("-thumb.jpg"));
    const previews = paths.filter((path) => path.endsWith("-preview.jpg"));
    if (thumbs.length) {
      await db.from("crm_gallery_images" as never).update({ thumb_path: "" } as never).in("thumb_path", thumbs);
    }
    if (previews.length) {
      await db
        .from("crm_gallery_images" as never)
        .update({ preview_path: "" } as never)
        .in("preview_path", previews);
    }
  }
  return paths.length;
}
