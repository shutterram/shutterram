import { ChevronLeft, ChevronRight, Images, Star, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t, testimonials, type Photo, type SectionConfig, type Testimonial } from "@/data/portfolio";
import { cn } from "@/lib/utils";
import { Lightbox } from "./Lightbox";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

/** Pop-up with the full review and any photographs the client attached. */
function ReviewDialog({ review, onClose }: { review: Testimonial; onClose: () => void }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // While the photo lightbox is open it owns Escape.
      if (e.key === "Escape" && lightboxIndex === null) onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, lightboxIndex]);

  if (typeof document === "undefined") return null;
  const images = review.images ?? [];

  return createPortal(
    <>
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/92 px-4 py-10 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >

      <div
        className="relative max-h-full w-full max-w-2xl overflow-y-auto border border-hairline bg-surface/80 p-8 md:p-12"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label={t("btn.close")}
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-5" strokeWidth={1.2} />
        </button>

        <div className="flex gap-1" aria-label={`${review.rating} out of 5`}>
          {Array.from({ length: review.rating }).map((_, s) => (
            <Star key={s} className="size-3.5 fill-foreground text-foreground" strokeWidth={0} />
          ))}
        </div>

        <blockquote className="mt-6 font-display text-xl leading-relaxed md:text-2xl">
          “{review.quote}”
        </blockquote>

        <div className="mt-8 border-t border-hairline pt-5">
          <p className="text-sm">{review.name}</p>
          <p className="eyebrow mt-1">{review.occasion || review.role}</p>
        </div>

        {images.length ? (
          <div className="mt-10">
            <p className="eyebrow">{t("testimonial.modal_photos")}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="block"
                >
                  <img
                    src={src}
                    alt={`${review.name} — photo ${i + 1}`}
                    loading="lazy"
                    className="aspect-square w-full border border-hairline object-cover transition-opacity duration-500 hover:opacity-80"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>

      <Lightbox
        photos={images.map((src, i) => ({
          id: `${review.id}-${i}`,
          src,
          caption: review.name,
          category: (review.occasion || review.role || "Review") as Photo["category"],
        }))}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </>,
    document.body,
  );

}

/**
 * Continuously drifting testimonial marquee. Transform-based so it never
 * fights the browser's scroll anchoring — arrows nudge the drift along.
 */
export function Testimonials({
  className,
  section,
}: {
  className?: string;
  section?: SectionConfig | null;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const posRef = useRef(0);
  const boostRef = useRef(0);
  const [openReview, setOpenReview] = useState<Testimonial | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;

      const firstGroup = track.firstElementChild as HTMLElement | null;
      const loopWidth = firstGroup?.offsetWidth ?? 0;
      if (loopWidth > 0) {
        const drift = pausedRef.current || reduce ? 0 : dt * 0.022;
        const ease = boostRef.current * 0.12;
        boostRef.current -= ease;
        if (Math.abs(boostRef.current) < 0.2) boostRef.current = 0;

        let next = posRef.current + drift + ease;
        next = ((next % loopWidth) + loopWidth) % loopWidth;
        posRef.current = next;
        track.style.transform = `translate3d(${-next}px, 0, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    pausedRef.current = openReview !== null;
  }, [openReview]);

  const step = useCallback((dir: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild?.firstElementChild as HTMLElement | null;
    const width = card ? card.offsetWidth + 24 : 320;
    boostRef.current += dir * width;
  }, []);

  // Drag / swipe the reviews rail horizontally.
  const dragX = useRef<number | null>(null);
  const dragMoved = useRef(0);
  const onDragStart = (e: React.PointerEvent) => {
    dragX.current = e.clientX;
    dragMoved.current = 0;
    pausedRef.current = true;
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (dragX.current === null) return;
    const dx = e.clientX - dragX.current;
    dragX.current = e.clientX;
    dragMoved.current += Math.abs(dx);
    posRef.current -= dx;
  };
  const onDragEnd = () => {
    dragX.current = null;
  };


  return (
    <section className={cn("border-t border-hairline bg-surface/30 py-24 md:py-32", className)}>
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="flex flex-col items-center">
          <SectionHeading
            eyebrow={section?.eyebrow || "Testimonials"}
            title={section?.heading || "What people say afterwards."}
            intro={
              section?.intro ||
              "A few words from the couples, founders and teams I've photographed."
            }
            align="center"
          />
          {section?.headingAccent ? (
            <p className="mt-3 text-center font-display text-[clamp(1.25rem,2.5vw,1.75rem)] italic leading-snug text-muted-foreground">
              {section.headingAccent}
            </p>
          ) : null}
        </Reveal>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4">
          <p className="eyebrow">{t("testimonial.swipe_hint")}</p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              aria-label="Previous testimonials"
              onClick={() => step(-1)}
              className="text-foreground/50 transition-all duration-500 hover:-translate-x-1 hover:text-foreground"
            >
              <ChevronLeft className="size-7" strokeWidth={1} />
            </button>
            <button
              type="button"
              aria-label="Next testimonials"
              onClick={() => step(1)}
              className="text-foreground/50 transition-all duration-500 hover:translate-x-1 hover:text-foreground"
            >
              <ChevronRight className="size-7" strokeWidth={1} />
            </button>
          </div>
        </div>
      </div>

      <div
        className="mt-6 touch-pan-y overflow-hidden pl-6"
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => {
          onDragEnd();
          pausedRef.current = openReview !== null;
        }}
        onFocusCapture={() => (pausedRef.current = true)}
        onBlurCapture={() => (pausedRef.current = openReview !== null)}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <div ref={trackRef} className="flex w-max will-change-transform">
          {[0, 1, 2, 3].map((group) => (
            <div key={group} className="flex shrink-0" aria-hidden={group === 1}>
              {testimonials.map((review) => (
                <figure
                  key={`${group}-${review.id}`}
                  onClick={() => {
                    // Ignore the click that ends a drag.
                    if (dragMoved.current < 6) setOpenReview(review);
                  }}

                  className="glow-hover mr-6 flex w-[80vw] shrink-0 cursor-pointer flex-col border border-hairline bg-background/40 p-8 transition-colors duration-700 hover:border-foreground/30 sm:w-[24rem] md:p-10"
                >
                  <div className="flex gap-1" aria-label={`${review.rating} out of 5`}>
                    {Array.from({ length: review.rating }).map((_, s) => (
                      <Star
                        key={s}
                        className="size-3.5 fill-foreground text-foreground"
                        strokeWidth={0}
                      />
                    ))}
                  </div>
                  <blockquote className="mt-6 line-clamp-6 font-display text-lg leading-relaxed md:text-xl">
                    “{review.quote}”
                  </blockquote>
                  <figcaption className="mt-auto border-t border-hairline pt-5 [margin-top:2rem]">
                    <p className="text-sm text-foreground">{review.name}</p>
                    <p className="eyebrow mt-1">{review.role}</p>
                    <div className="mt-4 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenReview(review);
                        }}
                        className="eyebrow text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {t("testimonial.read_more")}
                      </button>
                      {review.images?.length ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenReview(review);
                          }}
                          className="eyebrow inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Images className="size-3.5" strokeWidth={1.4} />
                          {t("testimonial.photos_button")}
                        </button>
                      ) : null}
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>

      {openReview ? <ReviewDialog review={openReview} onClose={() => setOpenReview(null)} /> : null}
    </section>
  );
}
