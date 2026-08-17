/**
 * What a template covers. Every scope maps to a set of content tables so the
 * studio can download / load the whole site, one panel, or a single section.
 */
export interface TemplateScope {
  id: string;
  label: string;
  group: "Everything" | "Panels" | "Sections";
  tables: string[];
}

const CONTENT_TABLES = [
  "settings",
  "site_copy",
  "theme_tokens",
  "type_tokens",
  "custom_fonts",
  "text_inverts",
  "image_settings",
  "categories",
  "services",
  "edit_samples",
  "stats",
  "experience",
  "page_sections",
  "process_steps",
  "socials",
];

export const TEMPLATE_SCOPES: TemplateScope[] = [
  {
    id: "all",
    label: "Entire site",
    group: "Everything",
    tables: [
      ...CONTENT_TABLES,
      "photos",
      "testimonials",
      "seo_pages",
      "admin_settings",
    ],
  },

  { id: "panel:content", label: "Content Studio", group: "Panels", tables: CONTENT_TABLES },
  {
    id: "panel:gallery",
    label: "Gallery Management",
    group: "Panels",
    tables: ["photos", "categories", "image_settings"],
  },
  { id: "panel:reviews", label: "Review Management", group: "Panels", tables: ["testimonials"] },
  { id: "panel:seo", label: "SEO", group: "Panels", tables: ["seo_pages"] },
  { id: "panel:forms", label: "Forms", group: "Panels", tables: ["admin_settings"] },

  { id: "section:site", label: "Site & About", group: "Sections", tables: ["settings"] },
  { id: "section:grids", label: "Grid defaults", group: "Sections", tables: ["settings"] },
  { id: "section:logos", label: "Logos", group: "Sections", tables: ["settings"] },
  { id: "section:colours", label: "Colours", group: "Sections", tables: ["theme_tokens"] },
  {
    id: "section:fonts",
    label: "Fonts",
    group: "Sections",
    tables: ["type_tokens", "custom_fonts"],
  },
  { id: "section:copy", label: "Wording", group: "Sections", tables: ["site_copy"] },
  {
    id: "section:contrast",
    label: "Text contrast & glow",
    group: "Sections",
    tables: ["text_inverts", "image_settings"],
  },
  { id: "section:hero", label: "Hero categories", group: "Sections", tables: ["categories"] },
  {
    id: "section:photos",
    label: "Photos",
    group: "Sections",
    tables: ["photos", "image_settings"],
  },
  { id: "section:services", label: "Services", group: "Sections", tables: ["services"] },
  { id: "section:edits", label: "Editing samples", group: "Sections", tables: ["edit_samples"] },
  { id: "section:stats", label: "Stats", group: "Sections", tables: ["stats"] },
  { id: "section:experience", label: "Experience", group: "Sections", tables: ["experience"] },
  { id: "section:sections", label: "Page sections", group: "Sections", tables: ["page_sections"] },
  { id: "section:process", label: "Process steps", group: "Sections", tables: ["process_steps"] },
  { id: "section:socials", label: "Social links", group: "Sections", tables: ["socials"] },
  { id: "section:testimonials", label: "Testimonials", group: "Sections", tables: ["testimonials"] },
  { id: "section:seo", label: "SEO pages", group: "Sections", tables: ["seo_pages"] },
];

export function scopeById(id: string): TemplateScope | undefined {
  return TEMPLATE_SCOPES.find((s) => s.id === id);
}

/** Friendly name for a table, used in the history timeline. */
export const TABLE_LABELS: Record<string, string> = {
  settings: "Site & About",
  admin_settings: "Form delivery",
  site_copy: "Wording",
  theme_tokens: "Colours",
  type_tokens: "Fonts",
  custom_fonts: "Font library",
  text_inverts: "Text contrast",
  image_settings: "Image settings",
  categories: "Categories",
  photos: "Photos",
  services: "Services",
  edit_samples: "Editing samples",
  stats: "Stats",
  experience: "Experience",
  testimonials: "Reviews",
  page_sections: "Page sections",
  process_steps: "Process steps",
  socials: "Social links",
  seo_pages: "SEO pages",
};
