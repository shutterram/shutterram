import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FilterPills } from "@/components/site/FilterPills";
import { Lightbox } from "@/components/site/Lightbox";
import { categories, photos, type CategorySlug, t } from "@/data/portfolio";
import { useIsMobile } from "@/hooks/use-mobile";
import { getSeo } from "@/lib/seo.functions";
import { buildSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/gallery/")({
  loader: () => getSeo({ data: { path: "/gallery" } }),
  head: ({ loaderData }) =>
    buildSeoHead(loaderData, {
      path: "/gallery",
      title: "Photography Portfolio & Gallery | Shutter Ram",
      description:
        "Browse the Shutter Ram portfolio: wedding days, corporate brand work, portraits, headshots and events, filterable by category.",
      image: photos[0]!.src,
    }),
  component: Gallery,
});

type Filter = "all" | CategorySlug;

function Gallery() {
  const [filter, setFilter] = useState<Filter>("all");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [mobileCount, setMobileCount] = useState(4);
  const isMobile = useIsMobile();

  const visible = useMemo(
    () => (filter === "all" ? photos : photos.filter((p) => p.category === filter)),
    [filter],
  );

  const shown = isMobile ? visible.slice(0, mobileCount) : visible;
  const allShown = mobileCount >= visible.length;

  return (
    <div className="mx-auto max-w-7xl px-6 pb-28 pt-56">
      <p className="eyebrow">{t("gallery.eyebrow")}</p>
      <h1 className="mt-4 font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-tight">
        {t("gallery.title")}
      </h1>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
        Everything worth keeping from the last few years, in one place. Filter by category, or open
        any frame full screen and step through with the arrow keys.
      </p>

      <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-hairline pt-10">
        <p className="eyebrow mr-2">{t("gallery.jump")}</p>
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

      <FilterPills
        className="mt-10"
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setLightbox(null);
          setMobileCount(4);
        }}
        options={[
          { value: "all" as Filter, label: `All (${photos.length})` },
          ...categories.map((c) => ({
            value: c.slug as Filter,
            label: `${c.label} (${photos.filter((p) => p.category === c.slug).length})`,
          })),
        ]}
      />

      <div className="mt-12 grid grid-cols-2 gap-3 md:block md:columns-2 md:gap-5 lg:columns-3 md:[&>*]:mb-5">
        {shown.map((p, i) => (
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
              className="aspect-[4/5] w-full object-cover transition-all duration-[1200ms] ease-out group-hover:scale-[1.03] md:aspect-auto"
            />
            <div className="absolute inset-0 bg-background/40 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="absolute inset-x-0 bottom-0 translate-y-3 p-5 text-left opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
              <p className="eyebrow">{p.category}</p>
              <p className="mt-1 font-display text-lg">{p.caption}</p>
            </div>
          </button>
        ))}
      </div>

      {isMobile && visible.length > 4 ? (
        <div className="mt-8 flex justify-center md:hidden">
          <button
            type="button"
            onClick={() => setMobileCount((c) => (allShown ? 4 : c + 4))}
            className="inline-flex items-center border border-hairline px-7 py-3 text-[0.6875rem] tracking-[0.24em] uppercase transition-colors hover:border-foreground"
          >
            {allShown ? t("btn.view_less") : t("btn.view_more")}
          </button>
        </div>
      ) : null}

      <Lightbox
        photos={visible}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
      />
    </div>
  );
}
