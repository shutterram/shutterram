import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { HeroSlider } from "@/components/site/HeroSlider";
import { Lightbox } from "@/components/site/Lightbox";
import { FilterPills } from "@/components/site/FilterPills";
import {
  DESKTOP_COLUMN_CLASS,
  ViewSelector,
  useColumnView,
} from "@/components/site/ViewSelector";
import { SectionHeading } from "@/components/site/SectionHeading";
import { ServiceCard } from "@/components/site/ServiceCard";
import { SocialLinks } from "@/components/site/SocialLinks";
import { BeforeAfterSlider } from "@/components/site/BeforeAfterSlider";
import { Reveal } from "@/components/site/Reveal";
import { StatsStrip } from "@/components/site/StatsStrip";
import { ExperienceSection } from "@/components/site/ExperienceSection";
import { Testimonials } from "@/components/site/Testimonials";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  aboutShort,
  categories,
  editSamples,
  featuredIds,
  photoById,
  services,
  sectionFor,
  sectionsFor,
  site,
  type CategorySlug,
  t,
} from "@/data/portfolio";
import { cn } from "@/lib/utils";
import { getSeo } from "@/lib/seo.functions";
import { buildSeoHead, SITE_URL } from "@/lib/seo";

export const Route = createFileRoute("/")({
  loader: () => getSeo({ data: { path: "/" } }),
  head: ({ loaderData }) => {
    const head = buildSeoHead(loaderData, {
      path: "/",
      title: "Shutter Ram — Wedding, Portrait & Corporate Photography",
      description:
        "Shutter Ram is a one-person photography studio covering weddings, corporate brands, portraits and headshots. Clicking today, for a memory that lives forever.",
      image: categories[0]!.hero,
    });
    return {
      ...head,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "@id": `${SITE_URL}/#studio`,
            name: site.name,
            description: head.meta[1]!["content"],
            url: SITE_URL,
            image: categories[0]!.hero,
            email: site.email,
            telephone: site.phone,
            address: { "@type": "PostalAddress", addressLocality: site.location },
            priceRange: "$$",
            sameAs: [],
          }),
        },
      ],
    };
  },
  component: Home,
});

type Filter = "all" | CategorySlug;

function Home() {
  const featured = useMemo(() => featuredIds.map(photoById).filter((p) => p !== undefined), []);
  const [filter, setFilter] = useState<Filter>("all");
  const [cols, setCols] = useColumnView();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [edit, setEdit] = useState(0);
  const [mobileCount, setMobileCount] = useState(4);
  const railRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const servicesPausedRef = useRef(false);
  const servicesPosRef = useRef(0);
  const servicesBoostRef = useRef(0);
  const isMobile = useIsMobile();

  const visible = useMemo(
    () => (filter === "all" ? featured : featured.filter((p) => p.category === filter)),
    [featured, filter],
  );

  const shown = isMobile ? visible.slice(0, mobileCount) : visible;
  const allShown = mobileCount >= visible.length;

  useEffect(() => {
    const track = servicesRef.current;
    if (!track || !isMobile) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;
      const firstGroup = track.firstElementChild as HTMLElement | null;
      const loopWidth = firstGroup?.offsetWidth ?? 0;
      if (loopWidth > 0) {
        const drift = servicesPausedRef.current || reduce ? 0 : dt * 0.018;
        const ease = servicesBoostRef.current * 0.12;
        servicesBoostRef.current -= ease;
        if (Math.abs(servicesBoostRef.current) < 0.2) servicesBoostRef.current = 0;
        const next =
          (((servicesPosRef.current + drift + ease) % loopWidth) + loopWidth) % loopWidth;
        servicesPosRef.current = next;
        track.style.transform = `translate3d(${-next}px, 0, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isMobile]);

  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pauseServices = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    servicesPausedRef.current = true;
  }, []);

  const resumeServices = useCallback((delay = 0) => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    if (delay <= 0) {
      servicesPausedRef.current = false;
      return;
    }
    resumeTimer.current = setTimeout(() => (servicesPausedRef.current = false), delay);
  }, []);

  useEffect(
    () => () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    },
    [],
  );

  const stepServices = useCallback((dir: number) => {
    const track = servicesRef.current;
    if (!track) return;
    const card = track.firstElementChild?.firstElementChild as HTMLElement | null;
    servicesBoostRef.current += dir * (card ? card.offsetWidth + 12 : 180);
  }, []);

  // Drag / swipe the services rail horizontally.
  const dragX = useRef<number | null>(null);
  const onDragStart = useCallback(
    (e: React.PointerEvent) => {
      dragX.current = e.clientX;
      pauseServices();
    },
    [pauseServices],
  );
  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (dragX.current === null) return;
    const dx = e.clientX - dragX.current;
    dragX.current = e.clientX;
    servicesPosRef.current -= dx;
  }, []);
  const onDragEnd = useCallback(() => {
    if (dragX.current === null) return;
    dragX.current = null;
    resumeServices(2500);
  }, [resumeServices]);


  // Section copy, order and visibility all come from the content studio.
  const ordered = sectionsFor("home");
  const copy = (key: string, fallback: { eyebrow: string; heading: string; intro?: string }) => {
    const s = ordered.find((x) => x.key === key);
    return {
      eyebrow: s?.eyebrow || fallback.eyebrow,
      title: s?.heading || fallback.heading,
      intro: s?.intro || fallback.intro || "",
    };
  };

  const sample = editSamples[Math.min(edit, editSamples.length - 1)];

  const blocks: Record<string, ReactElement> = {
    about: (
      <section key="about" className="mx-auto max-w-5xl px-6 py-24 md:py-32">
        <Reveal className="flex flex-col items-center text-center">
          <SectionHeading
            {...copy("about", { eyebrow: "About Me", heading: "A quiet eye, fifteen years in." })}
            align="center"
          />
          <p className="mt-6 max-w-2xl text-sm leading-loose text-muted-foreground md:text-base">
            {aboutShort}
          </p>
          <Link
            to="/about"
            className="group mt-9 inline-flex items-center gap-2 border-b border-hairline pb-2 text-[0.6875rem] tracking-[0.28em] uppercase transition-colors hover:border-foreground"
          >
            Read the full story
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </Reveal>

        <StatsStrip className="mt-16" />
      </section>
    ),

    featured: (
      <section key="featured" className="border-t border-hairline bg-surface/30 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal as="div">
            <SectionHeading
              {...copy("featured", {
                eyebrow: "Featured Work",
                heading: "A handful of favourites.",
                intro:
                  "A rotating selection from recent commissions. Click any frame to open it full screen.",
              })}
              align="center"
            />

            <div className="mt-8 flex justify-center">
              <ViewSelector value={cols} onChange={setCols} />
            </div>

            <FilterPills
              variant="tabs"
              className="mt-10 justify-center"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all" as Filter, label: t("gallery.filter_all") },
                ...categories.map((c) => ({ value: c.slug as Filter, label: c.label })),
              ]}
            />
          </Reveal>

          <div
            ref={railRef}
            className={cn(
              "mt-12 grid gap-3 md:block md:gap-5 md:[&>*]:mb-5",
              MOBILE_GRID_CLASS[cols],
              DESKTOP_COLUMN_CLASS[cols],
            )}
          >
            {shown.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setLightbox(i)}
                aria-label={`Enlarge photograph: ${p.caption}`}
                className="group relative block w-full break-inside-avoid overflow-hidden"

              >
                <img
                  src={p.src}
                  alt={p.caption}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover transition-all duration-[1200ms] ease-out group-hover:scale-[1.05] md:aspect-auto"
                />
                <div className="absolute inset-0 bg-background/55 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 scale-75 items-center justify-center bg-foreground text-background opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100">
                  <Plus className="size-5" />
                </span>
                <div className="absolute inset-x-0 bottom-0 translate-y-3 p-5 text-left opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                  <p className="eyebrow">{p.category}</p>
                  <p className="mt-1 font-display text-base">{p.caption}</p>
                </div>
              </button>
            ))}
            {visible.length === 0 ? (
              <p className="col-span-2 py-16 text-sm text-muted-foreground">
                Nothing in this category yet.
              </p>
            ) : null}
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

          <div className="mt-12 flex justify-center">
            <Link
              to="/gallery"
              className="inline-flex items-center border border-foreground/60 px-9 py-3.5 text-[0.6875rem] tracking-[0.24em] uppercase transition-colors hover:bg-foreground hover:text-background"
            >
              See the full gallery
            </Link>
          </div>
        </div>
      </section>
    ),

    editing: editSamples.length ? (
      <section key="editing" className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <Reveal>
          <SectionHeading
            {...copy("editing", {
              eyebrow: "The Power of Editing",
              heading: "Same frame. Two different photographs.",
              intro:
                "Drag the handle across the image to reveal the unedited capture on one side and the finished, hand-graded frame on the other.",
            })}
            align="center"
          />

          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {editSamples.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setEdit(i)}
                className={cn(
                  "relative size-20 overflow-hidden border transition-all duration-300 md:size-24",
                  i === edit
                    ? "border-foreground opacity-100"
                    : "border-hairline opacity-50 hover:opacity-90",
                )}
                aria-label={s.title}
                aria-pressed={i === edit}
              >
                <img src={s.src} alt={s.title} loading="lazy" className="size-full object-cover" />
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-10">
          <BeforeAfterSlider
            key={sample?.id}
            before={sample?.srcBefore ?? ""}
            after={sample?.src ?? ""}
            alt={sample?.title ?? ""}
          />
          <div className="mt-5 flex flex-col items-center gap-1 text-center">
            <p className="font-display text-2xl">{sample?.title}</p>
            <p className="text-sm text-muted-foreground">{sample?.note}</p>
          </div>
        </div>
      </section>
    ) : (
      <></>
    ),

    services: (
      <section key="services" className="border-t border-hairline bg-surface/30 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <SectionHeading
              {...copy("services", {
                eyebrow: "Services",
                heading: "What I can photograph for you.",
                intro: "Every engagement is quoted individually — these are the starting points.",
              })}
            />
          </Reveal>
          {/* mobile: two-card snap slider */}
          <div className="relative mt-10 md:hidden">
            <p className="eyebrow text-center">
              Swipe or use the arrows to see more services
            </p>
            <div className="relative mt-5">
              <button
                type="button"
                aria-label="Previous services"
                onClick={() => stepServices(-1)}
                className="absolute left-0 top-1/2 z-10 -translate-y-1/2 text-foreground/70 transition-colors hover:text-foreground"
              >
                <ChevronLeft className="size-7" strokeWidth={1} />
              </button>
              <div
                className="min-w-0 touch-pan-y overflow-hidden px-4"
                onMouseEnter={pauseServices}
                onMouseLeave={() => {
                  onDragEnd();
                  resumeServices();
                }}
                onTouchStart={pauseServices}
                onTouchEnd={() => resumeServices(2500)}
                onTouchCancel={() => resumeServices(2500)}
                onFocusCapture={pauseServices}
                onBlurCapture={() => resumeServices()}
                onPointerDown={onDragStart}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragEnd}
              >

                <div ref={servicesRef} className="flex w-max will-change-transform">
                  {[0, 1, 2].map((group) => (
                    <div key={group} className="flex shrink-0 gap-3 pr-3" aria-hidden={group > 0}>
                      {services.map((s, i) => (
                        <div
                          key={`${group}-${s.slug}`}
                          className="w-[calc((100vw-4.5rem)/2)] shrink-0"
                        >
                          <ServiceCard service={s} index={i} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <button
                type="button"
                aria-label="Next services"
                onClick={() => stepServices(1)}
                className="absolute right-0 top-1/2 z-10 -translate-y-1/2 text-foreground/70 transition-colors hover:text-foreground"
              >
                <ChevronRight className="size-7" strokeWidth={1} />
              </button>
            </div>
          </div>

          <div className="mt-14 hidden gap-8 md:grid md:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <Reveal key={s.slug} delay={(i % 3) * 110}>
                <ServiceCard service={s} index={i} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    ),

    experience: <ExperienceSection key="experience" section={sectionFor("home", "experience")} />,

    testimonials: <Testimonials key="testimonials" />,

    connect: (
      <section key="connect" className="mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="flex flex-col items-center text-center">
          <Reveal className="flex flex-col items-center">
            <SectionHeading
              {...copy("connect", {
                eyebrow: "Connect With Me",
                heading: "Follow the work in progress.",
                intro: "New frames, behind-the-scenes and the occasional 4am street photograph.",
              })}
              align="center"
            />
            <SocialLinks className="mt-10 justify-center" size="lg" />
            <p className="mt-10 text-sm text-muted-foreground">
              Prefer email?{" "}
              <a
                href={`mailto:${site.email}`}
                className="text-foreground underline underline-offset-4"
              >
                {site.email}
              </a>
            </p>
            <Link
              to="/contact"
              search={{ form: "message" }}
              className="mt-10 inline-flex items-center border border-foreground px-9 py-3.5 text-[0.6875rem] tracking-[0.28em] uppercase transition-colors hover:bg-foreground hover:text-background"
            >
              Start a conversation
            </Link>
          </Reveal>
        </div>
      </section>
    ),
  };

  return (
    <>
      <HeroSlider />

      {ordered.map((s) =>
        blocks[s.key] ? (
          // The id lets the studio target this section's fonts individually.
          <div key={s.key} id={`sec-${s.key}`}>
            {blocks[s.key]}
          </div>
        ) : null,
      )}

      <Lightbox
        photos={visible}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
      />
    </>
  );
}
