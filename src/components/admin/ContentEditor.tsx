import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FloatingSaveBar } from "@/components/admin/FloatingSaveBar";
import { optimiseImage, kb } from "@/lib/optimise-image";
import {
  defaultImageFlags,
  getImageFlags,
  imageKeyOf,
  setImageFlags,
  type ImageFlags,
} from "@/lib/image-index";


/** Uploads a file to the private site-images bucket and returns its public path. */
export async function uploadSiteImage(file: File): Promise<string> {
  const { file: optimised, changed, originalSize } = await optimiseImage(file);
  if (changed) {
    toast.message(`Optimised ${file.name}`, {
      description: `${kb(originalSize)} → ${kb(optimised.size)} (WebP)`,
    });
  }
  const ext = optimised.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("site-images").upload(key, optimised, {
    cacheControl: "31536000",
    contentType: optimised.type || "application/octet-stream",
  });
  if (error) throw error;
  return `/api/public/img/${key}`;
}


/**
 * The two per-image switches that follow every upload:
 * • Show on Internet — may search engines and link previews reach the file.
 * • Private — hidden on the site itself unless opened through a share link.
 */
export function SearchVisibilityToggle({ src }: { src: string }) {
  const [flags, setFlags] = useState<ImageFlags>(defaultImageFlags);
  const [ready, setReady] = useState(true);
  const key = imageKeyOf(src);
  const desired = useRef<ImageFlags>(defaultImageFlags);

  useEffect(() => {
    let live = true;
    if (!key) {
      setFlags(desired.current);
      setReady(true);
      return;
    }
    setReady(false);
    void getImageFlags(src).then(async (value) => {
      if (!live) return;
      // Apply a choice the user made before the file finished uploading.
      const pending = desired.current;
      const differs = pending.indexable !== value.indexable || pending.isPrivate !== value.isPrivate;
      if (differs && value.indexable && !value.isPrivate) {
        try {
          await setImageFlags(src, pending);
        } catch {
          /* surfaced on the next manual toggle */
        }
        if (!live) return;
        setFlags(pending);
      } else {
        setFlags(value);
        desired.current = value;
      }
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [src, key]);

  async function toggle(patch: Partial<ImageFlags>, message: string) {
    const previous = flags;
    const next = { ...flags, ...patch };
    desired.current = next;
    setFlags(next);
    if (!key) return;
    try {
      await setImageFlags(src, next);
      toast.success(message);
    } catch (error) {
      setFlags(previous);
      desired.current = previous;
      toast.error(error instanceof Error ? error.message : "Could not update visibility");
    }
  }

  const row = "flex items-center gap-2 text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground";

  return (
    <div className="space-y-1.5">
      <label className={row}>
        <input
          type="checkbox"
          checked={flags.indexable}
          disabled={!ready}
          onChange={(e) =>
            void toggle(
              { indexable: e.target.checked },
              e.target.checked
                ? "Image can appear on the internet"
                : "Image hidden from the internet",
            )
          }
          className="size-3 accent-current"
        />
        Show on Internet
      </label>
      <label className={row}>
        <input
          type="checkbox"
          checked={flags.isPrivate}
          disabled={!ready}
          onChange={(e) =>
            void toggle(
              { isPrivate: e.target.checked },
              e.target.checked
                ? "Image is private — share-link only"
                : "Image visible on the site",
            )
          }
          className="size-3 accent-current"
        />
        Private (share link only)
      </label>
    </div>
  );
}


export function ImageField({
  value,
  onChange,
  label = "Image",
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadSiteImage(file));
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="eyebrow">{label}</span>
      <div className="mt-2 flex items-start gap-4">
        {value ? (
          <img
            src={value}
            alt=""
            className="size-20 shrink-0 border border-hairline object-cover"
          />
        ) : (
          <div className="grid size-20 shrink-0 place-items-center border border-dashed border-hairline text-[0.625rem] uppercase tracking-widest text-muted-foreground">
            None
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste an image URL, or upload a file"
            className="w-full border-b border-hairline bg-transparent py-2 text-xs outline-none transition-colors focus:border-foreground"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 border border-hairline px-3 py-1.5 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
            Upload
          </button>
          <SearchVisibilityToggle src={value} />
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void pick(e.target.files?.[0])}
          />
        </div>
      </div>
    </div>
  );
}


/** Dropdown of gallery categories, with inline add / remove. */
export function CategoryField({
  value,
  onChange,
  label = "Category",
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
}) {
  const [cats, setCats] = useState<{ id: string; slug: string; label: string }[]>([]);

  async function load() {
    const { data, error } = await supabase
      .from("categories" as never)
      .select("id,slug,label")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setCats((data ?? []) as unknown as { id: string; slug: string; label: string }[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addCategory() {
    const name = prompt("New category name (e.g. Maternity)")?.trim();
    if (!name) return;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    // Ask up front whether this category should also become a home page hero
    // slide — some categories belong in the gallery only.
    const showInHero = confirm(
      `Show “${name}” as a slide in the home page hero slider?\n\nOK = yes, show it on the home page.\nCancel = gallery and featured work only.`,
    );
    const { error } = await supabase.from("categories" as never).insert({
      slug,
      title: `${name} Photography`,
      label: name,
      tagline: "",
      hero: "",
      show_in_hero: showInHero,
      sort_order: cats.length,
    } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    await load();
    onChange(slug);
    toast.success(
      showInHero
        ? "Category added — add its hero image under “Hero categories”."
        : "Category added (gallery only) — it won't appear in the home hero.",
    );

  }

  async function removeCategory() {
    const current = cats.find((c) => c.slug === value);
    if (!current) {
      toast.error("Pick a category first");
      return;
    }
    if (
      !confirm(
        `Remove the “${current.label}” category? Photos keep their slug until you change it.`,
      )
    )
      return;
    const { error } = await supabase
      .from("categories" as never)
      .delete()
      .eq("id", current.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await load();
    onChange("");
    toast.success("Category removed");
  }

  return (
    <div>
      <span className="eyebrow">{label}</span>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-40 flex-1 border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground"
        >
          <option value="">— none —</option>
          {cats.map((c) => (
            <option key={c.id} value={c.slug} className="bg-background">
              {c.label} ({c.slug})
            </option>
          ))}
          {value && !cats.some((c) => c.slug === value) ? (
            <option value={value} className="bg-background">
              {value} (missing)
            </option>
          ) : null}
        </select>
        <button
          type="button"
          onClick={() => void addCategory()}
          className="border border-hairline px-3 py-1.5 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => void removeCategory()}
          className="border border-hairline px-3 py-1.5 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export type FieldType =
  "text" | "textarea" | "image" | "list" | "number" | "bool" | "category" | "select";

export interface FieldSpec {
  key: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  /** Choices for `select` fields. */
  options?: { value: string; label: string }[];
}

type Row = Record<string, unknown>;

function toInput(value: unknown, type: FieldType): string {
  if (type === "list") return Array.isArray(value) ? (value as string[]).join("\n") : "";
  if (value === null || value === undefined) return "";
  return String(value);
}

function fromInput(raw: string, type: FieldType): unknown {
  if (type === "list")
    return raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  if (type === "number") return Number(raw) || 0;
  return raw;
}

function FieldInput({
  spec,
  value,
  onChange,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const type = spec.type ?? "text";

  if (type === "image") {
    return (
      <ImageField
        label={spec.label}
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
      />
    );
  }

  if (type === "category") {
    return (
      <CategoryField
        label={spec.label}
        value={typeof value === "string" ? value : ""}
        onChange={onChange}
      />
    );
  }

  if (type === "select") {
    return (
      <label className="block">
        <span className="eyebrow">{spec.label}</span>
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground"
        >
          {(spec.options ?? []).map((o) => (
            <option key={o.value} value={o.value} className="bg-background">
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (type === "bool") {
    return (
      <label className="flex items-center gap-3 pt-4">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 accent-current"
        />
        <span className="eyebrow">{spec.label}</span>
      </label>
    );
  }

  // Lists keep their raw text while typing so a blank new line survives until
  // the field is saved — trimming on every keystroke used to swallow it.
  if (type === "list") {
    return <ListField spec={spec} value={value} onChange={onChange} />;
  }

  const multiline = type === "textarea";

  return (
    <label className="block">
      <span className="eyebrow">{spec.label}</span>
      {multiline ? (
        <textarea
          rows={4}
          value={toInput(value, type)}
          placeholder={spec.placeholder ?? ""}
          onChange={(e) => onChange(fromInput(e.target.value, type))}
          className="mt-2 w-full resize-y border-b border-hairline bg-transparent py-2 text-sm leading-relaxed outline-none transition-colors focus:border-foreground"
        />
      ) : (
        <input
          type={type === "number" ? "number" : "text"}
          value={toInput(value, type)}
          placeholder={spec.placeholder}
          onChange={(e) => onChange(fromInput(e.target.value, type))}
          className="mt-2 w-full border-b border-hairline bg-transparent py-2 text-sm outline-none transition-colors focus:border-foreground"
        />
      )}
    </label>
  );
}

/** One-item-per-line editor that lets you open an empty line and type into it. */
function ListField({
  spec,
  value,
  onChange,
}: {
  spec: FieldSpec;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const incoming = Array.isArray(value) ? (value as string[]).join("\n") : "";
  const [text, setText] = useState(incoming);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setText(incoming);
  }, [incoming, editing]);

  return (
    <label className="block">
      <span className="eyebrow">{spec.label}</span>
      <textarea
        rows={5}
        value={text}
        placeholder={spec.placeholder ?? "One item per line"}
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        onChange={(e) => {
          setText(e.target.value);
          onChange(
            e.target.value
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean),
          );
        }}
        className="mt-2 w-full resize-y border-b border-hairline bg-transparent py-2 text-sm leading-relaxed outline-none transition-colors focus:border-foreground"
      />
    </label>
  );
}

/** Editor for a single-row settings table. */
export function SingletonEditor({
  table,
  fields,
  note,
}: {
  table: string;
  fields: FieldSpec[];
  note?: string | undefined;
}) {
  const [row, setRow] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    void supabase
      .from(table as never)
      .select("*")
      .limit(1)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setRow(((data ?? [])[0] ?? {}) as unknown as Row);
      });
  }, [table]);

  if (!row) return <Loading />;

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from(table as never)
      .upsert({ ...(row as object), id: true } as never);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setDirty(false);
      toast.success("Saved");
    }
  }

  return (
    <div className="space-y-8">
      {note ? <p className="text-xs leading-relaxed text-muted-foreground">{note}</p> : null}
      <div className="grid gap-8 md:grid-cols-2">
        {fields.map((f) => (
          <FieldInput
            key={f.key}
            spec={f}
            value={row[f.key]}
            onChange={(v) => {
              setRow({ ...row, [f.key]: v });
              setDirty(true);
            }}
          />
        ))}
      </div>
      <SaveButton onClick={() => void save()} saving={saving} />
      {dirty ? <FloatingSave onClick={() => void save()} saving={saving} /> : null}
    </div>
  );
}


/** Editor for a list table: add, edit, reorder and delete rows. */
export function ListEditor({
  table,
  fields,
  itemLabel,
  titleKey,
  allowAdd = true,
  note,
  columns,
}: {
  table: string;
  fields: FieldSpec[];
  itemLabel: string;
  titleKey: string;
  /** Set false for lists whose rows are tied to the code (e.g. page sections). */
  allowAdd?: boolean | undefined;
  note?: string | undefined;
  /** Explicit column list for tables with protected columns (e.g. reviewer email). */
  columns?: string | undefined;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [dirtyId, setDirtyId] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from(table as never)
      .select(columns ?? "*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  if (!rows) return <Loading />;

  const update = (id: string, patch: Row) => {
    setRows(rows.map((r) => (r["id"] === id ? { ...r, ...patch } : r)));
    setDirtyId(id);
  };

  async function saveRow(row: Row) {
    setSaving(true);
    const { error } = await supabase
      .from(table as never)
      .update(row as never)
      .eq("id", row["id"] as string);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      setDirtyId(null);
      toast.success("Saved");
    }
  }


  /** Write sort_order for every row so the new visual order sticks. */
  async function persistOrder(next: Row[]) {
    const ordered: Row[] = next.map((r, i) => ({ ...r, sort_order: i }));
    setRows(ordered);
    await Promise.all(
      ordered.map((r, i) =>
        supabase
          .from(table as never)
          .update({ sort_order: i } as never)
          .eq("id", r["id"] as string),
      ),
    );
  }

  async function addRow() {
    const draft: Row = { sort_order: 0 };
    for (const f of fields) {
      if (f.type === "list") draft[f.key] = [];
      else if (f.type === "number") draft[f.key] = 0;
      else if (f.type === "bool") draft[f.key] = f.key === "in_gallery";
      else if (f.type === "select") draft[f.key] = f.options?.[0]?.value ?? "";
      else draft[f.key] = f.key === titleKey ? `New ${itemLabel}` : "";
    }
    if ("photo_key" in draft) draft["photo_key"] = `img-${Date.now()}`;
    if ("slug" in draft) draft["slug"] = `new-${Date.now()}`;
    const { data, error } = await supabase
      .from(table as never)
      .insert(draft as never)
      .select();
    if (error) {
      toast.error(error.message);
      return;
    }
    const created = ((data ?? [])[0] ?? null) as unknown as Row | null;
    if (!created) return;
    // New entries appear at the top of the list, so there's nothing to scroll to.
    await persistOrder([created, ...(rows ?? [])]);
    setOpen(created["id"] as string);
  }

  async function removeRow(id: string) {
    const { error } = await supabase
      .from(table as never)
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows(rows!.filter((r) => r["id"] !== id));
    toast.success("Deleted");
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...rows!];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const a = next[index]!;
    const b = next[target]!;
    next[index] = b;
    next[target] = a;
    setRows(next.map((r, i) => ({ ...r, sort_order: i })));
    await Promise.all(
      next.map((r, i) =>
        supabase
          .from(table as never)
          .update({ sort_order: i } as never)
          .eq("id", r["id"] as string),
      ),
    );
  }

  const bulkImageKey = fields.find((f) => f.type === "image")?.key;

  return (
    <div className="space-y-6">
      {note ? <p className="text-xs leading-relaxed text-muted-foreground">{note}</p> : null}

      {allowAdd && bulkImageKey ? (
        <BulkUploader
          table={table}
          fields={fields}
          imageKey={bulkImageKey}
          itemLabel={itemLabel}
          titleKey={titleKey}
          startOrder={rows.length}
          onCreated={(created) => void persistOrder([...created, ...(rows ?? [])])}
        />
      ) : null}

      <div className="flex items-center justify-between">
        <p className="eyebrow">
          {rows.length} {itemLabel}
          {rows.length === 1 ? "" : "s"}
        </p>
        {allowAdd ? (
          <button
            type="button"
            onClick={() => void addRow()}
            className="border border-foreground bg-foreground px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase text-background transition-opacity hover:opacity-85"
          >
            Add {itemLabel}
          </button>
        ) : null}
      </div>

      <ul className="divide-y divide-hairline border-y border-hairline">
        {rows.map((row, i) => {
          const id = row["id"] as string;
          const isOpen = open === id;
          const imageField = fields.find((f) => f.type === "image");
          const preview = imageField ? (row[imageField.key] as string) : "";
          return (
            <li key={id} className="py-4">
              <div className="flex items-center gap-4">
                {preview ? (
                  <img
                    src={preview}
                    alt=""
                    className="size-12 shrink-0 border border-hairline object-cover"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : id)}
                  className="min-w-0 flex-1 truncate text-left text-sm transition-colors hover:text-muted-foreground"
                >
                  {String(row[titleKey] ?? "Untitled")}
                </button>
                <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
                  <button
                    type="button"
                    aria-label="Move up"
                    onClick={() => void move(i, -1)}
                    className="px-2 py-1 text-xs hover:text-foreground"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    onClick={() => void move(i, 1)}
                    className="px-2 py-1 text-xs hover:text-foreground"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${itemLabel}`}
                    onClick={() => {
                      if (confirm(`Delete this ${itemLabel}?`)) void removeRow(id);
                    }}
                    className="px-2 py-1 hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {isOpen ? (
                <div className="mt-6 space-y-8 border-l border-hairline pl-5">
                  <div className="grid gap-8 md:grid-cols-2">
                    {fields.map((f) => (
                      <FieldInput
                        key={f.key}
                        spec={f}
                        value={row[f.key]}
                        onChange={(v) => update(id, { [f.key]: v })}
                      />
                    ))}
                  </div>
                  <SaveButton onClick={() => void saveRow(row)} saving={saving} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {dirtyId ? (
        <FloatingSave
          onClick={() => {
            const row = rows.find((r) => r["id"] === dirtyId);
            if (row) void saveRow(row);
          }}
          saving={saving}
        />
      ) : null}
    </div>
  );

}

interface StagedFile {
  id: string;
  file: File;
  preview: string;
  attrs: Row;
  /** Per-file visibility switches, applied right after the upload. */
  indexable: boolean;
  isPrivate: boolean;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

/** Multi-file uploader: stage files, set attributes per file, then create all rows at once. */
function BulkUploader({
  table,
  fields,
  imageKey,
  itemLabel,
  titleKey,
  startOrder,
  onCreated,
}: {
  table: string;
  fields: FieldSpec[];
  imageKey: string;
  itemLabel: string;
  titleKey: string;
  startOrder: number;
  onCreated: (rows: Row[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [running, setRunning] = useState(false);
  const [bulkIndexable, setBulkIndexable] = useState(true);
  const [bulkPrivate, setBulkPrivate] = useState(false);

  const attrFields = fields.filter((f) => f.key !== imageKey);

  useEffect(() => {
    return () => staged.forEach((s) => URL.revokeObjectURL(s.preview));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function blankAttrs(file: File): Row {
    const attrs: Row = {};
    const base = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim();
    for (const f of attrFields) {
      if (f.type === "list") attrs[f.key] = [];
      else if (f.type === "number") attrs[f.key] = 0;
      else if (f.type === "bool") attrs[f.key] = f.key === "in_gallery";
      else attrs[f.key] = f.key === titleKey ? base : "";
    }
    return attrs;
  }

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: StagedFile[] = Array.from(files).map((file, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      preview: URL.createObjectURL(file),
      attrs: blankAttrs(file),
      indexable: bulkIndexable,
      isPrivate: bulkPrivate,
      status: "pending" as const,
    }));
    setStaged((prev) => [...prev, ...next]);
  }

  function patch(id: string, attrs: Row) {
    setStaged((prev) =>
      prev.map((s) => (s.id === id ? { ...s, attrs: { ...s.attrs, ...attrs } } : s)),
    );
  }

  /** Copies the first item's attributes onto every other staged file. */
  function applyToAll() {
    setStaged((prev) => {
      const first = prev[0];
      if (!first) return prev;
      return prev.map((s, i) =>
        i === 0
          ? s
          : {
              ...s,
              indexable: first.indexable,
              isPrivate: first.isPrivate,
              attrs: { ...s.attrs, ...first.attrs, [titleKey]: s.attrs[titleKey] },
            },
      );
    });
  }

  async function uploadAll() {
    setRunning(true);
    const created: Row[] = [];
    let order = startOrder;

    for (const item of staged) {
      if (item.status === "done") continue;
      setStaged((prev) => prev.map((s) => (s.id === item.id ? { ...s, status: "uploading" } : s)));
      try {
        const src = await uploadSiteImage(item.file);
        if (!item.indexable || item.isPrivate) {
          await setImageFlags(src, { indexable: item.indexable, isPrivate: item.isPrivate });
        }
        const draft: Row = { ...item.attrs, [imageKey]: src, sort_order: order++ };

        if (fields.some((f) => f.key === "photo_key") || "photo_key" in draft) {
          draft["photo_key"] = `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        }
        if ("slug" in draft && !String(draft["slug"] ?? "").trim()) {
          draft["slug"] = `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        }
        const { data, error } = await supabase
          .from(table as never)
          .insert(draft as never)
          .select();
        if (error) throw error;
        const row = ((data ?? [])[0] ?? null) as unknown as Row | null;
        if (row) created.push(row);
        setStaged((prev) => prev.map((s) => (s.id === item.id ? { ...s, status: "done" } : s)));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        setStaged((prev) =>
          prev.map((s) => (s.id === item.id ? { ...s, status: "error", error: message } : s)),
        );
      }
    }

    setRunning(false);
    if (created.length) {
      onCreated(created);
      toast.success(`Added ${created.length} ${itemLabel}${created.length === 1 ? "" : "s"}`);
      setStaged((prev) => prev.filter((s) => s.status !== "done"));
    }
    const failed = staged.filter((s) => s.status === "error").length;
    if (failed) toast.error(`${failed} file${failed === 1 ? "" : "s"} failed`);
  }

  return (
    <div className="border border-hairline p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Bulk upload</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pick several files, set details for each, then add them all at once.
          </p>
          <label className="mt-3 flex items-center gap-2 text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground">
            <input
              type="checkbox"
              checked={bulkIndexable}
              onChange={(e) => setBulkIndexable(e.target.checked)}
              className="size-3 accent-current"
            />
            Default for new files: show on Internet
          </label>
          <label className="mt-2 flex items-center gap-2 text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground">
            <input
              type="checkbox"
              checked={bulkPrivate}
              onChange={(e) => setBulkPrivate(e.target.checked)}
              className="size-3 accent-current"
            />
            Default for new files: private (share link only)
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground"
          >
            <Upload className="size-3" /> Choose files
          </button>
          {staged.length > 1 ? (
            <button
              type="button"
              onClick={applyToAll}
              className="border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground"
            >
              Apply first to all
            </button>
          ) : null}
          {staged.length ? (
            <button
              type="button"
              onClick={() => void uploadAll()}
              disabled={running}
              className="inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase text-background transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {running ? <Loader2 className="size-3 animate-spin" /> : null}
              Upload {staged.length}
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {staged.length ? (
        <ul className="mt-5 divide-y divide-hairline border-t border-hairline">
          {staged.map((s) => (
            <li key={s.id} className="flex gap-4 py-4">
              <img
                src={s.preview}
                alt=""
                className="size-20 shrink-0 border border-hairline object-cover"
              />
              <div className="grid min-w-0 flex-1 gap-5 md:grid-cols-2">
                {attrFields.map((f) => (
                  <FieldInput
                    key={f.key}
                    spec={f}
                    value={s.attrs[f.key]}
                    onChange={(v) => patch(s.id, { [f.key]: v })}
                  />
                ))}
                <label className="flex items-center gap-2 text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={s.indexable}
                    onChange={(e) =>
                      setStaged((prev) =>
                        prev.map((x) =>
                          x.id === s.id ? { ...x, indexable: e.target.checked } : x,
                        ),
                      )
                    }
                    className="size-3 accent-current"
                  />
                  Show on Internet
                </label>
                <label className="flex items-center gap-2 text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={s.isPrivate}
                    onChange={(e) =>
                      setStaged((prev) =>
                        prev.map((x) => (x.id === s.id ? { ...x, isPrivate: e.target.checked } : x)),
                      )
                    }
                    className="size-3 accent-current"
                  />
                  Private (share link only)
                </label>
              </div>
              <div className="flex w-24 shrink-0 flex-col items-end gap-2 text-[0.625rem] uppercase tracking-widest text-muted-foreground">
                {s.status === "uploading" ? <Loader2 className="size-4 animate-spin" /> : null}
                {s.status === "error" ? (
                  <span className="text-right normal-case tracking-normal">{s.error}</span>
                ) : null}
                <button
                  type="button"
                  aria-label="Remove file"
                  onClick={() => setStaged((prev) => prev.filter((x) => x.id !== s.id))}
                  className="hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SaveButton({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className="inline-flex items-center gap-2 border border-foreground bg-foreground px-6 py-2.5 text-[0.625rem] tracking-[0.2em] uppercase text-background transition-opacity hover:opacity-85 disabled:opacity-50"
    >
      {saving ? <Loader2 className="size-3 animate-spin" /> : null}
      Save changes
    </button>
  );
}

/** Sticks to the bottom of the screen while there are unsaved edits. */
function FloatingSave({ onClick, saving }: { onClick: () => void; saving: boolean }) {
  return <FloatingSaveBar onClick={onClick} saving={saving} label="Save changes" />;
}


function Loading() {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Loading…
    </div>
  );
}
