import logo from "@/assets/SRLogo.svg.asset.json";

/** Full-screen loading state shown while a page's content is being fetched. */
export function PageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6">
      <div className="relative flex size-32 items-center justify-center">
        {/* Expanding square pulse */}
        <span className="absolute inset-0 animate-ping border border-hairline" />
        {/* Static square frame */}
        <span className="absolute inset-0 border border-foreground/60" />
        {/* Logo in the centre */}
        <img
          src={logo.url}
          alt="Shutter Ram"
          className="h-12 w-auto brightness-0 invert"
        />
      </div>
      <p className="eyebrow animate-pulse">Loading</p>
    </div>
  );
}
