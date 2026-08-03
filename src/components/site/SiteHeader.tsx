import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "@/assets/SRLogo.svg.asset.json";
import { site } from "@/data/portfolio";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Home", to: "/" },
  { label: "Gallery", to: "/gallery" },
  { label: "Services", to: "/services" },
  { label: "About Me", to: "/about" },
  { label: "Contact Me", to: "/contact" },
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
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-6">
          <div className="flex w-full items-center justify-between md:justify-center">
            <Link to="/" className="group flex flex-col items-center" onClick={() => setOpen(false)}>
              <span className="flex items-baseline gap-3">
                <img
                  src={logo.url}
                  alt=""
                  aria-hidden="true"
                  className={cn(
                    "w-auto shrink-0 translate-y-1 invert transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    scrolled ? "h-7" : "h-9 md:h-12",
                  )}
                />
                <span
                  className={cn(
                    "font-display leading-none font-medium tracking-[0.06em] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    scrolled ? "text-lg" : "text-xl md:text-[1.65rem]",
                  )}
                >
                  SHUTTER RAM
                </span>
              </span>
              <span
                className={cn(
                  "eyebrow mt-2 hidden overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] md:block",
                  scrolled ? "max-h-0 opacity-0" : "max-h-6 opacity-100",
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
          <div className="flex items-center justify-between px-6 py-6">
            <span className="flex items-baseline gap-2.5">
              <img src={logo.url} alt="" aria-hidden="true" className="h-6 w-auto translate-y-1 invert" />
              <span className="font-display text-lg font-medium tracking-[0.06em]">SHUTTER RAM</span>
            </span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="text-foreground"
            >
              <X className="size-6" strokeWidth={1.4} />
            </button>
          </div>

          <nav className="flex flex-1 flex-col items-center justify-center gap-8">
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
          </nav>

          <p className="eyebrow px-6 pb-10 text-center">{site.tagline}</p>
        </div>
      </div>
    </>
  );
}
