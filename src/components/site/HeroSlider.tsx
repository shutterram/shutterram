import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import logo from "@/assets/SRLogo.svg.asset.json";
import { categories, site } from "@/data/portfolio";
import { cn } from "@/lib/utils";

export function HeroSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((dir: number) => {
    setActive((i) => (i + dir + categories.length) % categories.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => go(1), 6500);
    return () => clearInterval(t);
  }, [paused, go]);

  const logoVersion = active % 2 === 0;

  return (
    <section
      className="relative h-[100svh] w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Photography categories"
    >
      {categories.map((c, i) => (
        <div
          key={c.slug}
          className={cn(
            "absolute inset-0 transition-opacity duration-[1400ms] ease-out",
            i === active ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={i !== active}
        >
          <img
            src={c.hero}
            alt={c.title}
            fetchPriority={i === 0 ? "high" : "low"}
            className={cn("size-full object-cover", i === active && "slow-zoom")}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/45 to-background/70" />
        </div>
      ))}

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="fade-up mb-8 flex flex-col items-center">
          {logoVersion ? (
            /* Version A — the mark stands in for "Ram" */
            <span
              key="brand-logo"
              className="fade-up flex items-center gap-[0.18em] font-display text-[clamp(2.5rem,8.5vw,6.5rem)] leading-[0.9] tracking-[0.02em]"
            >
              Shutter
              <img
                src={logo.url}
                alt="Ram"
                className="h-[1.05em] w-auto shrink-0 translate-y-[0.06em] invert"
              />
            </span>
          ) : (
            /* Version B — joined wordmark */
            <span
              key="brand-joined"
              className="fade-up font-display text-[clamp(2.75rem,9vw,7rem)] leading-[0.9] tracking-[0.02em]"
            >
              Shutte<span className="italic text-muted-foreground">Ram</span>
            </span>
          )}
          <span className="mt-7 flex items-center gap-4">
            <span className="h-px w-10 bg-foreground/30 md:w-16" />
            <span className="eyebrow">{site.tagline}</span>
            <span className="h-px w-10 bg-foreground/30 md:w-16" />
          </span>
        </div>
        <div key={active} className="fade-up max-w-3xl">
          <p className="eyebrow">
            {String(active + 1).padStart(2, "0")} — {categories[active]!.label}
          </p>
          <h1 className="mt-5 font-display text-[clamp(1.75rem,4.5vw,3.25rem)] leading-[1.05]">
            {categories[active]!.title}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            {categories[active]!.tagline}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/gallery/$category"
              params={{ category: categories[active]!.slug }}
              className="glow-hover inline-flex items-center border border-foreground/60 px-9 py-3.5 text-[0.6875rem] tracking-[0.28em] uppercase transition-colors hover:bg-foreground hover:text-background"
            >
              View More
            </Link>
            <Link
              to="/contact"
              search={{ form: "quote" as const, service: categories[active]!.slug }}
              className="glow-hover inline-flex items-center border border-foreground bg-foreground px-9 py-3.5 text-[0.6875rem] tracking-[0.28em] uppercase text-background hover:bg-transparent hover:text-foreground"
            >
              Book Your Date
            </Link>
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label="Previous category"
        onClick={() => go(-1)}
        className="absolute left-2 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center text-foreground/60 transition-all hover:-translate-x-1 hover:text-foreground md:left-4"
      >
        <ChevronLeft className="size-8 md:size-9" strokeWidth={1} />
      </button>
      <button
        type="button"
        aria-label="Next category"
        onClick={() => go(1)}
        className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center text-foreground/60 transition-all hover:translate-x-1 hover:text-foreground md:right-4"
      >
        <ChevronRight className="size-8 md:size-9" strokeWidth={1} />
      </button>

      <div className="absolute inset-x-0 bottom-8 z-20 flex justify-center gap-3">
        {categories.map((c, i) => (
          <button
            key={c.slug}
            type="button"
            aria-label={`Show ${c.label}`}
            onClick={() => setActive(i)}
            className={cn(
              "h-px w-10 transition-all duration-500",
              i === active ? "bg-foreground" : "bg-foreground/25 hover:bg-foreground/60",
            )}
          />
        ))}
      </div>
    </section>
  );
}
