import type { PublicFinancialDocument } from "@/lib/financial-documents.server";

function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function FinancialDocumentPage({ document }: { document: PublicFinancialDocument | null }) {
  if (!document) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 text-center">
        <div className="w-full">
          <p className="eyebrow">Unavailable</p>
          <h1 className="mt-4 font-display text-4xl">Document not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This link is invalid or no longer available.
          </p>
        </div>
      </main>
    );
  }
  const subtotal = document.lines.reduce((sum, line) => sum + line.qty * line.rate, 0);
  const tax = (subtotal * document.tax) / 100;
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 pb-20 pt-36 sm:px-8">
      <header className="border-b border-hairline pb-8">
        <p className="eyebrow">Shutter Ram Photography</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="font-display text-4xl sm:text-6xl">{document.kind}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{document.number}</p>
          </div>
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">
            {document.status}
          </p>
        </div>
      </header>
      <section className="grid gap-8 border-b border-hairline py-8 sm:grid-cols-2">
        <div>
          <p className="eyebrow">Billed to</p>
          <p className="mt-2">{document.clientName}</p>
        </div>
        <dl className="space-y-2 text-sm sm:text-right">
          {document.issuedOn ? (
            <div>
              <dt className="inline text-muted-foreground">Issued </dt>
              <dd className="inline">{document.issuedOn}</dd>
            </div>
          ) : null}
          {document.dueOn ? (
            <div>
              <dt className="inline text-muted-foreground">Due </dt>
              <dd className="inline">{document.dueOn}</dd>
            </div>
          ) : null}
          {document.paidOn ? (
            <div>
              <dt className="inline text-muted-foreground">Paid </dt>
              <dd className="inline">{document.paidOn}</dd>
            </div>
          ) : null}
          {document.method ? (
            <div>
              <dt className="inline text-muted-foreground">Method </dt>
              <dd className="inline">{document.method}</dd>
            </div>
          ) : null}
        </dl>
      </section>
      <div className="overflow-x-auto py-8">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="border-b border-hairline text-left text-[0.625rem] tracking-[0.2em] uppercase text-muted-foreground">
            <tr>
              <th className="py-3">Description</th>
              <th className="py-3 text-right">Qty</th>
              <th className="py-3 text-right">Rate</th>
              <th className="py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {document.lines.map((line, index) => (
              <tr key={`${line.description}-${index}`} className="border-b border-hairline">
                <td className="py-4">{line.description}</td>
                <td className="py-4 text-right">{line.qty}</td>
                <td className="py-4 text-right">{money(line.rate, document.currency)}</td>
                <td className="py-4 text-right">
                  {money(line.qty * line.rate, document.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="ml-auto w-full max-w-sm space-y-3 border-t border-foreground pt-4 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{money(subtotal, document.currency)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax ({document.tax}%)</span>
          <span>{money(tax, document.currency)}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>{document.kind === "Receipt" ? "Amount paid" : "Total"}</span>
          <span>{money(subtotal + tax, document.currency)}</span>
        </div>
      </section>
      {document.notes || document.footer || document.headerInfo ? (
        <footer className="mt-12 whitespace-pre-wrap border-t border-hairline pt-6 text-sm text-muted-foreground">
          {[document.headerInfo, document.notes, document.footer].filter(Boolean).join("\n\n")}
        </footer>
      ) : null}
    </main>
  );
}
