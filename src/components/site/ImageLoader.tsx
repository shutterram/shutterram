import logo from "@/assets/SRLogo.svg.asset.json";
import { logos } from "@/data/portfolio";
import { useTheme } from "@/hooks/use-theme";

/**
 * Small centred loader used inside the full-screen image viewer while the
 * next photo is decoding. Reuses the site logo and a gentle pulse so it feels
 * like the same brand as the page loader.
 */
export function ImageLoader({ label = "Loading" }: { label?: string }) {
  const { theme } = useTheme();

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="relative flex animate-logo-pulse items-center justify-center"
        style={{ width: 64, height: 64 }}
      >
        <span className="absolute inset-0 border border-foreground/40" />
        <img
          src={logos.loader || logo.url}
          alt="Shutter Ram"
          className={`w-auto h-8 ${logos.invert && theme === "dark" ? "brightness-0 invert" : ""}`}
        />
      </div>
      <p className="eyebrow flex items-center gap-1">
        <span>{label}</span>
        <span className="inline-flex w-5 justify-start">
          <span className="animate-loading-dots">.</span>
          <span className="animate-loading-dots [animation-delay:150ms]">.</span>
          <span className="animate-loading-dots [animation-delay:300ms]">.</span>
        </span>
      </p>
    </div>
  );
}
