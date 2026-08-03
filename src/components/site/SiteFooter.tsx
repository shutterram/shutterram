import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { categories, site } from "@/data/portfolio";
import { LogoLockup } from "./LogoLockup";
import { SocialLinks } from "./SocialLinks";

const navLinks = [
  { label: "Home", to: "/" as const },
  { label: "Gallery", to: "/gallery" as const },
  { label: "Services", to: "/services" as const },
  { label: "About Me", to: "/about" as const },
  { label: "Contact", to: "/contact" as const },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-surface/30">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link to="/" className="inline-flex">
              <LogoLockup size="md" className="!items-start text-left" />
            </Link>
            <p className="mt-7 max-w-sm text-sm leading-relaxed text-muted-foreground">
              A one-person studio photographing weddings, brands and people who would
              rather be remembered honestly than perfectly.
            </p>
            <SocialLinks className="mt-9" />
          </div>

          <div className="md:col-span-2">
            <p className="eyebrow">Navigate</p>
            <ul className="mt-6 space-y-3 text-sm">
              {navLinks.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-muted-foreground transition-colors duration-500 hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <p className="eyebrow">Categories</p>
            <ul className="mt-6 space-y-3 text-sm">
              {categories.slice(0, 5).map((c) => (
                <li key={c.slug}>
                  <Link
                    to="/gallery/$category"
                    params={{ category: c.slug }}
                    className="text-muted-foreground transition-colors duration-500 hover:text-foreground"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-3">
            <p className="eyebrow">Get in touch</p>
            <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 shrink-0" strokeWidth={1.4} />
                <a
                  href={`tel:${site.phone.replace(/[^+\d]/g, "")}`}
                  className="transition-colors duration-500 hover:text-foreground"
                >
                  {site.phone}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 shrink-0" strokeWidth={1.4} />
                <a
                  href={`mailto:${site.email}`}
                  className="transition-colors duration-500 hover:text-foreground"
                >
                  {site.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0" strokeWidth={1.4} />
                <span>{site.location}</span>
              </li>
            </ul>
            <Link
              to="/contact"
              search={{ form: "quote" as const }}
              className="glow-hover mt-7 inline-flex items-center border border-foreground px-6 py-3 text-[0.6875rem] tracking-[0.24em] uppercase transition-colors hover:bg-foreground hover:text-background"
            >
              Book Your Date
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Shutter Ram. All rights reserved.</p>
          <p className="eyebrow">Every frame edited by hand</p>
        </div>
      </div>
    </footer>
  );
}
