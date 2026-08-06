import { cn } from "@/lib/utils";

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  className,
  variant = "pill",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  variant?: "pill" | "tabs";
}) {
  if (variant === "tabs") {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-9 gap-y-3", className)}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "relative pb-2 text-sm font-medium tracking-wide transition-colors duration-300",
              value === o.value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
            <span
              className={cn(
                "absolute inset-x-0 bottom-0 h-0.5 bg-foreground transition-all duration-300",
                value === o.value ? "opacity-100" : "opacity-0",
              )}
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "border-hairline border px-5 py-2 text-[0.6875rem] tracking-[0.2em] uppercase transition-all duration-300",
            value === o.value
              ? "border-foreground bg-foreground text-background"
              : "border-hairline text-muted-foreground hover:border-foreground/50 hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
