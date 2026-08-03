import { experience } from "@/data/portfolio";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

/**
 * Vertical, hairline-ruled experience timeline.
 */
export function ExperienceSection({ className }: { className?: string }) {
  return (
    <section className={cn("border-t border-hairline py-24 md:py-32", className)}>
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Experience"
            title="Fifteen years, told in order."
            intro="A short history of where the craft was learned and who it has been practised for."
          />
        </Reveal>

        <ol className="mt-16 border-t border-hairline">
          {experience.map((e, i) => (
            <Reveal key={e.period} delay={(i % 3) * 90} as="li">
              <div className="group glow-hover grid gap-4 border-b border-hairline py-10 transition-colors duration-700 hover:bg-surface/40 md:grid-cols-12 md:gap-8 md:px-6">
                <p className="eyebrow md:col-span-3">{e.period}</p>
                <div className="md:col-span-4">
                  <h3 className="font-display text-xl leading-tight md:text-2xl">{e.role}</h3>
                  <p className="eyebrow mt-2">{e.place}</p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground md:col-span-5">
                  {e.detail}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
