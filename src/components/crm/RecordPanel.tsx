import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { crmDelete, crmList, crmSave, type CrmRow } from "@/lib/crm.functions";
import { AreaField, Btn, Card, CheckField, Empty, SelectField, TextField } from "./ui";

export interface RecordField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "date" | "datetime" | "bool" | "select" | "tags" | "contact";
  options?: { value: string; label: string }[];
}

export interface RecordPanelProps {
  table: string;
  title: string;
  itemLabel: string;
  fields: RecordField[];
  titleKey: string;
  subtitleKeys?: string[];
  orderBy?: string;
  ascending?: boolean;
  contacts?: { id: string; name: string }[];
  defaults?: CrmRow;
  onChanged?: () => void;
}

function displayValue(row: CrmRow, key: string): string {
  const v = row[key];
  if (v === null || v === undefined || v === "") return "";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

export function RecordPanel(props: RecordPanelProps) {
  const list = useServerFn(crmList);
  const save = useServerFn(crmSave);
  const remove = useServerFn(crmDelete);

  const [rows, setRows] = useState<CrmRow[] | null>(null);
  const [editing, setEditing] = useState<CrmRow | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useMemo(
    () => async () => {
      try {
        const data = await list({
          data: {
            table: props.table,
            orderBy: props.orderBy ?? "created_at",
            ascending: props.ascending ?? false,
          },
        });
        setRows(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load records");
        setRows([]);
      }
    },
    [list, props.table, props.orderBy, props.ascending],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const contactName = (id: unknown) =>
    props.contacts?.find((c) => c.id === id)?.name ?? "";

  const filtered = (rows ?? []).filter((r) => {
    if (!query.trim()) return true;
    const hay = Object.values(r).map((v) => String(v ?? "")).join(" ").toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  async function persist(row: CrmRow) {
    setBusy(true);
    try {
      await save({ data: { table: props.table, row } });
      toast.success(`${props.itemLabel} saved`);
      setEditing(null);
      await load();
      props.onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function destroy(id: string) {
    if (typeof window !== "undefined" && !window.confirm(`Delete this ${props.itemLabel}?`)) return;
    try {
      await remove({ data: { table: props.table, id } });
      await load();
      props.onChanged?.();
      toast.success(`${props.itemLabel} deleted`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">{props.title}</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="border-0 border-b border-hairline bg-transparent py-2 text-sm outline-none focus:border-foreground"
          />
          <Btn variant="solid" onClick={() => setEditing({ ...(props.defaults ?? {}) })}>
            Add {props.itemLabel}
          </Btn>
        </div>
      </div>

      {rows === null ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-8">
          <Empty>No {props.itemLabel}s yet.</Empty>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
          {filtered.map((row) => (
            <li
              key={String(row["id"])}
              className="flex flex-wrap items-center justify-between gap-4 py-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">
                  {displayValue(row, props.titleKey) || `Untitled ${props.itemLabel}`}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {(props.subtitleKeys ?? [])
                    .map((k) =>
                      k === "contact_id" ? contactName(row[k]) : displayValue(row, k),
                    )
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex gap-2">
                <Btn onClick={() => setEditing(row)}>Edit</Btn>
                <Btn variant="danger" onClick={() => void destroy(String(row["id"]))}>
                  Delete
                </Btn>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/90 p-4 backdrop-blur-sm sm:p-8">
          <div className="mx-auto max-w-2xl">
            <Card>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl">
                  {editing["id"] ? `Edit ${props.itemLabel}` : `New ${props.itemLabel}`}
                </h3>
                <Btn onClick={() => setEditing(null)}>Close</Btn>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {props.fields.map((f) => {
                  const value = editing[f.key];
                  const set = (v: unknown) => setEditing({ ...editing, [f.key]: v as never });
                  if (f.type === "bool")
                    return (
                      <CheckField
                        key={f.key}
                        label={f.label}
                        checked={Boolean(value)}
                        onChange={set}
                      />
                    );
                  if (f.type === "textarea")
                    return (
                      <div key={f.key} className="sm:col-span-2">
                        <AreaField
                          label={f.label}
                          value={String(value ?? "")}
                          onChange={set}
                        />
                      </div>
                    );
                  if (f.type === "select")
                    return (
                      <SelectField
                        key={f.key}
                        label={f.label}
                        value={String(value ?? "")}
                        onChange={set}
                        options={f.options ?? []}
                      />
                    );
                  if (f.type === "contact")
                    return (
                      <SelectField
                        key={f.key}
                        label={f.label}
                        value={String(value ?? "")}
                        onChange={(v) => set(v || null)}
                        options={[
                          { value: "", label: "— none —" },
                          ...(props.contacts ?? []).map((c) => ({
                            value: c.id,
                            label: c.name || "Unnamed",
                          })),
                        ]}
                      />
                    );
                  if (f.type === "tags")
                    return (
                      <TextField
                        key={f.key}
                        label={`${f.label} (comma separated)`}
                        value={Array.isArray(value) ? value.join(", ") : String(value ?? "")}
                        onChange={(v) =>
                          set(v.split(",").map((s) => s.trim()).filter(Boolean))
                        }
                      />
                    );
                  return (
                    <TextField
                      key={f.key}
                      label={f.label}
                      type={
                        f.type === "number"
                          ? "number"
                          : f.type === "date"
                            ? "date"
                            : f.type === "datetime"
                              ? "datetime-local"
                              : "text"
                      }
                      value={
                        f.type === "datetime" && value
                          ? String(value).slice(0, 16)
                          : String(value ?? "")
                      }
                      onChange={(v) =>
                        set(
                          f.type === "number"
                            ? Number(v || 0)
                            : f.type === "datetime"
                              ? v
                                ? new Date(v).toISOString()
                                : null
                              : f.type === "date"
                                ? v || null
                                : v,
                        )
                      }
                    />
                  );
                })}
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <Btn onClick={() => setEditing(null)}>Cancel</Btn>
                <Btn variant="solid" disabled={busy} onClick={() => void persist(editing)}>
                  {busy ? "Saving…" : "Save"}
                </Btn>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
