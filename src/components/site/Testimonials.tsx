import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { testimonials } from "@/data/portfolio";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

/**
 * Horizontal testimonial rail that drifts slowly on its own and can be
 * stepped through with the arrows. Pauses on hover / interaction.
 */
export function Testimonials({ className }: { className?: string }) {
  const railRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  // Slow, continuous drift.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!pausedRef.current) {
        const max = el.scrollWidth - el.clientWidth;
        if (max > 0) {
          const next = el.scrollLeft + dt * 0.022;
          el.scrollLeft = next >= max - 0.5 ? 0 : next;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const step = useCallback((dir: number) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.6), behavior: "smooth" });
  }, []);

  return (
    <section className={cn("border-t border-hairline bg-surface/30 py-24 md:py-32", className)}>
      <div className="mx-auto max-w-7xl px-6">
        <Reveal className="flex flex-col items-center">
          <SectionHeading
            eyebrow="Testimonials"
            title="What people say afterwards."
            intro="A few words from the couples, founders and teams I've photographed."
            align="center"
          />
        </Reveal>

        <div className="mt-14 flex items-center justify-end gap-6">
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

        <div
          ref={railRef}
          onMouseEnter={() => (pausedRef.current = true)}
          onMouseLeave={() => (pausedRef.current = false)}
          onFocusCapture={() => (pausedRef.current = true)}
          onBlurCapture={() => (pausedRef.current = false)}
          className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2"
        >
          {[...testimonials, ...testimonials].map((t, i) => (
            <figure
              key={`${t.id}-${i}`}
              className="glow-hover flex w-[85vw] shrink-0 snap-start flex-col border border-hairline bg-background/40 p-8 transition-colors duration-700 hover:border-foreground/30 sm:w-[26rem] md:p-10"
            >
              <div className="flex gap-1" aria-label={`${t.rating} out of 5`}>
                {Array.from({ length: t.rating }).map((_, s) => (
                  <Star key={s} className="size-3.5 fill-foreground text-foreground" strokeWidth={0} />
                ))}
              </div>
              <blockquote className="mt-6 font-display text-lg leading-relaxed md:text-xl">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-8 border-t border-hairline pt-5">
                <p className="text-sm text-foreground">{t.name}</p>
                <p className="eyebrow mt-1">{t.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
