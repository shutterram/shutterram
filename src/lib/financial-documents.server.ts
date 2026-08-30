export type PublicFinancialDocument = {
  kind: "Invoice" | "Receipt";
  number: string;
  clientName: string;
  currency: string;
  status: string;
  issuedOn: string | null;
  dueOn: string | null;
  paidOn: string | null;
  method: string;
  headerInfo: string;
  notes: string;
  footer: string;
  tax: number;
  lines: { description: string; qty: number; rate: number }[];
};

export async function loadPublicFinancialDocument(
  kind: "invoice" | "bill",
  token: string,
): Promise<PublicFinancialDocument | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const table = kind === "invoice" ? "crm_invoices" : "crm_bills";
  const { data } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("public_token", token)
    .maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  let clientName = "Client";
  if (row["contact_id"]) {
    const { data: contact } = await supabaseAdmin
      .from("crm_contacts")
      .select("name")
      .eq("id", String(row["contact_id"]))
      .maybeSingle();
    if (contact?.name) clientName = contact.name;
  }
  const lines = Array.isArray(row["line_items"])
    ? row["line_items"].map((line) => {
        const item = line as Record<string, unknown>;
        return {
          description: String(item["description"] ?? ""),
          qty: Number(item["qty"] ?? 0),
          rate: Number(item["rate"] ?? 0),
        };
      })
    : [];
  return {
    kind: kind === "invoice" ? "Invoice" : "Receipt",
    number: String(row["number"] ?? ""),
    clientName,
    currency: String(row["currency"] ?? "USD"),
    status: String(row["status"] ?? (kind === "bill" ? "paid" : "draft")),
    issuedOn: typeof row["issued_on"] === "string" ? row["issued_on"] : null,
    dueOn: typeof row["due_on"] === "string" ? row["due_on"] : null,
    paidOn: typeof row["paid_on"] === "string" ? row["paid_on"] : null,
    method: String(row["method"] ?? ""),
    headerInfo: String(row["header_info"] ?? ""),
    notes: String(row["notes"] ?? ""),
    footer: String(row["footer"] ?? ""),
    tax: Number(row["tax"] ?? 0),
    lines,
  };
}
