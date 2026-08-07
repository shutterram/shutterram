import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { imageKeyOf } from "@/lib/image-index";

type Counts = { total: number; shown: number; hidden: number };

type Audit = {
  internet: Counts;
  gallery: Counts;
  privacy: Counts;
  bySource: { label: string; counts: Counts }[];
};

/** Read-only overview of how many images are public / visible on the gallery. */
export function VisibilityAudit() {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [flags, photos, categories, services, samples, settings, socials] = await Promise.all([
          supabase.from("image_settings").select("path,indexable,is_private"),
          supabase.from("photos").select("src,in_gallery"),
          supabase.from("categories").select("hero,cover"),
          supabase.from("services").select("image"),
          supabase.from("edit_samples").select("src,src_before"),
          supabase.from("settings").select("og_image,logo_header,logo_footer,logo_mobile,logo_loader,logo_favicon"),
          supabase.from("socials").select("icon_url"),
        ]);

        const privateKeys = new Set(
          (flags.data ?? [])
            .filter((row) => (row as { is_private?: boolean }).is_private === true)
            .map((row) => row.path),
        );

        const hidden = new Set(
          (flags.data ?? [])
            .filter((row) => row.indexable === false)
            .map((row) => row.path),
        );

        const count = (srcs: (string | null | undefined)[]): Counts => {
          const keys = new Set<string>();
          for (const src of srcs) {
            const key = src ? imageKeyOf(src) : null;
            if (key) keys.add(key);
          }
          const total = keys.size;
          let hiddenCount = 0;
          keys.forEach((key) => {
            if (hidden.has(key)) hiddenCount += 1;
          });
          return { total, shown: total - hiddenCount, hidden: hiddenCount };
        };

        const photoRows = (photos.data ?? []) as { src: string; in_gallery: boolean }[];
        const settingsRow = (settings.data?.[0] ?? {}) as Record<string, string>;

        const sources: { label: string; srcs: (string | null | undefined)[] }[] = [
          { label: "Gallery photos", srcs: photoRows.map((r) => r.src) },
          {
            label: "Category hero & cover images",
            srcs: (categories.data ?? []).flatMap((r) => [r.hero, r.cover]),
          },
          { label: "Service images", srcs: (services.data ?? []).map((r) => r.image) },
          {
            label: "Before / after samples",
            srcs: (samples.data ?? []).flatMap((r) => [r.src, r.src_before]),
          },
          { label: "Logos & share image", srcs: Object.values(settingsRow) },
          { label: "Social icons", srcs: (socials.data ?? []).map((r) => r.icon_url) },
        ];

        const allSrcs = sources.flatMap((s) => s.srcs);
        const galleryTotal = photoRows.length;
        const galleryShown = photoRows.filter((r) => r.in_gallery !== false).length;

        const allKeys = new Set<string>();
        for (const src of allSrcs) {
          const key = src ? imageKeyOf(src) : null;
          if (key) allKeys.add(key);
        }
        let privateCount = 0;
        allKeys.forEach((key) => {
          if (privateKeys.has(key)) privateCount += 1;
        });

        setAudit({
          internet: count(allSrcs),
          privacy: {
            total: allKeys.size,
            shown: allKeys.size - privateCount,
            hidden: privateCount,
          },
          gallery: {
            total: galleryTotal,
            shown: galleryShown,
            hidden: galleryTotal - galleryShown,
          },
          bySource: sources.map((s) => ({ label: s.label, counts: count(s.srcs) })),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load the audit");
      }
    })();
  }, []);

  if (error) return <p className="text-sm text-muted-foreground">{error}</p>;
  if (!audit) return <p className="text-sm text-muted-foreground">Counting your images…</p>;

  return (
    <div className="space-y-10">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        A live count of what is publicly discoverable. Images hidden from the internet are still
        shown to visitors on your site, but they are kept out of the sitemap and served with
        no-index headers, so search engines won’t surface them. Private images go a step further:
        they never render on the site at all unless someone opens a share link you created with
        “Show private images” ticked.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          title="Show on internet"
          counts={audit.internet}
          shownLabel="Discoverable in search"
          hiddenLabel="Site-only"
        />
        <Card
          title="Show on main gallery page"
          counts={audit.gallery}
          shownLabel="On /gallery"
          hiddenLabel="Category pages only"
        />
        <Card
          title="Show on site"
          counts={audit.privacy}
          shownLabel="Visible to every visitor"
          hiddenLabel="Private — share link only"
        />
      </div>

      <div className="border-t border-hairline pt-8">
        <p className="eyebrow">Internet visibility by area</p>
        <div className="mt-6 divide-y divide-hairline border border-hairline">
          {audit.bySource.map((row) => (
            <div key={row.label} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <span className="text-sm">{row.label}</span>
              <span className="text-xs tracking-[0.18em] uppercase text-muted-foreground">
                {row.counts.shown} public · {row.counts.hidden} hidden · {row.counts.total} total
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  counts,
  shownLabel,
  hiddenLabel,
}: {
  title: string;
  counts: Counts;
  shownLabel: string;
  hiddenLabel: string;
}) {
  const pct = counts.total ? Math.round((counts.shown / counts.total) * 100) : 0;
  return (
    <div className="border border-hairline p-6">
      <p className="eyebrow">{title}</p>
      <p className="mt-4 font-display text-4xl">
        {counts.shown}
        <span className="text-muted-foreground text-lg"> / {counts.total}</span>
      </p>
      <div className="mt-4 h-px w-full bg-hairline">
        <div className="h-px bg-foreground" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        {counts.shown} {shownLabel.toLowerCase()} · {counts.hidden} {hiddenLabel.toLowerCase()}
      </p>
    </div>
  );
}

