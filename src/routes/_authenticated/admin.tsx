import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ListEditor, SingletonEditor, type FieldSpec } from "@/components/admin/ContentEditor";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Content Studio | Shutter Ram" },
      { name: "description", content: "Private content studio for editing the Shutter Ram website." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Content Studio | Shutter Ram" },
      { property: "og:description", content: "Private content studio for the Shutter Ram website." },
    ],
  }),
  component: AdminPage,
});

const SECTIONS = [
  {
    id: "site",
    label: "Site & About",
    kind: "single" as const,
    table: "settings",
    fields: [
      { key: "name", label: "Studio name" },
      { key: "tagline", label: "Tagline" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "location", label: "Location line" },
      { key: "form_endpoint", label: "Form endpoint URL", placeholder: "Formspree / Basin / Getform URL" },
      { key: "about_short", label: "About — short paragraph", type: "textarea" },
      { key: "about_long", label: "About — long (one paragraph per line)", type: "list" },
      { key: "budget_ranges", label: "Quote form: budget options", type: "list" },
      { key: "hour_options", label: "Quote form: hours options", type: "list" },
    ] satisfies FieldSpec[],
  },
  {
    id: "hero",
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
      { key: "hero", label: "Hero image", type: "image" },
    ] satisfies FieldSpec[],
  },
  {
    id: "photos",
    label: "Photos",
    kind: "list" as const,
    table: "photos",
    itemLabel: "photo",
    titleKey: "caption",
    fields: [
      { key: "caption", label: "Caption" },
      { key: "category_slug", label: "Category slug" },
      { key: "src", label: "Photo", type: "image" },
      { key: "featured", label: "Show in Featured Work", type: "bool" },
      { key: "featured_order", label: "Featured position", type: "number" },
      { key: "photo_key", label: "Internal key" },
    ] satisfies FieldSpec[],
  },
  {
    id: "services",
    label: "Services",
    kind: "list" as const,
    table: "services",
    itemLabel: "service",
    titleKey: "title",
    fields: [
      { key: "title", label: "Title" },
      { key: "subtitle", label: "Subtitle" },
      { key: "slug", label: "URL slug" },
      { key: "category_slug", label: "Gallery category slug" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "image", label: "Image", type: "image" },
      { key: "includes", label: "What's included (one per line)", type: "list" },
      { key: "price_from", label: "Price line" },
    ] satisfies FieldSpec[],
  },
  {
    id: "edits",
    label: "Editing samples",
    kind: "list" as const,
    table: "edit_samples",
    itemLabel: "sample",
    titleKey: "title",
    fields: [
      { key: "title", label: "Title" },
      { key: "note", label: "Note", type: "textarea" },
      { key: "src", label: "Image", type: "image" },
    ] satisfies FieldSpec[],
  },
  {
    id: "stats",
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
    id: "experience",
    label: "Experience",
    kind: "list" as const,
    table: "experience",
    itemLabel: "entry",
    titleKey: "role",
    fields: [
      { key: "period", label: "Period" },
      { key: "role", label: "Role" },
      { key: "place", label: "Place" },
      { key: "detail", label: "Detail", type: "textarea" },
    ] satisfies FieldSpec[],
  },
  {
    id: "testimonials",
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
    id: "process",
    label: "Process steps",
    kind: "list" as const,
    table: "process_steps",
    itemLabel: "step",
    titleKey: "title",
    fields: [
      { key: "step", label: "Number" },
      { key: "title", label: "Title" },
      { key: "detail", label: "Detail", type: "textarea" },
    ] satisfies FieldSpec[],
  },
  {
    id: "socials",
    label: "Social links",
    kind: "list" as const,
    table: "socials",
    itemLabel: "link",
    titleKey: "name",
    fields: [
      { key: "name", label: "Name" },
      { key: "href", label: "URL" },
      { key: "icon", label: "Icon (instagram, facebook, twitter, flickr)" },
    ] satisfies FieldSpec[],
  },
];

function AdminPage() {
  const [active, setActive] = useState(SECTIONS[0]!.id);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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

  const section = SECTIONS.find((s) => s.id === active)!;

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

      <nav className="mt-12 flex flex-wrap gap-x-6 gap-y-3 border-b border-hairline pb-4">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(s.id)}
            className={
              "text-[0.6875rem] tracking-[0.24em] uppercase transition-colors " +
              (s.id === active ? "text-foreground" : "text-muted-foreground hover:text-foreground")
            }
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="mt-12">
        {section.kind === "single" ? (
          <SingletonEditor table={section.table} fields={section.fields} />
        ) : (
          <ListEditor
            key={section.id}
            table={section.table}
            fields={section.fields}
            itemLabel={section.itemLabel}
            titleKey={section.titleKey}
          />
        )}
      </div>

      <p className="mt-16 text-xs leading-relaxed text-muted-foreground">
        Changes are saved straight to your site. Use “Refresh site” (or reload a page) to see them
        live.
      </p>
    </div>
  );
}
