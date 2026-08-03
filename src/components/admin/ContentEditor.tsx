import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Uploads a file to the private site-images bucket and returns its public path. */
export async function uploadSiteImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("site-images").upload(key, file, {
    cacheControl: "31536000",
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  return `/api/public/img/${key}`;
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

export type FieldType = "text" | "textarea" | "image" | "list" | "number" | "bool";

export interface FieldSpec {
  key: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
}

type Row = Record<string, unknown>;

function toInput(value: unknown, type: FieldType): string {
  if (type === "list") return Array.isArray(value) ? (value as string[]).join("\n") : "";
  if (value === null || value === undefined) return "";
  return String(value);
}

function fromInput(raw: string, type: FieldType): unknown {
  if (type === "list") return raw.split("\n").map((l) => l.trim()).filter(Boolean);
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

  const multiline = type === "textarea" || type === "list";

  return (
    <label className="block">
      <span className="eyebrow">{spec.label}</span>
      {multiline ? (
        <textarea
          rows={type === "list" ? 4 : 4}
          value={toInput(value, type)}
          placeholder={spec.placeholder ?? (type === "list" ? "One item per line" : "")}
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

/** Editor for a single-row settings table. */
export function SingletonEditor({ table, fields }: { table: string; fields: FieldSpec[] }) {
  const [row, setRow] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void supabase
      .from(table as never)
      .select("*")
      .limit(1)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setRow((((data ?? [])[0] ?? {}) as unknown) as Row);
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
    else toast.success("Saved");
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-2">
        {fields.map((f) => (
          <FieldInput
            key={f.key}
            spec={f}
            value={row[f.key]}
            onChange={(v) => setRow({ ...row, [f.key]: v })}
          />
        ))}
      </div>
      <SaveButton onClick={() => void save()} saving={saving} />
    </div>
  );
}

/** Editor for a list table: add, edit, reorder and delete rows. */
export function ListEditor({
  table,
  fields,
  itemLabel,
  titleKey,
}: {
  table: string;
  fields: FieldSpec[];
  itemLabel: string;
  titleKey: string;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from(table as never)
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  if (!rows) return <Loading />;

  const update = (id: string, patch: Row) =>
    setRows(rows.map((r) => (r["id"] === id ? { ...r, ...patch } : r)));

  async function saveRow(row: Row) {
    setSaving(true);
    const { error } = await supabase.from(table as never).update(row as never).eq("id", row["id"] as string);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  }

  async function addRow() {
    const draft: Row = { sort_order: rows!.length };
    for (const f of fields) {
      if (f.type === "list") draft[f.key] = [];
      else if (f.type === "number") draft[f.key] = 0;
      else if (f.type === "bool") draft[f.key] = false;
      else draft[f.key] = f.key === titleKey ? `New ${itemLabel}` : "";
    }
    if ("photo_key" in draft) draft["photo_key"] = `img-${Date.now()}`;
    if ("slug" in draft) draft["slug"] = `new-${Date.now()}`;
    const { data, error } = await supabase.from(table as never).insert(draft as never).select();
    if (error) {
      toast.error(error.message);
      return;
    }
    const created = (((data ?? [])[0] ?? null) as unknown) as Row | null;
    setRows([...(rows ?? []), ...(created ? [created] : [])]);
    if (created) setOpen(created["id"] as string);
  }

  async function removeRow(id: string) {
    const { error } = await supabase.from(table as never).delete().eq("id", id);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow">
          {rows.length} {itemLabel}
          {rows.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={() => void addRow()}
          className="border border-foreground bg-foreground px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase text-background transition-opacity hover:opacity-85"
        >
          Add {itemLabel}
        </button>
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
                  <img src={preview} alt="" className="size-12 shrink-0 border border-hairline object-cover" />
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : id)}
                  className="min-w-0 flex-1 truncate text-left text-sm transition-colors hover:text-muted-foreground"
                >
                  {String(row[titleKey] ?? "Untitled")}
                </button>
                <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
                  <button type="button" aria-label="Move up" onClick={() => void move(i, -1)} className="px-2 py-1 text-xs hover:text-foreground">
                    ↑
                  </button>
                  <button type="button" aria-label="Move down" onClick={() => void move(i, 1)} className="px-2 py-1 text-xs hover:text-foreground">
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

function Loading() {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /> Loading…
    </div>
  );
}
