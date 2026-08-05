import { createFileRoute, Link } from "@tanstack/react-router";
import {
  aboutLong,
  aboutProcessSteps,
  aboutShort,
  sectionFor,
  site,
  stats,
  t,
} from "@/data/portfolio";
import { SocialLinks } from "@/components/site/SocialLinks";
import { ExperienceSection } from "@/components/site/ExperienceSection";
import { Reveal } from "@/components/site/Reveal";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Ram — Photographer | Shutter Ram" },
      {
        name: "description",
        content:
          "Meet Ram, the photographer behind Shutter Ram: fifteen years of documentary and editorial work across weddings, brands and portraits.",
      },
      { property: "og:title", content: "About Ram — Photographer | Shutter Ram" },
      { property: "og:description", content: aboutShort.slice(0, 155) },
    ],
  }),
  component: About,
});

function About() {
  return (
    <>
      <div className="mx-auto max-w-5xl px-6 pb-24 pt-56">
        <p className="eyebrow">About Me</p>
        <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-tight">
          I'd rather wait for the real moment.
        </h1>

        <Reveal className="mt-14 grid items-start gap-12 md:grid-cols-[0.8fr_1.2fr]">
          <img
            src="https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1000&q=80"
            alt="Ram's camera on the studio bench"
            loading="lazy"
            className="mx-auto aspect-[4/5] w-[60%] max-w-[16rem] object-cover md:mx-0 md:w-full md:max-w-none"
          />

          <div className="space-y-6 text-sm leading-loose text-muted-foreground md:text-base">
            {aboutLong.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </Reveal>

        <Reveal delay={100}>
          <dl className="mt-16 grid grid-cols-2 gap-y-10 border-y border-hairline py-12 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <dt className="font-display text-[clamp(2rem,4vw,3rem)] leading-none">{s.value}</dt>
                <dd className="eyebrow mt-3">{s.label}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal
          delay={120}
          className="mt-14 space-y-10 text-sm leading-loose text-muted-foreground md:text-base"
        >
          <div className="border-t border-hairline pt-8">
            <p className="eyebrow">{t("about.kit_heading")}</p>
            <p className="mt-3">
              Two mirrorless bodies, three primes, one very tired 24–70, and a pair of lights that
              only come out when the room refuses to cooperate.
            </p>
          </div>

          <div className="border-t border-hairline pt-8">
            <p className="eyebrow">{t("about.hello_heading")}</p>
            <p className="mt-3">
              <a
                href={`mailto:${site.email}`}
                className="text-foreground underline underline-offset-4"
              >
                {site.email}
              </a>
              {" · "}
              <a
                href={`tel:${site.phone.replace(/[^+\d]/g, "")}`}
                className="text-foreground underline underline-offset-4"
              >
                {site.phone}
              </a>
            </p>
            <SocialLinks className="mt-6" />
          </div>

          <div>
            <Link
              to="/contact"
              search={{ form: "message" as const }}
              className="glow-hover inline-flex items-center border border-foreground px-8 py-3.5 text-[0.6875rem] tracking-[0.28em] uppercase text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              {t("btn.work_with_me")}
            </Link>
          </div>
        </Reveal>
      </div>

      <ExperienceSection section={sectionFor("about", "experience")} steps={aboutProcessSteps} />
    </>
  );
}
