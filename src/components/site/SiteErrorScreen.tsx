import { useRouter } from "@tanstack/react-router";
import { t } from "@/data/portfolio";

/** Site-wide error screen used whenever a route fails to load. */
export function SiteErrorScreen({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  console.error(error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="eyebrow">{t("error.eyebrow")}</p>
        <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3rem)] leading-tight">
          {t("error.title")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {t("error.body")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              void router.invalidate();
              reset();
            }}
            className="inline-flex items-center border border-foreground bg-foreground px-7 py-3 text-[0.6875rem] tracking-[0.24em] uppercase text-background transition-opacity hover:opacity-85"
          >
            {t("error.retry")}
          </button>
          <a
            href="/"
            className="inline-flex items-center border border-hairline px-7 py-3 text-[0.6875rem] tracking-[0.24em] uppercase transition-colors hover:border-foreground"
          >
            {t("error.home")}
          </a>
        </div>
      </div>
    </div>
  );
}
