import { processSteps } from "@/data/portfolio";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

/**
 * "The Experience" — the client's journey, drawn as a curving timeline with a
 * milestone per step (horizontal on desktop, vertical on mobile).
 */
export function ExperienceSection({ className }: { className?: string }) {
  return (
    <section className={cn("border-t border-hairline py-24 md:py-32", className)}>
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="eyebrow">The Experience</p>
          <h2 className="mt-5 max-w-3xl font-display text-[clamp(2.25rem,5.5vw,4.25rem)] leading-[1.05]">
            Easy from first hello
            <span className="block italic text-muted-foreground">to final frame.</span>
          </h2>
        </Reveal>

        {/* ------------------------------------------------ desktop: horizontal */}
        <div className="relative mt-24 hidden md:block">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 h-32 w-full -translate-y-1/2 text-foreground/25"
          >
            <path
              d="M0 60 C 150 0, 300 120, 450 60 S 750 0, 900 60 S 1100 110, 1200 60"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 6"
            />
          </svg>

          <ol className="relative grid grid-cols-4">
            {processSteps.map((s, i) => (
              <Reveal key={s.step} delay={i * 120} as="li">
                <div
                  className={cn(
                    "group flex h-[26rem] flex-col items-center px-5 text-center",
                    i % 2 === 0 ? "justify-start" : "justify-end",
                  )}
                >
                  {i % 2 === 1 ? <Milestone step={s.step} /> : null}
                  <div className={cn("max-w-xs", i % 2 === 0 ? "order-first" : "")}>
                    <h3 className="font-display text-xl lg:text-2xl">{s.title}</h3>
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
                  </div>
                  {i % 2 === 0 ? <Milestone step={s.step} className="mt-auto" /> : null}
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        {/* --------------------------------------------------- mobile: vertical */}
        <div className="relative mt-16 md:hidden">
          <svg
            viewBox="0 0 60 1000"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="absolute bottom-6 left-0 top-6 w-16 text-foreground/25"
          >
            <path
              d="M30 0 C 0 120, 60 240, 30 360 S 0 600, 30 720 S 60 900, 30 1000"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 8"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          <ol className="relative space-y-12">
            {processSteps.map((s, i) => (
              <Reveal key={s.step} delay={i * 90} as="li">
                <div className="flex items-start gap-6">
                  <Milestone step={s.step} className="shrink-0" />
                  <div className="min-w-0 pt-2">
                    <h3 className="font-display text-xl">{s.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function Milestone({ step, className }: { step: string; className?: string }) {
  return (
    <span
      className={cn(
        "glow-hover relative z-10 grid size-16 place-items-center rounded-full border border-hairline bg-background font-display text-sm tracking-[0.14em] text-muted-foreground transition-colors duration-700 group-hover:border-foreground/60 group-hover:text-foreground",
        className,
      )}
    >
      {step}
    </span>
  );
}
