import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { HeroSlider } from "@/components/site/HeroSlider";
import { Lightbox } from "@/components/site/Lightbox";
import { FilterPills } from "@/components/site/FilterPills";
import { SectionHeading } from "@/components/site/SectionHeading";
import { ServiceCard } from "@/components/site/ServiceCard";
import { SocialLinks } from "@/components/site/SocialLinks";
import { BeforeAfterSlider } from "@/components/site/BeforeAfterSlider";
import {
  aboutShort,
  categories,
  editSamples,
  featuredIds,
  photoById,
  services,
  site,
  type CategorySlug,
} from "@/data/portfolio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shutter Ram — Wedding, Portrait & Corporate Photography" },
      {
        name: "description",
        content:
          "Shutter Ram is a one-person photography studio covering weddings, corporate brands, portraits and headshots. Capturing your tomorrow's memories today.",
      },
      { property: "og:title", content: "Shutter Ram — Photography Studio" },
      {
        property: "og:description",
        content:
          "Wedding, corporate, portrait, headshot, event and product photography. Capturing your tomorrow's memories today.",
      },
      { property: "og:image", content: categories[0]!.hero },
      { name: "twitter:image", content: categories[0]!.hero },
    ],
  }),
  component: Home,
});

type Filter = "all" | CategorySlug;

function Home() {
  const featured = useMemo(
    () => featuredIds.map(photoById).filter((p) => p !== undefined),
    [],
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [edit, setEdit] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () => (filter === "all" ? featured : featured.filter((p) => p.category === filter)),
    [featured, filter],
  );

  return (
    <>
      <HeroSlider />

      {/* ---------------------------------------------------------------- About */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="grid items-center gap-14 md:grid-cols-[0.85fr_1.15fr]">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=1000&q=80"
              alt="Ram, photographer at Shutter Ram"
              loading="lazy"
              className="aspect-[4/5] w-full rounded-2xl object-cover"
            />
            <div className="absolute -bottom-5 -right-5 hidden rounded-2xl border border-hairline bg-background px-6 py-4 md:block">
              <p className="font-display text-3xl leading-none">15</p>
              <p className="eyebrow mt-1">Years behind the lens</p>
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="About Me" title="A quiet eye, fifteen years in." />
            <p className="mt-6 text-sm leading-loose text-muted-foreground md:text-base">
              {aboutShort}
            </p>
            <Link
              to="/about"
              className="group mt-9 inline-flex items-center gap-2 border-b border-hairline pb-2 text-[0.6875rem] tracking-[0.28em] uppercase transition-colors hover:border-foreground"
            >
              Read the full story
              <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Featured work */}
      <section className="border-t border-hairline bg-surface/30 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            eyebrow="Featured Work"
            title="A handful of favourites."
            intro="A rotating selection from recent commissions. Click any frame to open it full screen."
            align="center"
          />

          <FilterPills
            variant="tabs"
            className="mt-10 justify-center"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all" as Filter, label: "All" },
              ...categories.map((c) => ({ value: c.slug as Filter, label: c.label })),
            ]}
          />

          <div ref={railRef} className="mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4 [&>*]:mb-5">
            {visible.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setLightbox(i)}
                className="group relative block w-full break-inside-avoid overflow-hidden rounded-2xl"
              >
                <img
                  src={p.src}
                  alt={p.caption}
                  loading="lazy"
                  className="w-full object-cover transition-all duration-[1200ms] ease-out group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-background/55 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center rounded-full bg-foreground text-background opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100">
                  <Plus className="size-5" />
                </span>
                <div className="absolute inset-x-0 bottom-0 translate-y-3 p-5 text-left opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="eyebrow">{p.category}</p>
                  <p className="mt-1 font-display text-base">{p.caption}</p>
                </div>
              </button>
            ))}
            {visible.length === 0 ? (
              <p className="py-16 text-sm text-muted-foreground">Nothing in this category yet.</p>
            ) : null}
          </div>

          <div className="mt-12 flex justify-center">
            <Link
              to="/gallery"
              className="inline-flex items-center rounded-full border border-foreground/60 px-9 py-3.5 text-[0.6875rem] tracking-[0.24em] uppercase transition-colors hover:bg-foreground hover:text-background"
            >
              See the full gallery
            </Link>
          </div>
        </div>
      </section>


      <Lightbox photos={visible} index={lightbox} onClose={() => setLightbox(null)} onIndexChange={setLightbox} />

      {/* ------------------------------------------------------ Power of editing */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <SectionHeading
          eyebrow="The Power of Editing"
          title="Same frame. Two different photographs."
          intro="Drag the handle across the image to reveal the unedited capture on one side and the finished, hand-graded frame on the other."
          align="center"
        />

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          {editSamples.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setEdit(i)}
              className={cn(
                "relative size-20 overflow-hidden rounded-xl border transition-all duration-300 md:size-24",
                i === edit ? "border-foreground opacity-100" : "border-hairline opacity-50 hover:opacity-90",
              )}
              aria-label={s.title}
              aria-pressed={i === edit}
            >
              <img src={s.src} alt={s.title} loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>

        <div className="mt-10">
          <BeforeAfterSlider key={editSamples[edit]!.id} src={editSamples[edit]!.src} alt={editSamples[edit]!.title} />
          <div className="mt-5 flex flex-col items-center gap-1 text-center">
            <p className="font-display text-2xl">{editSamples[edit]!.title}</p>
            <p className="text-sm text-muted-foreground">{editSamples[edit]!.note}</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Services */}
      <section className="border-t border-hairline bg-surface/30 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            eyebrow="Services"
            title="What I can photograph for you."
            intro="Every engagement is quoted individually — these are the starting points."
          />
          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <ServiceCard key={s.slug} service={s} />
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- Connect */}
      <section className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="flex flex-col items-center text-center">
          <SectionHeading
            eyebrow="Connect With Me"
            title="Follow the work in progress."
            intro="New frames, behind-the-scenes and the occasional 4am street photograph."
            align="center"
          />
          <SocialLinks className="mt-10 justify-center" size="lg" />
          <p className="mt-10 text-sm text-muted-foreground">
            Prefer email?{" "}
            <a href={`mailto:${site.email}`} className="text-foreground underline underline-offset-4">
              {site.email}
            </a>
          </p>
          <Link
            to="/contact"
            className="mt-10 inline-flex items-center rounded-full border border-foreground px-9 py-3.5 text-[0.6875rem] tracking-[0.28em] uppercase transition-colors hover:bg-foreground hover:text-background"
          >
            Start a conversation
          </Link>
        </div>
      </section>
    </>
  );
}
