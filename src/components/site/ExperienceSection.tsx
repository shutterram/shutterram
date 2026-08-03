import { processSteps } from "@/data/portfolio";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

/**
 * "The Experience" — the client's journey of working with the studio,
 * laid out as four hairline-separated columns.
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

        <ol className="mt-16 grid gap-px border-t border-hairline bg-hairline md:grid-cols-4">
          {processSteps.map((s, i) => (
            <Reveal key={s.step} delay={i * 100} as="li">
              <div className="group glow-hover h-full bg-background px-0 py-10 transition-colors duration-700 hover:bg-surface/50 md:px-8">
                <p className="font-display text-2xl text-muted-foreground transition-colors duration-500 group-hover:text-foreground">
                  {s.step}
                </p>
                <h3 className="mt-6 font-display text-xl md:text-2xl">{s.title}</h3>
                <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {s.detail}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
