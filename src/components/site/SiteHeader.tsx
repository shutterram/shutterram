import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "@/assets/SRLogo.svg.asset.json";
import { site } from "@/data/portfolio";
import { cn } from "@/lib/utils";
import { LogoLockup } from "./LogoLockup";

const nav = [
  { label: "Home", to: "/" },
  { label: "Gallery", to: "/gallery" },
  { label: "Services", to: "/services" },
  { label: "About Me", to: "/about" },
  { label: "Contact", to: "/contact" },
] as const;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
          scrolled
            ? "border-b border-hairline bg-background/85 py-3 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent py-6",
        )}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-6">
          <div className="flex w-full items-center justify-between md:justify-center">
            <Link to="/" className="group flex flex-col items-center" onClick={() => setOpen(false)}>
              <img
                src={logo.url}
                alt=""
                aria-hidden="true"
                className={cn(
                  "w-auto shrink-0 invert transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  scrolled ? "h-10" : "h-14 md:h-[4.5rem]",
                )}
              />
              <span
                className={cn(
                  "font-display mt-1 leading-none font-medium tracking-[0.14em] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  scrolled ? "text-base" : "text-xl md:text-[1.75rem]",
                )}
              >
                SHUTTER RAM
              </span>
              <span
                className={cn(
                  "eyebrow hidden overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] md:block",
                  scrolled ? "mt-0 max-h-0 opacity-0" : "mt-2 max-h-6 opacity-100",
                )}
              >
                {site.tagline}
              </span>
            </Link>

            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className="text-foreground md:hidden"
            >
              <Menu className="size-6" strokeWidth={1.4} />
            </button>
          </div>

          <nav className="hidden items-center gap-9 md:flex">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="eyebrow relative py-1 transition-colors hover:text-foreground data-[status=active]:text-foreground"
              >
                <span className="relative after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-foreground after:transition-all after:duration-500 after:ease-[cubic-bezier(0.16,1,0.3,1)] hover:after:w-full">
                  {item.label}
                </span>
              </Link>
            ))}
            <Link
              to="/contact"
              search={{ form: "quote" as const }}
              className="glow-hover inline-flex items-center border border-foreground bg-foreground px-5 py-2.5 text-[0.6875rem] tracking-[0.24em] uppercase text-background hover:bg-transparent hover:text-foreground"
            >
              Book Your Date
            </Link>
          </nav>
        </div>
      </header>

      {/* Mobile drawer — sibling of the header so the blurred header never clips it */}
      <div
        className={cn(
          "fixed inset-0 z-[70] bg-background transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden",
          open ? "visible opacity-100" : "pointer-events-none invisible opacity-0",
        )}
        aria-hidden={!open}
      >
        <div className="flex h-full flex-col">
          <div className="relative flex items-start justify-center px-6 pt-8 pb-6">
            <LogoLockup size="md" />
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute right-6 top-8 text-foreground"
            >
              <X className="size-6" strokeWidth={1.4} />
            </button>
          </div>

          <nav className="flex flex-1 flex-col items-center justify-center gap-7">
            {nav.map((item, i) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "font-display text-3xl tracking-wide text-foreground transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                  open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                )}
                style={{ transitionDelay: open ? `${120 + i * 60}ms` : "0ms" }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/contact"
              search={{ form: "quote" as const }}
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center border border-foreground bg-foreground px-8 py-3.5 text-[0.6875rem] tracking-[0.24em] uppercase text-background"
            >
              Book Your Date
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}
