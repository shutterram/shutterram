import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FilterPills } from "@/components/site/FilterPills";
import { Lightbox } from "@/components/site/Lightbox";
import { categories, photos, type CategorySlug } from "@/data/portfolio";

export const Route = createFileRoute("/gallery/")({
  head: () => ({
    meta: [
      { title: "Gallery — Previous Works | Shutter Ram" },
      {
        name: "description",
        content:
          "Browse the full Shutter Ram gallery: wedding, corporate, portrait, headshot, event and product photography, filterable by category.",
      },
      { property: "og:title", content: "Gallery — Previous Works | Shutter Ram" },
      {
        property: "og:description",
        content: "The complete Shutter Ram archive, filterable by category.",
      },
      { property: "og:image", content: photos[0]!.src },
      { name: "twitter:image", content: photos[0]!.src },
    ],
  }),
  component: Gallery,
});

type Filter = "all" | CategorySlug;

function Gallery() {
  const [filter, setFilter] = useState<Filter>("all");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const visible = useMemo(
    () => (filter === "all" ? photos : photos.filter((p) => p.category === filter)),
    [filter],
  );

  return (
    <div className="mx-auto max-w-7xl px-6 pb-28 pt-40">
      <p className="eyebrow">Previous Works</p>
      <h1 className="mt-4 font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-tight">The Gallery</h1>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
        Everything worth keeping from the last few years, in one place. Filter by
        category, or open any frame full screen and step through with the arrow keys.
      </p>

      <FilterPills
        className="mt-10"
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setLightbox(null);
        }}
        options={[
          { value: "all" as Filter, label: `All (${photos.length})` },
          ...categories.map((c) => ({
            value: c.slug as Filter,
            label: `${c.label} (${photos.filter((p) => p.category === c.slug).length})`,
          })),
        ]}
      />

      <div className="mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5">
        {visible.map((p, i) => (
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
              className="w-full object-cover grayscale-[45%] transition-all duration-[1200ms] ease-out group-hover:scale-[1.03] group-hover:grayscale-0"
            />
            <div className="absolute inset-0 bg-background/40 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="absolute inset-x-0 bottom-0 translate-y-3 p-5 text-left opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
              <p className="eyebrow">{p.category}</p>
              <p className="mt-1 font-display text-lg">{p.caption}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-16 flex flex-wrap items-center gap-3 border-t border-hairline pt-10">
        <p className="eyebrow mr-2">Jump to a category</p>
        {categories.map((c) => (
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

      <Lightbox photos={visible} index={lightbox} onClose={() => setLightbox(null)} onIndexChange={setLightbox} />
    </div>
  );
}
