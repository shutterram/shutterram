import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ListEditor, SingletonEditor, type FieldSpec } from "@/components/admin/ContentEditor";
import { CopyEditor } from "@/components/admin/CopyEditor";
import { LogoStudio } from "@/components/admin/LogoStudio";
import { ReviewModeration } from "@/components/admin/ReviewModeration";
import { SeoPageSync } from "@/components/admin/SeoPageSync";
import { ShareLinks } from "@/components/admin/ShareLinks";
import { TextContrastStudio } from "@/components/admin/TextContrastStudio";
import { UserManagement } from "@/components/admin/UserManagement";
import { ThemeStudio } from "@/components/admin/ThemeStudio";
import { TypographyStudio } from "@/components/admin/TypographyStudio";
import { VisibilityAudit } from "@/components/admin/VisibilityAudit";
import { GridDefaultsStudio } from "@/components/admin/GridDefaultsStudio";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { TemplatesStudio } from "@/components/admin/TemplatesStudio";
import { HistoryPanel } from "@/components/admin/HistoryPanel";
import { StorageCleanup } from "@/components/admin/StorageCleanup";
import { TemplateBar } from "@/components/admin/TemplateBar";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Content Studio | Shutter Ram" },
      {
        name: "description",
        content: "Private content studio for editing the Shutter Ram website.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Content Studio | Shutter Ram" },
      {
        property: "og:description",
        content: "Private content studio for the Shutter Ram website.",
      },
    ],
  }),
  component: AdminPage,
});

const SECTIONS = [
  {
    id: "site",
    panel: "content",
    label: "Site & About",
    kind: "single" as const,
    table: "settings",
    fields: [
      { key: "name", label: "Studio name" },
      { key: "tagline", label: "Tagline" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "location", label: "Location line" },
      {
        key: "og_image",
        label: "Default social share image (used when a page has none)",
        type: "image",
      },
      { key: "about_short", label: "About — short paragraph", type: "textarea" },
      { key: "about_image", label: "About page — photographer photo", type: "image" },

      { key: "about_long", label: "About — long (one paragraph per line)", type: "list" },
      { key: "budget_ranges", label: "Quote form: budget options", type: "list" },
      { key: "hour_options", label: "Quote form: hours options", type: "list" },
      {
        key: "loader_shape",
        label: "Loading screen — shape",
        type: "select",
        options: [
          { value: "square", label: "Square" },
          { value: "circle", label: "Circle" },
        ],
      },
      { key: "loader_size", label: "Loading screen — inner size (px)", type: "number" },
      {
        key: "loader_pulse_scale",
        label: "Loading screen — pulse growth (1 = none, 1.8 = 80% larger)",
        type: "number",
      },
      {
        key: "loader_fade",
        label: "Loading screen — opacity direction",
        type: "select",
        options: [
          { value: "out", label: "100% → 0% (fade out while growing)" },
          { value: "in", label: "0% → 100% (fade in while shrinking)" },
        ],
      },
      { key: "glow_size", label: "Cursor glow — size (px across)", type: "number" },
      {
        key: "glow_softness",
        label: "Cursor glow — edge softness (10–100, higher = wider fade)",
        type: "number",
      },
      {
        key: "glow_blend",
        label: "Cursor glow — blending mode",
        type: "select",
        options: [
          { value: "normal", label: "Normal" },
          { value: "screen", label: "Screen" },
          { value: "overlay", label: "Overlay" },
          { value: "soft-light", label: "Soft light" },
          { value: "hard-light", label: "Hard light" },
          { value: "lighten", label: "Lighten" },
          { value: "color-dodge", label: "Color dodge" },
          { value: "multiply", label: "Multiply" },
          { value: "darken", label: "Darken" },
          { value: "difference", label: "Difference" },
          { value: "exclusion", label: "Exclusion" },
          { value: "luminosity", label: "Luminosity" },
        ],
      },
    ] satisfies FieldSpec[],
  },
  {
    id: "form-delivery",
    panel: "forms",
    label: "Form delivery",
    kind: "single" as const,
    table: "admin_settings",
    note: "Private: this endpoint is only visible to signed-in admins and is never sent to site visitors.",
    fields: [
      {
        key: "form_endpoint",
        label: "Form endpoint URL",
        placeholder: "Formspree / Basin / Getform URL",
      },
    ] satisfies FieldSpec[],
  },
  {
    id: "grids",
    panel: "content",
    label: "Grid defaults",
    kind: "grids" as const,
    table: "settings",
    fields: [] satisfies FieldSpec[],
  },
  {
    id: "analytics",
    panel: "stats",
    label: "Statistics",
    kind: "analytics" as const,
    table: "page_views",
    fields: [] satisfies FieldSpec[],
  },
  {
    id: "logos",
    panel: "content",
    label: "Logos",
    kind: "logos" as const,
    table: "settings",
    fields: [] satisfies FieldSpec[],
  },
  {
    id: "colours",
    panel: "content",
    label: "Colours",
    kind: "theme" as const,
    table: "theme_tokens",
    fields: [] satisfies FieldSpec[],
  },
  {
    id: "fonts",
    panel: "content",
    label: "Fonts",
    kind: "type" as const,
    table: "type_tokens",
    fields: [] satisfies FieldSpec[],
  },
  {
    id: "copy",
    panel: "content",
    label: "Wording",
    kind: "copy" as const,
    table: "site_copy",
    fields: [] satisfies FieldSpec[],
  },
  {
    id: "seo",
    panel: "seo",
    label: "SEO",
    kind: "list" as const,
    table: "seo_pages",
    itemLabel: "page",
    titleKey: "path",
    fields: [
      { key: "path", label: "Page path (e.g. /about)" },
      { key: "title", label: "Title tag (under 60 characters)" },
      { key: "description", label: "Meta description (under 160 characters)", type: "textarea" },
      { key: "keywords", label: "Keywords (comma separated)" },
      { key: "og_title", label: "Social share title" },
      { key: "og_description", label: "Social share description", type: "textarea" },
      { key: "og_image", label: "Social share image", type: "image" },
      { key: "canonical", label: "Canonical URL" },
      {
        key: "robots",
        label: "Search engines",
        type: "select",
        options: [
          { value: "index, follow", label: "Index this page" },
          { value: "noindex, nofollow", label: "Hide from search engines" },
        ],
      },
    ] satisfies FieldSpec[],
  },
  {
    id: "contrast",
    panel: "content",
    label: "Text contrast",
    kind: "contrast" as const,
    table: "text_inverts",
    fields: [] satisfies FieldSpec[],
  },
  {
    id: "share",
    panel: "links",
    label: "Share links",
    kind: "share" as const,
    table: "share_links",
    fields: [] satisfies FieldSpec[],
  },
  {
    id: "users",
    panel: "users",
    label: "Users",
    kind: "users" as const,
    table: "user_roles",
    fields: [] satisfies FieldSpec[],
  },
  {
    id: "reviews",
    panel: "reviews",
    label: "Client reviews",
    kind: "reviews" as const,
    table: "testimonials",
    fields: [] satisfies FieldSpec[],
  },
  {
    id: "hero",
    panel: "content",
    label: "Hero categories",
    kind: "list" as const,
    table: "categories",
    itemLabel: "category",
    titleKey: "title",
    fields: [
      { key: "title", label: "Title" },
      { key: "label", label: "Short label (filters)" },
      { key: "slug", label: "URL slug" },
      { key: "tagline", label: "Tagline", type: "textarea" },
      { key: "hero", label: "Hero image (home slider)", type: "image" },
      { key: "cover", label: "Category page cover (falls back to hero image)", type: "image" },
      {
        key: "show_in_hero",
        label: "Show as a slide in the home page hero",
        type: "bool",
      },
    ] satisfies FieldSpec[],
  },
  {
    id: "photos",
    panel: "gallery",
    label: "Photos",
    kind: "list" as const,
    table: "photos",
    itemLabel: "photo",
    titleKey: "caption",
    fields: [
      { key: "caption", label: "Caption" },
      { key: "category_slug", label: "Category", type: "category" },
      { key: "src", label: "Photo", type: "image" },
      { key: "featured", label: "Show in Featured Work", type: "bool" },
      { key: "in_gallery", label: "Show on main gallery page", type: "bool" },
      { key: "featured_order", label: "Featured position", type: "number" },
      { key: "photo_key", label: "Internal key" },
    ] satisfies FieldSpec[],
  },
  {
    id: "services",
    panel: "content",
    label: "Services",
    kind: "list" as const,
    table: "services",
    itemLabel: "service",
    titleKey: "title",
    fields: [
      { key: "title", label: "Title" },
      { key: "subtitle", label: "Subtitle" },
      { key: "slug", label: "URL slug" },
      { key: "category_slug", label: "Gallery category", type: "category" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "image", label: "Image", type: "image" },
      { key: "includes", label: "What's included (one per line)", type: "list" },
      { key: "price_from", label: "Price line" },
    ] satisfies FieldSpec[],
  },
  {
    id: "edits",
    panel: "content",
    label: "Editing samples",
    kind: "list" as const,
    table: "edit_samples",
    itemLabel: "sample",
    titleKey: "title",
    fields: [
      { key: "title", label: "Title" },
      { key: "note", label: "Note", type: "textarea" },
      { key: "src_before", label: "Before photo (original)", type: "image" },
      { key: "src", label: "After photo (edited)", type: "image" },
    ] satisfies FieldSpec[],
  },
  {
    id: "stats",
    panel: "content",
    label: "Stats",
    kind: "list" as const,
    table: "stats",
    itemLabel: "stat",
    titleKey: "label",
    fields: [
      { key: "value", label: "Value" },
      { key: "label", label: "Label" },
    ] satisfies FieldSpec[],
  },
  {
    id: "testimonials",
    panel: "reviews",
    label: "Testimonials",
    kind: "list" as const,
    table: "testimonials",
    itemLabel: "review",
    titleKey: "name",
    fields: [
      { key: "name", label: "Name" },
      { key: "role", label: "Role / occasion" },
      { key: "quote", label: "Quote", type: "textarea" },
      { key: "rating", label: "Rating (1–5)", type: "number" },
    ] satisfies FieldSpec[],
  },
  {
    id: "sections",
    panel: "content",
    label: "Page sections",
    kind: "list" as const,
    table: "page_sections",
    itemLabel: "section",
    titleKey: "label",
    allowAdd: false,
    note: "Reorder sections with the arrows, hide one with “Show on site”, or delete it entirely. The order here is the order they appear on the page.",
    fields: [
      { key: "label", label: "Section name (studio only)" },
      { key: "enabled", label: "Show on site", type: "bool" },
      { key: "eyebrow", label: "Small label above the heading" },
      { key: "heading", label: "Heading" },
      { key: "heading_accent", label: "Heading — second (italic) line" },
      { key: "intro", label: "Intro paragraph", type: "textarea" },
    ] satisfies FieldSpec[],
  },
  {
    id: "process",
    panel: "content",
    label: "Process steps",
    kind: "list" as const,
    table: "process_steps",
    itemLabel: "step",
    titleKey: "title",
    fields: [
      {
        key: "section_key",
        label: "Which Experience section",
        type: "select",
        options: [
          { value: "default", label: "Home & Services pages" },
          { value: "about", label: "About Me page" },
        ],
      },
      { key: "step", label: "Number" },
      { key: "title", label: "Title" },
      { key: "detail", label: "Detail", type: "textarea" },
    ] satisfies FieldSpec[],
  },
  {
    id: "socials",
    panel: "content",
    label: "Social links",
    kind: "list" as const,
    table: "socials",
    itemLabel: "link",
    titleKey: "name",
    fields: [
      { key: "name", label: "Name" },
      { key: "href", label: "URL" },
      { key: "icon", label: "Built-in icon (instagram, facebook, twitter, flickr)" },
      {
        key: "icon_url",
        label: "Custom icon (SVG or PNG — recoloured and resized automatically)",
        type: "image",
      },
    ] satisfies FieldSpec[],
  },
  {
    id: "templates",
    panel: "backup",
    label: "Templates",
    kind: "templates" as const,
    table: "site_versions",
    fields: [] satisfies FieldSpec[],
  },
  {
    id: "history",
    panel: "backup",
    label: "History",
    kind: "history" as const,
    table: "site_versions",
    fields: [] satisfies FieldSpec[],
  },
  {
    id: "storage",
    panel: "backup",
    label: "Storage cleanup",
    kind: "storage" as const,
    table: "photos",
    fields: [] satisfies FieldSpec[],
  },
  {
    id: "audit",
    panel: "stats",
    label: "Image visibility",
    kind: "audit" as const,
    table: "photos",
    fields: [] satisfies FieldSpec[],
  },
];

const PANELS = [
  { id: "content", label: "Content Studio", hint: "Wording, look and feel of every page" },
  { id: "gallery", label: "Gallery Management", hint: "Photos, categories and privacy" },
  { id: "links", label: "Link Generator", hint: "Shareable links with their own previews" },
  { id: "users", label: "Admin & Users", hint: "Who can sign in to this studio" },
  { id: "reviews", label: "Review Management", hint: "Client reviews and testimonials" },
  { id: "seo", label: "SEO", hint: "Titles, descriptions and social previews" },
  { id: "stats", label: "Statistics", hint: "Traffic, visitors and image visibility" },
  {
    id: "backup",
    label: "Templates & History",
    hint: "Templates, version history and storage cleanup",
  },
  { id: "forms", label: "Forms", hint: "Where enquiries are delivered" },
] as const;

/** Remember which panel/section you were on, so a reload lands back there. */
function readPosition(): { panel: string; section: string } | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  const [panel, section] = hash.split("/");
  const found = SECTIONS.find((s) => s.panel === panel && s.id === section);
  if (found) return { panel: found.panel, section: found.id };
  try {
    const saved = window.localStorage.getItem("studio:position");
    if (saved) {
      const parsed = JSON.parse(saved) as { panel?: string; section?: string };
      const hit = SECTIONS.find((s) => s.panel === parsed.panel && s.id === parsed.section);
      if (hit) return { panel: hit.panel, section: hit.id };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function AdminPage() {
  const [panel, setPanel] = useState<string>("content");
  const [active, setActive] = useState(SECTIONS[0]!.id);
  const [positionReady, setPositionReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const pos = readPosition();
    if (pos) {
      setPanel(pos.panel);
      setActive(pos.section);
    }
    setPositionReady(true);
  }, []);

  useEffect(() => {
    if (!positionReady || typeof window === "undefined") return;
    const value = `${panel}/${active}`;
    window.history.replaceState(null, "", `${window.location.pathname}#${value}`);
    try {
      window.localStorage.setItem("studio:position", JSON.stringify({ panel, section: active }));
    } catch {
      /* ignore */
    }
  }, [panel, active, positionReady]);

  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setIsAdmin(false);
      const { data: roles } = await supabase
        .from("user_roles" as never)
        .select("role")
        .eq("user_id", data.user.id);
      setIsAdmin(((roles ?? []) as { role: string }[]).some((r) => r.role === "admin"));
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sectionsInPanel = SECTIONS.filter((s) => s.panel === panel);
  const section = sectionsInPanel.find((s) => s.id === active) ?? sectionsInPanel[0]!;

  return (
    <div className="mx-auto max-w-6xl px-6 pb-28 pt-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Content studio</p>
          <h1 className="mt-3 font-display text-[clamp(2rem,5vw,3.25rem)] leading-tight">
            Edit your website
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void router.invalidate();
              toast.success("Site refreshed with your latest content");
            }}
            className="border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground"
          >
            Refresh site
          </button>
          <Link
            to="/"
            className="border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground"
          >
            View site
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            className="border border-hairline px-4 py-2 text-[0.625rem] tracking-[0.2em] uppercase transition-colors hover:border-foreground"
          >
            Sign out
          </button>
        </div>
      </div>

      {isAdmin === false ? (
        <p className="mt-10 border border-hairline p-6 text-sm text-muted-foreground">
          Your account doesn't have studio access yet. The first account created becomes the
          administrator — if someone else set this up, ask them to grant you access.
        </p>
      ) : null}

      <div className="mt-12 grid gap-10 lg:grid-cols-[15rem_1fr]">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <p className="eyebrow mb-4">Panels</p>
          <div className="flex flex-wrap gap-2 lg:flex-col">
            {PANELS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPanel(p.id);
                  const first = SECTIONS.find((s) => s.panel === p.id);
                  if (first) setActive(first.id);
                }}
                className={
                  "border px-4 py-3 text-left text-[0.6875rem] tracking-[0.18em] uppercase transition-colors " +
                  (panel === p.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-hairline text-muted-foreground hover:border-foreground hover:text-foreground")
                }
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-5 hidden text-xs leading-relaxed text-muted-foreground lg:block">
            {PANELS.find((p) => p.id === panel)?.hint}
          </p>
        </aside>

        <div className="min-w-0">
          <nav className="flex flex-wrap gap-x-6 gap-y-3 border-b border-hairline pb-4">
            {sectionsInPanel.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                className={
                  "text-[0.6875rem] tracking-[0.24em] uppercase transition-colors " +
                  (s.id === active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {s.label}
              </button>
            ))}
          </nav>

          {panel !== "backup" ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border border-hairline p-4">
              <TemplateBar scope={`panel:${panel}`} label="This panel" />
              <TemplateBar scope={`section:${section.id}`} label="This section" />
            </div>
          ) : null}



      <div className="mt-12">
        {section.kind === "storage" ? (
          <StorageCleanup />
        ) : section.kind === "templates" ? (
          <TemplatesStudio />
        ) : section.kind === "history" ? (
          <HistoryPanel />
        ) : section.kind === "grids" ? (
          <GridDefaultsStudio />
        ) : section.kind === "analytics" ? (
          <AnalyticsDashboard />
        ) : section.kind === "audit" ? (
          <VisibilityAudit />
        ) : section.kind === "theme" ? (
          <ThemeStudio />
        ) : section.kind === "type" ? (
          <TypographyStudio />
        ) : section.kind === "logos" ? (
          <LogoStudio />
        ) : section.kind === "copy" ? (
          <CopyEditor />
        ) : section.kind === "contrast" ? (
          <TextContrastStudio />
        ) : section.kind === "share" ? (
          <ShareLinks />
        ) : section.kind === "users" ? (
          <UserManagement />
        ) : section.kind === "reviews" ? (
          <ReviewModeration />
        ) : section.kind === "single" ? (
          <SingletonEditor
            table={section.table}
            fields={section.fields}
            note={"note" in section ? section.note : undefined}
          />
        ) : (
          <>
            {section.id === "seo" ? <SeoPageSync /> : null}
            <ListEditor
            key={section.id}
            table={section.table}
            fields={section.fields}
            itemLabel={(section as { itemLabel?: string }).itemLabel ?? "item"}
            titleKey={(section as { titleKey?: string }).titleKey ?? "label"}
            allowAdd={(section as { allowAdd?: boolean }).allowAdd ?? true}
            note={(section as { note?: string }).note}
            columns={
              section.table === "testimonials"
                ? "id,name,role,occasion,quote,rating,images,status,sort_order"
                : undefined
            }
            />
          </>
        )}
          </div>
        </div>
      </div>


      <p className="mt-16 text-xs leading-relaxed text-muted-foreground">
        Changes are saved straight to your site. Use “Refresh site” (or reload a page) to see them
        live.
      </p>
    </div>
  );
}
