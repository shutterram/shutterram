import { createFileRoute } from "@tanstack/react-router";
import { FinancialDocumentPage } from "@/components/site/FinancialDocumentPage";
import { openFinancialDocument } from "@/lib/financial-documents.functions";

export const Route = createFileRoute("/bill/$token")({
  loader: ({ params }) => openFinancialDocument({ data: { kind: "bill", token: params.token } }),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `Receipt ${loaderData.number} | Shutter Ram`
          : "Receipt unavailable | Shutter Ram",
      },
      {
        name: "description",
        content: "View your photography receipt from Shutter Ram Photography.",
      },
      {
        property: "og:title",
        content: loaderData
          ? `Receipt ${loaderData.number} | Shutter Ram`
          : "Receipt unavailable | Shutter Ram",
      },
      {
        property: "og:description",
        content: "View your photography receipt from Shutter Ram Photography.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => <FinancialDocumentPage document={Route.useLoaderData()} />,
});
