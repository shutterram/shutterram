import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { testimonials } from "@/data/portfolio";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

/**
 * Continuously drifting testimonial marquee. Transform-based so it never
 * fights the browser's scroll anchoring — arrows nudge the drift along.
 */
export function Testimonials({ className }: { className?: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const posRef = useRef(0);
  const boostRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - last, 64);
      last = now;

      const half = track.scrollWidth / 2;
      if (half > 0) {
        const drift = pausedRef.current || reduce ? 0 : dt * 0.022;
        const ease = boostRef.current * 0.12;
        boostRef.current -= ease;
        if (Math.abs(boostRef.current) < 0.2) boostRef.current = 0;

        let next = posRef.current + drift + ease;
        next = ((next % half) + half) % half;
        posRef.current = next;
        track.style.transform = `translate3d(${-next}px, 0, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const step = useCallback((dir: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild?.firstElementChild as HTMLElement | null;
    const width = card ? card.offsetWidth + 24 : 320;
    boostRef.current += dir * width;
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
      </div>

      <div
        className="mt-6 overflow-hidden"
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
        onFocusCapture={() => (pausedRef.current = true)}
        onBlurCapture={() => (pausedRef.current = false)}
      >
        <div ref={trackRef} className="flex w-max will-change-transform">
          {[0, 1].map((group) => (
            <div key={group} className="flex shrink-0" aria-hidden={group === 1}>
              {testimonials.map((t) => (
                <figure
                  key={`${group}-${t.id}`}
                  className="glow-hover mr-6 flex w-[80vw] shrink-0 flex-col border border-hairline bg-background/40 p-8 transition-colors duration-700 hover:border-foreground/30 sm:w-[24rem] md:p-10"
                >
                  <div className="flex gap-1" aria-label={`${t.rating} out of 5`}>
                    {Array.from({ length: t.rating }).map((_, s) => (
                      <Star key={s} className="size-3.5 fill-foreground text-foreground" strokeWidth={0} />
                    ))}
                  </div>
                  <blockquote className="mt-6 font-display text-lg leading-relaxed md:text-xl">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-auto border-t border-hairline pt-5 [margin-top:2rem]">
                    <p className="text-sm text-foreground">{t.name}</p>
                    <p className="eyebrow mt-1">{t.role}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
