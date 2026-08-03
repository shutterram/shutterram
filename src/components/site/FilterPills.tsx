import { cn } from "@/lib/utils";

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "border px-5 py-2 text-[0.6875rem] tracking-[0.24em] uppercase transition-all duration-300",
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
