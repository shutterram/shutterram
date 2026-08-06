import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { sectionFor, services, t } from "@/data/portfolio";
import { Reveal } from "@/components/site/Reveal";
import { ExperienceSection } from "@/components/site/ExperienceSection";
import { cn } from "@/lib/utils";
import { getSeo } from "@/lib/seo.functions";
import { buildSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/services")({
  loader: () => getSeo({ data: { path: "/services" } }),
  head: ({ loaderData }) => ({
    ...buildSeoHead(loaderData, {
      path: "/services",
      title: "Photography Services & Rates | Shutter Ram",
      description:
        "Wedding, corporate, portrait, headshot, event and product photography services with what is included and starting rates.",
      image: services[0]!.image,
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "OfferCatalog",
          name: "Photography services — Shutter Ram",
          url: "https://shutterram.lovable.app/services",
          itemListElement: services.map((s, i) => ({
            "@type": "Offer",
            position: i + 1,
            ...(s.from ? { description: s.from } : {}),
            itemOffered: {
              "@type": "Service",
              name: s.title,
              description: s.description || s.subtitle,
              serviceType: s.title,
              provider: { "@type": "LocalBusiness", name: "Shutter Ram" },
            },
          })),

        }),
      },
    ],
  }),
  component: ServicesPage,
});


function ServicesPage() {
  return (
    <div className="pb-28 pt-56">
      <div className="mx-auto max-w-7xl px-6">
        <p className="eyebrow">Services</p>
        <h1 className="mt-4 font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-tight">
          How we can work together
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Six ways I usually work, though nothing here is rigid. If your project sits somewhere
          between two of these, tell me about it — most of my favourite work started that way.
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-7xl space-y-10 px-6 md:mt-20 md:space-y-32">
        {services.map((s, i) => (
          <section
            key={s.slug}
            id={s.slug}
            className="grid scroll-mt-40 grid-cols-2 items-center gap-5 md:gap-12"
          >
            <Reveal className={cn("overflow-hidden", i % 2 === 1 && "order-2")}>
              <img
                src={s.image}
                alt={s.title}
                loading="lazy"
                className="aspect-[3/4] w-full object-cover transition-transform duration-[1600ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] md:aspect-[4/3]"
              />
            </Reveal>

            <Reveal delay={120} className={cn("min-w-0", i % 2 === 1 && "order-1")}>
              <p className="eyebrow">
                {String(i + 1).padStart(2, "0")} — {s.subtitle}
              </p>
              <h2 className="mt-3 font-display text-[clamp(1.15rem,3.5vw,3rem)] leading-tight md:mt-4">
                {s.title}
              </h2>
              <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-muted-foreground md:mt-5 md:line-clamp-none md:text-base md:leading-loose">
                {s.description}
              </p>

              <ul className="mt-5 hidden space-y-2.5 md:block md:mt-7">
                {s.includes.map((inc) => (
                  <li key={inc} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-foreground" strokeWidth={1.4} />
                    {inc}
                  </li>
                ))}
              </ul>

              <p className="eyebrow mt-4 text-foreground md:mt-7">{s.from}</p>

              <div className="mt-5 flex flex-wrap gap-2 md:mt-8 md:gap-3">
                <Link
                  to="/gallery/$category"
                  params={{ category: s.category }}
                  className="inline-flex items-center border border-hairline px-4 py-2.5 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground md:px-6 md:py-3 md:text-[0.6875rem] md:tracking-[0.24em]"
                >
                  {t("btn.view_more")}
                </Link>
                <Link
                  to="/contact"
                  search={{ service: s.slug, form: "quote" as const }}
                  className="inline-flex items-center border border-foreground bg-foreground px-4 py-2.5 text-[0.625rem] tracking-[0.2em] uppercase text-background transition-opacity hover:opacity-85 md:px-6 md:py-3 md:text-[0.6875rem] md:tracking-[0.24em]"
                >
                  {t("btn.request_quote")}
                </Link>
              </div>
            </Reveal>
          </section>
        ))}
      </div>

      <ExperienceSection className="mt-28" section={sectionFor("services", "experience")} />
    </div>
  );
}
