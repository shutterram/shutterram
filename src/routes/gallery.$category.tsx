import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Lightbox } from "@/components/site/Lightbox";
import { categories, categoryBySlug, photosByCategory, t } from "@/data/portfolio";
import { getSeo } from "@/lib/seo.functions";
import { buildSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/gallery/$category")({
  loader: async ({ params }) => {
    const category = categoryBySlug(params.category);
    if (!category) throw notFound();
    const seo = await getSeo({ data: { path: `/gallery/${category.slug}` } });
    return { category, seo };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Category not found | Shutter Ram" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { category, seo } = loaderData;
    const head = buildSeoHead(seo, {
      path: `/gallery/${category.slug}`,
      title: `${category.title} | Shutter Ram`,
      description: category.tagline,
      image: category.hero,
    });
    return {
      ...head,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: category.title,
            description: category.tagline,
            url: head.links[0]!.href,
          }),
        },
      ],
    };
  },
  component: CategoryGallery,
});

const COLUMN_CLASS: Record<string, string> = {
  "1": "columns-1",
  "2": "columns-2",
  "3": "columns-1 sm:columns-2 lg:columns-3",
};

function CategoryGallery() {
  const { category } = Route.useLoaderData();
  const items = photosByCategory(category.slug);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [cols, setCols] = useState<"1" | "2" | "3">("1");

  return (
    <div>
      <div id="category-hero" className="relative h-[60vh] w-full overflow-hidden">
        <img
          src={category.cover || category.hero}
          alt={category.title}
          className="size-full object-cover"
        />
        <div className="hero-scrim absolute inset-0" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <p className="eyebrow">{t("gallery.eyebrow")}</p>
          <h1 className="mt-4 font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-tight">
            {category.title}
          </h1>
          <p className="mt-4 max-w-xl text-sm text-muted-foreground md:text-base">
            {category.tagline}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-28 pt-16">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
          <Link
            to="/gallery"
            className="eyebrow inline-flex min-w-0 items-center gap-2 transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 shrink-0" /> All work
          </Link>

          <div className="flex shrink-0 items-center gap-3">
            <span className="eyebrow hidden sm:inline">View</span>
            <FilterPills
              options={[
                { value: "1" as const, label: "1 line" },
                { value: "2" as const, label: "2 lines" },
                { value: "3" as const, label: "3 lines" },
              ]}
              value={cols}
              onChange={setCols}
            />
          </div>
        </div>

        <div className={`mt-10 gap-5 [&>*]:mb-5 ${COLUMN_CLASS[cols]}`}>
          {items.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setLightbox(i)}
              className="group relative block w-full overflow-hidden break-inside-avoid"
            >
              <img
                src={p.src}
                alt={p.caption}
                loading="lazy"
                className="w-full object-cover transition-all duration-[1200ms] ease-out group-hover:scale-[1.03]"
              />
              <div className="absolute inset-x-0 bottom-0 translate-y-3 bg-gradient-to-t from-background/85 to-transparent p-5 text-left opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                <p className="font-display text-lg">{p.caption}</p>
              </div>
            </button>
          ))}
        </div>


        <div className="mt-16 flex flex-col items-center gap-6 border-t border-hairline pt-14 text-center">
          <h2 className="font-display text-3xl">Planning something like this?</h2>
          <Link
            to="/contact"
            search={{ service: category.slug }}
            hash="quote"
            className="inline-flex items-center border border-foreground bg-foreground px-9 py-3.5 text-[0.6875rem] tracking-[0.28em] uppercase text-background transition-opacity hover:opacity-85"
          >
            {t("btn.request_quote")}
          </Link>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {categories
              .filter((c) => c.slug !== category.slug)
              .map((c) => (
                <Link
                  key={c.slug}
                  to="/gallery/$category"
                  params={{ category: c.slug }}
                  className="border border-hairline px-5 py-2 text-[0.6875rem] tracking-[0.24em] uppercase text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  {c.label}
                </Link>
              ))}
          </div>
        </div>
      </div>

      <Lightbox
        photos={items}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
      />
    </div>
  );
}
