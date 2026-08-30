import { createFileRoute } from "@tanstack/react-router";
import { FinancialDocumentPage } from "@/components/site/FinancialDocumentPage";
import { openFinancialDocument } from "@/lib/financial-documents.functions";

export const Route = createFileRoute("/invoice/$token")({
  loader: ({ params }) => openFinancialDocument({ data: { kind: "invoice", token: params.token } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `Invoice ${loaderData.number} | Shutter Ram`
          : "Invoice unavailable | Shutter Ram",
      },
      {
        name: "description",
        content: "View your photography invoice from Shutter Ram Photography.",
      },
      {
        property: "og:title",
        content: loaderData
          ? `Invoice ${loaderData.number} | Shutter Ram`
          : "Invoice unavailable | Shutter Ram",
      },
      {
        property: "og:description",
        content: "View your photography invoice from Shutter Ram Photography.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <FinancialDocumentPage document={Route.useLoaderData()} />,
});
