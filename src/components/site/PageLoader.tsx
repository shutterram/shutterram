import logo from "@/assets/SRLogo.svg.asset.json";
import { loader, logos } from "@/data/portfolio";

/** Full-screen loading state shown while a page's content is being fetched. */
export function PageLoader() {
  const size = Math.max(32, loader.size);
  const round = loader.shape === "circle" ? "rounded-full" : "";
  const animation = `loader-pulse-${loader.fade === "in" ? "in" : "out"} 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Growing outline that fades as it expands */}
        <span
          className={`absolute inset-0 border border-foreground/70 ${round}`}
          style={
            {
              "--loader-scale": loader.pulseScale,
              animation,
            } as React.CSSProperties
          }
        />
        {/* Small static frame, sized to just fit the logo */}
        <span className={`absolute inset-0 border border-foreground/60 ${round}`} />
        {/* Logo in the centre */}
        <img
          src={logos.loader || logo.url}
          alt="Shutter Ram"
          className={`w-auto ${logos.invert ? "brightness-0 invert" : ""}`}
          style={{ height: size * 0.5 }}
        />
      </div>
      <p className="eyebrow animate-pulse">Loading</p>
    </div>
  );
}
