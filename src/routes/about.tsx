import { createFileRoute, Link } from "@tanstack/react-router";
import { aboutLong, aboutShort, site } from "@/data/portfolio";
import { SocialLinks } from "@/components/site/SocialLinks";

const portrait =
  "https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=1200&q=80";

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
      { property: "og:image", content: portrait },
      { name: "twitter:image", content: portrait },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-28 pt-40">
      <p className="eyebrow">About Me</p>
      <h1 className="mt-4 max-w-3xl font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-tight">
        I'd rather wait for the real moment.
      </h1>

      <div className="mt-16 grid gap-14 md:grid-cols-[1fr_1.2fr]">
        <div>
          <img
            src={portrait}
            alt="Ram, photographer"
            className="aspect-[4/5] w-full object-cover grayscale-[40%]"
          />
          <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-hairline pt-8">
            {[
              ["15", "Years shooting"],
              ["400+", "Weddings covered"],
              ["60+", "Brand clients"],
              ["1", "Person editing"],
            ].map(([n, l]) => (
              <div key={l}>
                <dt className="font-display text-3xl leading-none">{n}</dt>
                <dd className="eyebrow mt-2">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-6 text-sm leading-loose text-muted-foreground md:text-base">
          {aboutLong.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}

          <div className="border-t border-hairline pt-8">
            <p className="eyebrow">Kit, briefly</p>
            <p className="mt-3">
              Two mirrorless bodies, three primes, one very tired 24–70, and a pair of
              lights that only come out when the room refuses to cooperate.
            </p>
          </div>

          <div className="border-t border-hairline pt-8">
            <p className="eyebrow">Say hello</p>
            <p className="mt-3">
              <a href={`mailto:${site.email}`} className="text-foreground underline underline-offset-4">
                {site.email}
              </a>
              {" · "}
              <a href={`tel:${site.phone.replace(/[^+\d]/g, "")}`} className="text-foreground underline underline-offset-4">
                {site.phone}
              </a>
            </p>
            <SocialLinks className="mt-6" />
          </div>

          <div className="pt-4">
            <Link
              to="/contact"
              className="inline-flex items-center border border-foreground px-8 py-3.5 text-[0.6875rem] tracking-[0.28em] uppercase text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              Work with me
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
