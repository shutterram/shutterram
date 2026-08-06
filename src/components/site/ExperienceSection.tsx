import {
  processSteps as defaultSteps,
  type ProcessStep,
  type SectionConfig,
} from "@/data/portfolio";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

/**
 * "The Experience" — the client's journey, drawn as a curving timeline with a
 * milestone per step (horizontal on desktop, vertical on mobile).
 *
 * Copy and steps are supplied per page so the About page can tell a different
 * story from the home / services pages. Passing `section = null` (a section the
 * studio hid or deleted) renders nothing.
 */
export function ExperienceSection({
  className,
  section,
  steps = defaultSteps,
}: {
  className?: string;
  section?: SectionConfig | null;
  steps?: ProcessStep[];
}) {
  if (section === null) return null;
  if (!steps.length) return null;

  const eyebrow = section?.eyebrow || "The Experience";
  const heading = section?.heading || "Easy from first hello";
  const accent = section?.headingAccent || "to final frame.";

  return (
    <section className={cn("border-t border-hairline py-24 md:py-32", className)}>
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-5 max-w-3xl font-display text-[clamp(2.25rem,5.5vw,4.25rem)] leading-[1.05]">
            {heading}
            {accent ? <span className="block italic text-muted-foreground">{accent}</span> : null}
          </h2>
          {section?.intro ? (
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {section.intro}
            </p>
          ) : null}
        </Reveal>

        {/* ------------------------------------------------ desktop: horizontal */}
        <div className="relative mt-24 hidden md:block">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 h-32 w-full -translate-y-1/2 overflow-hidden text-foreground/25"
          >
            <path
              d="M0 30 C 60 90, 100 60, 150 60 S 340 20, 450 60 S 620 100, 750 60 S 940 20, 1050 60 C 1120 60, 1150 80, 1200 95"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 6"
            />
          </svg>

          <ol
            className="relative grid"
            style={{ gridTemplateColumns: `repeat(${Math.max(steps.length, 1)}, minmax(0, 1fr))` }}
          >
            {steps.map((s, i) => (
              <Reveal key={`${s.step}-${i}`} delay={i * 120} as="li">
                <div className="group flex h-[26rem] flex-col items-center px-5 text-center">
                  <div className="flex h-1/2 w-full items-end justify-center pb-8">
                    {i % 2 === 0 ? <StepText title={s.title} detail={s.detail} /> : null}
                  </div>
                  <Milestone step={s.step} className="-my-8" />
                  <div className="flex h-1/2 w-full items-start justify-center pt-8">
                    {i % 2 === 1 ? <StepText title={s.title} detail={s.detail} /> : null}
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>

        {/* --------------------------------------------------- mobile: vertical */}
        <div className="relative mt-16 md:hidden">
          <ol className="relative">
            {steps.map((s, i) => (
              <Reveal key={`${s.step}-${i}`} delay={i * 90} as="li">
                <div className="flex items-stretch gap-6 pb-12 last:pb-0">
                  <div className="flex shrink-0 flex-col items-center">
                    <Milestone step={s.step} className="shrink-0" />
                    {i < steps.length - 1 ? (
                      <svg
                        viewBox="0 0 60 120"
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        className="w-16 flex-1 text-foreground/25"
                      >
                        <path
                          d="M30 0 C 0 35, 60 85, 30 120"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeDasharray="4 8"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    ) : null}
                  </div>
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

function StepText({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="max-w-xs">
      <h3 className="font-display text-xl lg:text-2xl">{title}</h3>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}
