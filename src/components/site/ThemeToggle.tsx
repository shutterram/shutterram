import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { t } from "@/data/portfolio";
import { cn } from "@/lib/utils";

/** Light / dark switch shown in the header and the mobile menu. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? t("theme.to_light") : t("theme.to_dark")}
      title={isDark ? t("theme.to_light") : t("theme.to_dark")}
      className={cn(
        "grid size-9 place-items-center border border-hairline text-muted-foreground transition-colors hover:border-foreground hover:text-foreground",
        className,
      )}
    >
      {isDark ? (
        <Sun className="size-4" strokeWidth={1.4} />
      ) : (
        <Moon className="size-4" strokeWidth={1.4} />
      )}
    </button>
  );
}
