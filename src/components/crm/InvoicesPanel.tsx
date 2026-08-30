import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  crmDelete,
  crmList,
  crmSave,
  crmSettingsGet,
  crmSettingsSave,
  type CrmRow,
} from "@/lib/crm.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaField,
  Btn,
  Card,
  Empty,
  Label,
  SelectField,
  TextField,
  copyLink,
} from "@/components/crm/ui";
import { EmailButton } from "@/components/crm/EmailButton";
import { financialDocumentShortLink } from "@/lib/financial-documents.functions";
import { SITE_URL } from "@/lib/seo";

type Line = { description: string; qty: number; rate: number };

type Invoice = {
  id?: string;
  public_token?: string;
  number: string;
  contact_id: string | null;
  currency: string;
  status: string;
  issued_on: string | null;
  due_on: string | null;
  paid_on: string | null;
  notes: string;
  header_info: string;
  tax: number;
  amount: number;
  line_items: Line[];
};

type Bill = {
  id?: string;
  public_token?: string;
  invoice_id: string | null;
  contact_id: string | null;
  number: string;
  currency: string;
  amount: number;
  tax: number;
  line_items: Line[];
  paid_on: string | null;
  method: string;
  notes: string;
  header_info: string;
  footer: string;
};

const STATUSES = ["draft", "sent", "paid", "overdue", "void"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyInvoice(number: string, currency: string, header: string): Invoice {
  return {
    number,
    contact_id: null,
    currency,
    status: "draft",
    issued_on: today(),
    due_on: null,
    paid_on: null,
    notes: "",
    header_info: header,
    tax: 0,
    amount: 0,
    line_items: [{ description: "Photography coverage", qty: 1, rate: 0 }],
  };
}

function toLines(value: unknown): Line[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      description: String(v["description"] ?? ""),
      qty: Number(v["qty"] ?? 1) || 0,
      rate: Number(v["rate"] ?? 0) || 0,
    }));
}

function money(amount: number, currency: string) {
  const n = Math.round(amount * 100) / 100;
  return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function totalsOf(lines: Line[], taxPercent: number) {
  const subtotal = lines.reduce((sum, l) => sum + l.qty * l.rate, 0);
  const taxAmount = (subtotal * (taxPercent || 0)) / 100;
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

const PRINT_CSS = `*{box-sizing:border-box}
body{font-family:Georgia,'Times New Roman',serif;color:#111;margin:0;padding:48px;background:#fff}
img{max-width:100%}
table{width:100%;border-collapse:collapse}
`;

function printNode(node: HTMLElement | null, title: string) {
  if (!node) return;
  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) {
    toast.error("Allow pop-ups to download the document");
    return;
  }
  win.document.write(
    `<!doctype html><html><head><title>${title}</title><meta charset="utf-8" /><style>${PRINT_CSS}</style></head><body>${node.innerHTML}</body></html>`,
  );
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

/** Shared paper layout for invoices and bills. */
function Paper({
  kind,
  number,
  logo,
  logoHeight,
  headerInfo,
  billedTo,
  from,
  meta,
  lines,
  currency,
  taxPercent,
  footerText,
}: {
  kind: "Invoice" | "Receipt";
  number: string;
  logo: string;
  logoHeight: number;
  headerInfo: string;
  billedTo: string;
  from: string;
  meta: { label: string; value: string }[];
  lines: Line[];
  currency: string;
  taxPercent: number;
  footerText: string;
}) {
  const { subtotal, taxAmount, total } = totalsOf(lines, taxPercent);
  const cell = { padding: "10px 6px", borderBottom: "1px solid #e5e5e5" } as const;
  const head = {
    borderBottom: "1px solid #111",
    padding: "8px 6px",
    fontSize: 11,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
  } as const;

  return (
    <div style={{ background: "#fff", color: "#111", padding: 32 }}>
      <div style={{ textAlign: "center", borderBottom: "1px solid #111", paddingBottom: 18 }}>
        {logo ? (
          <img
            src={logo}
            alt=""
            style={{ height: logoHeight, width: "auto", display: "block", margin: "0 auto 10px" }}
          />
        ) : null}
        {headerInfo ? (
          <div style={{ whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.6, color: "#444" }}>
            {headerInfo}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 32, marginTop: 24 }}>
        <div>
          <h1
            style={{
              fontSize: 28,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {kind}
          </h1>
          <p style={{ color: "#666", fontSize: 12, margin: "4px 0 0" }}>{number}</p>
        </div>
        <div style={{ whiteSpace: "pre-wrap", fontSize: 13, textAlign: "right" }}>{from}</div>
      </div>

      <div
        style={{ display: "flex", justifyContent: "space-between", marginTop: 24, fontSize: 13 }}
      >
        <div>
          <p style={{ color: "#666", fontSize: 11, textTransform: "uppercase", margin: 0 }}>
            Billed to
          </p>
          <p style={{ margin: "4px 0 0" }}>{billedTo}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          {meta.map((m) => (
            <p key={m.label} style={{ margin: "2px 0" }}>
              {m.label} {m.value}
            </p>
          ))}
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 26, fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ ...head, textAlign: "left" }}>Description</th>
            <th style={{ ...head, textAlign: "right" }}>Qty</th>
            <th style={{ ...head, textAlign: "right" }}>Rate</th>
            <th style={{ ...head, textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td style={cell}>{l.description}</td>
              <td style={{ ...cell, textAlign: "right" }}>{l.qty}</td>
              <td style={{ ...cell, textAlign: "right" }}>{money(l.rate, currency)}</td>
              <td style={{ ...cell, textAlign: "right" }}>{money(l.qty * l.rate, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginLeft: "auto", width: 280, marginTop: 20, fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
          <span>Subtotal</span>
          <span>{money(subtotal, currency)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
          <span>Tax ({taxPercent}%)</span>
          <span>{money(taxAmount, currency)}</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
            borderTop: "1px solid #111",
            fontWeight: "bold",
          }}
        >
          <span>{kind === "Receipt" ? "Amount paid" : "Total"}</span>
          <span>{money(total, currency)}</span>
        </div>
      </div>

      <footer style={{ marginTop: 36, fontSize: 12, color: "#555", whiteSpace: "pre-wrap" }}>
        {footerText}
      </footer>
    </div>
  );
}

export function InvoicesPanel({
  contacts,
  mode = "invoices",
}: {
  contacts: { id: string; name: string; email?: string }[];
  mode?: "invoices" | "bills";
}) {
  const listFn = useServerFn(crmList);
  const saveFn = useServerFn(crmSave);
  const deleteFn = useServerFn(crmDelete);
  const settingsGet = useServerFn(crmSettingsGet);
  const settingsSave = useServerFn(crmSettingsSave);
  const shortLink = useServerFn(financialDocumentShortLink);

  const [rows, setRows] = useState<Invoice[] | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [settings, setSettings] = useState<CrmRow | null>(null);
  const [logo, setLogo] = useState<{ url: string; height: number }>({ url: "", height: 64 });
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [busy, setBusy] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const billRef = useRef<HTMLDivElement>(null);

  const currency = String(settings?.["currency"] ?? "USD");
  const prefix = String(settings?.["invoice_prefix"] ?? "INV-");
  const nextNumber = Number(settings?.["invoice_next_number"] ?? 1) || 1;
  const billPrefix = String(settings?.["bill_prefix"] ?? "BILL-");
  const billNext = Number(settings?.["bill_next_number"] ?? 1) || 1;
  const defaultHeader = String(settings?.["invoice_header_info"] ?? "");

  async function load() {
    try {
      const [invoiceRows, billRows, s] = await Promise.all([
        listFn({ data: { table: "crm_invoices", orderBy: "created_at", ascending: false } }),
        listFn({ data: { table: "crm_bills", orderBy: "created_at", ascending: false } }),
        settingsGet({ data: {} as never }),
      ]);
      setSettings(s);
      setRows(
        invoiceRows.map((r) => ({
          id: String(r["id"]),
          public_token: String(r["public_token"] ?? ""),
          number: String(r["number"] ?? ""),
          contact_id: (r["contact_id"] as string | null) ?? null,
          currency: String(r["currency"] ?? "USD"),
          status: String(r["status"] ?? "draft"),
          issued_on: (r["issued_on"] as string | null) ?? null,
          due_on: (r["due_on"] as string | null) ?? null,
          paid_on: (r["paid_on"] as string | null) ?? null,
          notes: String(r["notes"] ?? ""),
          header_info: String(r["header_info"] ?? ""),
          tax: Number(r["tax"] ?? 0),
          amount: Number(r["amount"] ?? 0),
          line_items: toLines(r["line_items"]),
        })),
      );
      setBills(
        billRows.map((r) => ({
          id: String(r["id"]),
          public_token: String(r["public_token"] ?? ""),
          invoice_id: (r["invoice_id"] as string | null) ?? null,
          contact_id: (r["contact_id"] as string | null) ?? null,
          number: String(r["number"] ?? ""),
          currency: String(r["currency"] ?? "USD"),
          amount: Number(r["amount"] ?? 0),
          tax: Number(r["tax"] ?? 0),
          line_items: toLines(r["line_items"]),
          paid_on: (r["paid_on"] as string | null) ?? null,
          method: String(r["method"] ?? ""),
          notes: String(r["notes"] ?? ""),
          header_info: String(r["header_info"] ?? ""),
          footer: String(r["footer"] ?? ""),
        })),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load invoices");
      setRows([]);
    }
  }

  useEffect(() => {
    void load();
    void supabase
      .from("settings" as never)
      .select("logo_invoice,logo_invoice_height,logo_header")
      .limit(1)
      .then(({ data }) => {
        const s = ((data ?? [])[0] ?? {}) as Record<string, unknown>;
        setLogo({
          url: String(s["logo_invoice"] || s["logo_header"] || ""),
          height: Number(s["logo_invoice_height"]) || 64,
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { subtotal, taxAmount, total } = useMemo(
    () => totalsOf(editing?.line_items ?? [], editing?.tax ?? 0),
    [editing],
  );

  const contactName = (id: string | null) => contacts.find((c) => c.id === id)?.name ?? "—";
  const contactEmail = (id: string | null) => contacts.find((c) => c.id === id)?.email ?? "";

  const from = String(settings?.["invoice_from"] ?? "");
  const terms = String(settings?.["invoice_terms"] ?? "");
  const footer = String(settings?.["invoice_footer"] ?? "");
  const billFooter = String(settings?.["bill_footer"] ?? "");

  async function copyDocumentLink(kind: "invoice" | "bill", id?: string) {
    if (!id) {
      toast.error("Save this document before copying its link");
      return;
    }
    try {
      const { code } = await shortLink({ data: { kind, id } });
      await copyLink(`${SITE_URL}/${code}`, (message) => toast.success(message));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create link");
    }
  }

  /** Creates a receipt from an invoice (used on "mark paid" and manually). */
  async function generateBill(inv: Invoice, silent = false) {
    if (!inv.id) return;
    const { total: amount } = totalsOf(inv.line_items, inv.tax);
    const number = `${billPrefix}${String(billNext).padStart(4, "0")}`;
    await saveFn({
      data: {
        table: "crm_bills",
        row: {
          invoice_id: inv.id,
          contact_id: inv.contact_id,
          number,
          currency: inv.currency,
          amount: Math.round(amount * 100) / 100,
          tax: inv.tax,
          line_items: inv.line_items as unknown as CrmRow["x"],
          paid_on: inv.paid_on ?? today(),
          method: "",
          notes: "",
          header_info: inv.header_info || defaultHeader,
          footer: billFooter,
        } as CrmRow,
      },
    });
    await settingsSave({ data: { patch: { bill_next_number: billNext + 1 } } });
    if (!silent) toast.success(`Bill ${number} generated`);
  }

  async function save(andClose = true) {
    if (!editing) return;
    setBusy(true);
    try {
      const wasPaid = rows?.find((r) => r.id === editing.id)?.status === "paid";
      const saved = await saveFn({
        data: {
          table: "crm_invoices",
          row: {
            ...(editing.id ? { id: editing.id } : {}),
            number: editing.number,
            contact_id: editing.contact_id,
            currency: editing.currency,
            status: editing.status,
            issued_on: editing.issued_on,
            due_on: editing.due_on,
            paid_on: editing.status === "paid" ? (editing.paid_on ?? today()) : editing.paid_on,
            notes: editing.notes,
            header_info: editing.header_info,
            tax: editing.tax,
            amount: Math.round(total * 100) / 100,
            line_items: editing.line_items as unknown as CrmRow["x"],
          } as CrmRow,
        },
      });
      const savedId = String(saved["id"]);
      if (!editing.id) {
        await settingsSave({ data: { patch: { invoice_next_number: nextNumber + 1 } } });
      }
      // Auto-generate the receipt the first time an invoice becomes paid.
      if (editing.status === "paid" && !wasPaid && !bills.some((b) => b.invoice_id === savedId)) {
        await generateBill({ ...editing, id: savedId }, true);
        toast.success("Invoice saved · bill generated");
      } else {
        toast.success("Invoice saved");
      }
      await load();
      if (andClose) setEditing(null);
      else setEditing((c) => (c ? { ...c, id: savedId } : c));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save invoice");
    } finally {
      setBusy(false);
    }
  }

  async function saveBill() {
    if (!editingBill) return;
    setBusy(true);
    try {
      await saveFn({
        data: {
          table: "crm_bills",
          row: {
            ...(editingBill.id ? { id: editingBill.id } : {}),
            invoice_id: editingBill.invoice_id,
            contact_id: editingBill.contact_id,
            number: editingBill.number,
            currency: editingBill.currency,
            amount: Math.round(totalsOf(editingBill.line_items, editingBill.tax).total * 100) / 100,
            tax: editingBill.tax,
            line_items: editingBill.line_items as unknown as CrmRow["x"],
            paid_on: editingBill.paid_on,
            method: editingBill.method,
            notes: editingBill.notes,
            header_info: editingBill.header_info,
            footer: editingBill.footer,
          } as CrmRow,
        },
      });
      toast.success("Bill saved");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save bill");
    } finally {
      setBusy(false);
    }
  }

  if (rows === null) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (editingBill) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap gap-3">
          <Btn onClick={() => setEditingBill(null)}>← Back</Btn>
          <Btn variant="solid" disabled={busy} onClick={() => void saveBill()}>
            Save bill
          </Btn>
          <Btn onClick={() => printNode(billRef.current, editingBill.number)}>Download / print</Btn>
          <Btn
            disabled={!editingBill.id}
            onClick={() => void copyDocumentLink("bill", editingBill.id)}
          >
            Copy client link
          </Btn>
          <EmailButton
            label="Email bill"
            subject={`Receipt ${editingBill.number}`}
            body={`Here is your receipt ${editingBill.number} for ${money(
              totalsOf(editingBill.line_items, editingBill.tax).total,
              editingBill.currency,
            )}${editingBill.paid_on ? `, paid on ${editingBill.paid_on}` : ""}.${editingBill.public_token ? `\n${SITE_URL}/bill/${editingBill.public_token}` : ""}\n\nThank you.`}
            clientEmail={contactEmail(editingBill.contact_id)}
            clientName={contacts.find((c) => c.id === editingBill.contact_id)?.name}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Bill number"
                value={editingBill.number}
                onChange={(v) => setEditingBill({ ...editingBill, number: v })}
              />
              <SelectField
                label="Client"
                value={editingBill.contact_id ?? ""}
                onChange={(v) => setEditingBill({ ...editingBill, contact_id: v || null })}
                options={[
                  { value: "", label: "—" },
                  ...contacts.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
              <TextField
                label="Paid on"
                type="date"
                value={editingBill.paid_on ?? ""}
                onChange={(v) => setEditingBill({ ...editingBill, paid_on: v || null })}
              />
              <TextField
                label="Payment method"
                value={editingBill.method}
                onChange={(v) => setEditingBill({ ...editingBill, method: v })}
              />
              <TextField
                label="Currency"
                value={editingBill.currency}
                onChange={(v) => setEditingBill({ ...editingBill, currency: v })}
              />
              <TextField
                label="Tax %"
                type="number"
                value={String(editingBill.tax)}
                onChange={(v) => setEditingBill({ ...editingBill, tax: Number(v) || 0 })}
              />
            </div>

            <div className="mt-8">
              <Label>Line items</Label>
              <div className="mt-3 space-y-3">
                {editingBill.line_items.map((line, i) => (
                  <div key={i} className="grid grid-cols-[1fr_4rem_6rem_2rem] items-end gap-2">
                    <TextField
                      label={i === 0 ? "Description" : ""}
                      value={line.description}
                      onChange={(v) =>
                        setEditingBill({
                          ...editingBill,
                          line_items: editingBill.line_items.map((l, j) =>
                            j === i ? { ...l, description: v } : l,
                          ),
                        })
                      }
                    />
                    <TextField
                      label={i === 0 ? "Qty" : ""}
                      type="number"
                      value={String(line.qty)}
                      onChange={(v) =>
                        setEditingBill({
                          ...editingBill,
                          line_items: editingBill.line_items.map((l, j) =>
                            j === i ? { ...l, qty: Number(v) || 0 } : l,
                          ),
                        })
                      }
                    />
                    <TextField
                      label={i === 0 ? "Rate" : ""}
                      type="number"
                      value={String(line.rate)}
                      onChange={(v) =>
                        setEditingBill({
                          ...editingBill,
                          line_items: editingBill.line_items.map((l, j) =>
                            j === i ? { ...l, rate: Number(v) || 0 } : l,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      title="Remove line"
                      onClick={() =>
                        setEditingBill({
                          ...editingBill,
                          line_items: editingBill.line_items.filter((_, j) => j !== i),
                        })
                      }
                      className="pb-2 text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Btn
                  onClick={() =>
                    setEditingBill({
                      ...editingBill,
                      line_items: [...editingBill.line_items, { description: "", qty: 1, rate: 0 }],
                    })
                  }
                >
                  Add line
                </Btn>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <AreaField
                label="Header (under the logo)"
                value={editingBill.header_info}
                onChange={(v) => setEditingBill({ ...editingBill, header_info: v })}
              />
              <AreaField
                label="Notes"
                value={editingBill.notes}
                onChange={(v) => setEditingBill({ ...editingBill, notes: v })}
              />
              <AreaField
                label="Footer"
                value={editingBill.footer}
                onChange={(v) => setEditingBill({ ...editingBill, footer: v })}
              />
            </div>
          </Card>

          <Card>
            <p className="text-[0.625rem] tracking-[0.22em] uppercase text-muted-foreground">
              Preview
            </p>
            <div ref={billRef} className="mt-4">
              <Paper
                kind="Receipt"
                number={editingBill.number}
                logo={logo.url}
                logoHeight={logo.height}
                headerInfo={editingBill.header_info || defaultHeader}
                billedTo={contactName(editingBill.contact_id)}
                from={from || "Shutter Ram Photography"}
                meta={[
                  { label: "Paid on", value: editingBill.paid_on ?? "—" },
                  { label: "Method", value: editingBill.method || "—" },
                ]}
                lines={editingBill.line_items}
                currency={editingBill.currency}
                taxPercent={editingBill.tax}
                footerText={[editingBill.notes, editingBill.footer].filter(Boolean).join("\n\n")}
              />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap gap-3">
          <Btn onClick={() => setEditing(null)}>← Invoices</Btn>
          <Btn variant="solid" disabled={busy} onClick={() => void save(false)}>
            Save
          </Btn>
          <Btn onClick={() => printNode(printRef.current, editing.number)}>Download / print</Btn>
          <Btn disabled={!editing.id} onClick={() => void copyDocumentLink("invoice", editing.id)}>
            Copy client link
          </Btn>
          <Btn
            disabled={!editing.id || busy}
            onClick={() => {
              setBusy(true);
              void generateBill(editing)
                .then(load)
                .catch((e: unknown) =>
                  toast.error(e instanceof Error ? e.message : "Could not generate bill"),
                )
                .finally(() => setBusy(false));
            }}
          >
            Generate bill
          </Btn>
          <EmailButton
            label="Email invoice"
            subject={`Invoice ${editing.number}`}
            body={`Please find invoice ${editing.number} for ${money(total, editing.currency)}${
              editing.due_on ? `, due ${editing.due_on}` : ""
            }.${editing.public_token ? `\n${SITE_URL}/invoice/${editing.public_token}` : ""}\n\nThank you.`}
            clientEmail={contactEmail(editing.contact_id)}
            clientName={contacts.find((c) => c.id === editing.contact_id)?.name}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Invoice number"
                value={editing.number}
                onChange={(v) => setEditing({ ...editing, number: v })}
              />
              <SelectField
                label="Client"
                value={editing.contact_id ?? ""}
                onChange={(v) => setEditing({ ...editing, contact_id: v || null })}
                options={[
                  { value: "", label: "—" },
                  ...contacts.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
              <TextField
                label="Currency"
                value={editing.currency}
                onChange={(v) => setEditing({ ...editing, currency: v })}
              />
              <SelectField
                label="Status"
                value={editing.status}
                onChange={(v) => setEditing({ ...editing, status: v })}
                options={STATUSES.map((s) => ({
                  value: s,
                  label: s[0]!.toUpperCase() + s.slice(1),
                }))}
              />
              <TextField
                label="Issued on"
                type="date"
                value={editing.issued_on ?? ""}
                onChange={(v) => setEditing({ ...editing, issued_on: v || null })}
              />
              <TextField
                label="Due on"
                type="date"
                value={editing.due_on ?? ""}
                onChange={(v) => setEditing({ ...editing, due_on: v || null })}
              />
              <TextField
                label="Tax %"
                type="number"
                value={String(editing.tax)}
                onChange={(v) => setEditing({ ...editing, tax: Number(v) || 0 })}
              />
            </div>

            <div className="mt-8">
              <AreaField
                label="Header under the logo (website, phone, email)"
                value={editing.header_info}
                onChange={(v) => setEditing({ ...editing, header_info: v })}
              />
            </div>

            <div className="mt-8">
              <Label>Line items</Label>
              <div className="mt-3 space-y-3">
                {editing.line_items.map((line, i) => (
                  <div key={i} className="grid grid-cols-[1fr_4rem_6rem_2rem] items-end gap-2">
                    <TextField
                      label={i === 0 ? "Description" : ""}
                      value={line.description}
                      onChange={(v) =>
                        setEditing({
                          ...editing,
                          line_items: editing.line_items.map((l, j) =>
                            j === i ? { ...l, description: v } : l,
                          ),
                        })
                      }
                    />
                    <TextField
                      label={i === 0 ? "Qty" : ""}
                      type="number"
                      value={String(line.qty)}
                      onChange={(v) =>
                        setEditing({
                          ...editing,
                          line_items: editing.line_items.map((l, j) =>
                            j === i ? { ...l, qty: Number(v) || 0 } : l,
                          ),
                        })
                      }
                    />
                    <TextField
                      label={i === 0 ? "Rate" : ""}
                      type="number"
                      value={String(line.rate)}
                      onChange={(v) =>
                        setEditing({
                          ...editing,
                          line_items: editing.line_items.map((l, j) =>
                            j === i ? { ...l, rate: Number(v) || 0 } : l,
                          ),
                        })
                      }
                    />
                    <button
                      type="button"
                      title="Remove line"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          line_items: editing.line_items.filter((_, j) => j !== i),
                        })
                      }
                      className="pb-2 text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Btn
                  onClick={() =>
                    setEditing({
                      ...editing,
                      line_items: [...editing.line_items, { description: "", qty: 1, rate: 0 }],
                    })
                  }
                >
                  Add line
                </Btn>
              </div>
            </div>

            <div className="mt-8">
              <AreaField
                label="Notes on the invoice"
                value={editing.notes}
                onChange={(v) => setEditing({ ...editing, notes: v })}
              />
            </div>

            <div className="mt-8 space-y-4 border-t border-hairline pt-6">
              <p className="text-[0.625rem] tracking-[0.22em] uppercase text-muted-foreground">
                Studio details (used on every invoice and bill)
              </p>
              <AreaField
                label="Default header under the logo"
                value={defaultHeader}
                onChange={(v) => setSettings({ ...(settings ?? {}), invoice_header_info: v })}
              />
              <AreaField
                label="Billed from"
                value={from}
                onChange={(v) => setSettings({ ...(settings ?? {}), invoice_from: v })}
              />
              <AreaField
                label="Payment terms"
                value={terms}
                onChange={(v) => setSettings({ ...(settings ?? {}), invoice_terms: v })}
              />
              <AreaField
                label="Footer note"
                value={footer}
                onChange={(v) => setSettings({ ...(settings ?? {}), invoice_footer: v })}
              />
              <AreaField
                label="Bill footer note"
                value={billFooter}
                onChange={(v) => setSettings({ ...(settings ?? {}), bill_footer: v })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Bill number prefix"
                  value={billPrefix}
                  onChange={(v) => setSettings({ ...(settings ?? {}), bill_prefix: v })}
                />
                <TextField
                  label="Next bill number"
                  type="number"
                  value={String(billNext)}
                  onChange={(v) =>
                    setSettings({ ...(settings ?? {}), bill_next_number: Number(v) || 1 })
                  }
                />
              </div>
              <Btn
                onClick={() => {
                  void settingsSave({
                    data: {
                      patch: {
                        invoice_header_info: defaultHeader,
                        invoice_from: from,
                        invoice_terms: terms,
                        invoice_footer: footer,
                        bill_footer: billFooter,
                        bill_prefix: billPrefix,
                        bill_next_number: billNext,
                      },
                    },
                  }).then(() => toast.success("Studio details saved"));
                }}
              >
                Save studio details
              </Btn>
              <p className="text-xs text-muted-foreground">
                The logo at the top of invoices and bills is set in the content studio → Logos →
                “Invoice &amp; bill logo”.
              </p>
            </div>
          </Card>

          <Card>
            <p className="text-[0.625rem] tracking-[0.22em] uppercase text-muted-foreground">
              Preview
            </p>
            <div ref={printRef} className="mt-4">
              <Paper
                kind="Invoice"
                number={editing.number}
                logo={logo.url}
                logoHeight={logo.height}
                headerInfo={editing.header_info || defaultHeader}
                billedTo={contactName(editing.contact_id)}
                from={from || "Shutter Ram Photography"}
                meta={[
                  { label: "Issued", value: editing.issued_on ?? "—" },
                  { label: "Due", value: editing.due_on ?? "—" },
                ]}
                lines={editing.line_items}
                currency={editing.currency}
                taxPercent={editing.tax}
                footerText={[editing.notes, terms, footer].filter(Boolean).join("\n\n")}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Subtotal {money(subtotal, editing.currency)} · Tax{" "}
              {money(taxAmount, editing.currency)}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (mode === "bills") {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <Btn
            variant="solid"
            onClick={() =>
              setEditingBill({
                invoice_id: null,
                contact_id: null,
                number: `${billPrefix}${String(billNext).padStart(4, "0")}`,
                currency,
                amount: 0,
                tax: 0,
                line_items: [{ description: "Photography coverage", qty: 1, rate: 0 }],
                paid_on: today(),
                method: "",
                notes: "",
                header_info: defaultHeader,
                footer: billFooter,
              })
            }
          >
            New bill
          </Btn>
        </div>

        <div className="space-y-3">
          {bills.length === 0 ? (
            <Empty>
              No bills yet — they appear automatically when an invoice is marked paid, or create one
              here.
            </Empty>
          ) : (
            bills.map((bill) => (
              <Card key={bill.id}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {bill.number} · {contactName(bill.contact_id)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {money(bill.amount, bill.currency)} · paid {bill.paid_on ?? "—"}
                      {bill.method ? ` · ${bill.method}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Btn onClick={() => setEditingBill(bill)}>Open</Btn>
                    <Btn onClick={() => void copyDocumentLink("bill", bill.id)}>Copy link</Btn>
                    <EmailButton
                      subject={`Receipt ${bill.number}`}
                      body={`Here is your receipt ${bill.number} for ${money(
                        bill.amount,
                        bill.currency,
                      )}${bill.paid_on ? `, paid on ${bill.paid_on}` : ""}.${bill.public_token ? `\n${SITE_URL}/bill/${bill.public_token}` : ""}\n\nThank you.`}
                      clientEmail={contactEmail(bill.contact_id)}
                      clientName={contacts.find((c) => c.id === bill.contact_id)?.name}
                    />
                    <Btn
                      variant="danger"
                      onClick={() => {
                        if (!bill.id || !window.confirm("Delete this bill?")) return;
                        void deleteFn({ data: { table: "crm_bills", id: bill.id } }).then(load);
                      }}
                    >
                      Delete
                    </Btn>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <Btn
          variant="solid"
          onClick={() =>
            setEditing(
              emptyInvoice(
                `${prefix}${String(nextNumber).padStart(4, "0")}`,
                currency,
                defaultHeader,
              ),
            )
          }
        >
          New invoice
        </Btn>
      </div>

      {rows.length === 0 ? (
        <Empty>No invoices yet — create your first one.</Empty>
      ) : (
        <div className="space-y-3">
          {rows.map((inv) => (
            <Card key={inv.id}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    {inv.number} · {contactName(inv.contact_id)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {money(inv.amount, inv.currency)} · {inv.status} · {inv.issued_on ?? "no date"}
                    {bills.some((b) => b.invoice_id === inv.id) ? " · bill generated" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Btn onClick={() => setEditing(inv)}>Open</Btn>
                  <Btn onClick={() => void copyDocumentLink("invoice", inv.id)}>Copy link</Btn>
                  <EmailButton
                    subject={`Invoice ${inv.number}`}
                    body={`Please find invoice ${inv.number} for ${money(inv.amount, inv.currency)}${
                      inv.due_on ? `, due ${inv.due_on}` : ""
                    }.${inv.public_token ? `\n${SITE_URL}/invoice/${inv.public_token}` : ""}\n\nThank you.`}
                    clientEmail={contactEmail(inv.contact_id)}
                    clientName={contacts.find((c) => c.id === inv.contact_id)?.name}
                  />
                  <Btn
                    variant="danger"
                    onClick={() => {
                      if (!inv.id || !window.confirm("Delete this invoice?")) return;
                      void deleteFn({ data: { table: "crm_invoices", id: inv.id } }).then(load);
                    }}
                  >
                    Delete
                  </Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Receipts for paid invoices live in the Bills tab.
      </p>
    </div>
  );
}
