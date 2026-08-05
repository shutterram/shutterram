// ---------------------------------------------------------------------------
// Shutter Ram — live site content.
//
// Values below start as the built-in defaults (see ./portfolio.defaults.ts) and
// are replaced at runtime with whatever is stored in the database, so the admin
// panel can edit every piece of copy and every image on the site.
// ---------------------------------------------------------------------------

import type { SiteContentPayload, Row } from "@/lib/site-content.functions";
import {
  defaultSite,
  defaultCategories,
  defaultPhotos,
  defaultFeaturedIds,
  defaultEditSamples,
  defaultServices,
  defaultStats,
  defaultExperience,
  defaultTestimonials,
  defaultProcessSteps,
  defaultAboutShort,
  defaultAboutLong,
  defaultBudgetRanges,
  defaultHourOptions,
  defaultPageSections,
  defaultLoader,
} from "./portfolio.defaults";

export { unedited } from "./portfolio.defaults";
export type {
  SiteInfo,
  CategorySlug,
  Category,
  Photo,
  EditSample,
  Service,
  Stat,
  ExperienceItem,
  Testimonial,
  ProcessStep,
  SectionConfig,
  LoaderConfig,
} from "./portfolio.defaults";

import type {
  SiteInfo,
  Category,
  Photo,
  EditSample,
  Service,
  Stat,
  ExperienceItem,
  Testimonial,
  ProcessStep,
  CategorySlug,
  SectionConfig,
  LoaderConfig,
} from "./portfolio.defaults";

// Live bindings — reassigned by applyContent().
export let site: SiteInfo = defaultSite;
export let categories: Category[] = defaultCategories;
export let photos: Photo[] = defaultPhotos;
export let featuredIds: string[] = [...defaultFeaturedIds];
export let editSamples: EditSample[] = defaultEditSamples;
export let services: Service[] = defaultServices;
export let stats: Stat[] = defaultStats;
export let experience: ExperienceItem[] = defaultExperience;
export let testimonials: Testimonial[] = defaultTestimonials;
export let processSteps: ProcessStep[] = defaultProcessSteps;
export let aboutProcessSteps: ProcessStep[] = defaultProcessSteps;
export let pageSections: SectionConfig[] = defaultPageSections;
export let aboutShort: string = defaultAboutShort;
export let aboutLong: string[] = [...defaultAboutLong];
export let budgetRanges: string[] = [...defaultBudgetRanges];
export let hourOptions: string[] = [...defaultHourOptions];
export let loader: LoaderConfig = defaultLoader;

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0) => (typeof v === "number" ? v : fallback);
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** Replace the live content with rows loaded from the database. */
export function applyContent(payload: SiteContentPayload | null | undefined) {
  if (!payload) return;

  const s = payload.settings;
  if (s) {
    site = {
      name: str(s["name"], defaultSite.name),
      tagline: str(s["tagline"], defaultSite.tagline),
      email: str(s["email"], defaultSite.email),
      phone: str(s["phone"], defaultSite.phone),
      location: str(s["location"], defaultSite.location),
      formEndpoint: str(s["form_endpoint"]),
      socials: payload.socials.length
        ? payload.socials.map((r: Row) => ({
            name: str(r["name"]),
            href: str(r["href"]),
            icon: str(r["icon"], "flickr"),
            iconUrl: str(r["icon_url"]),
          }))
        : defaultSite.socials,
    };
    loader = {
      shape: str(s["loader_shape"], defaultLoader.shape) === "circle" ? "circle" : "square",
      size: num(s["loader_size"], defaultLoader.size) || defaultLoader.size,
      pulseScale: num(s["loader_pulse_scale"], defaultLoader.pulseScale) || defaultLoader.pulseScale,
      fade: str(s["loader_fade"], defaultLoader.fade) === "in" ? "in" : "out",
    };
    aboutShort = str(s["about_short"], defaultAboutShort);
    const long = list(s["about_long"]);
    if (long.length) aboutLong = long;
    const budgets = list(s["budget_ranges"]);
    if (budgets.length) budgetRanges = budgets;
    const hours = list(s["hour_options"]);
    if (hours.length) hourOptions = hours;
  } else if (payload.socials.length) {
    site = {
      ...site,
      socials: payload.socials.map((r: Row) => ({
        name: str(r["name"]),
        href: str(r["href"]),
        icon: str(r["icon"], "flickr"),
        iconUrl: str(r["icon_url"]),
      })),
    };
  }

  if (payload.categories.length) {
    categories = payload.categories.map((r: Row) => ({
      slug: str(r["slug"]),
      title: str(r["title"]),
      label: str(r["label"]),
      tagline: str(r["tagline"]),
      hero: str(r["hero"]),
    }));
  }

  if (payload.photos.length) {
    photos = payload.photos.map((r: Row) => ({
      id: str(r["photo_key"]),
      category: str(r["category_slug"]) as CategorySlug,
      caption: str(r["caption"]),
      src: str(r["src"]),
    }));
    featuredIds = payload.photos
      .filter((r: Row) => r["featured"] === true)
      .sort((a: Row, b: Row) => num(a["featured_order"]) - num(b["featured_order"]))
      .map((r: Row) => str(r["photo_key"]));
  }

  if (payload.edit_samples.length) {
    editSamples = payload.edit_samples.map((r: Row, i) => ({
      id: str(r["id"], `ed${i}`),
      title: str(r["title"]),
      note: str(r["note"]),
      src: str(r["src"]) || "/placeholders/after.svg",
      srcBefore: str(r["src_before"]) || "/placeholders/before.svg",
    }));
  }

  if (payload.services.length) {
    services = payload.services.map((r: Row) => ({
      slug: str(r["slug"]),
      title: str(r["title"]),
      subtitle: str(r["subtitle"]),
      description: str(r["description"]),
      image: str(r["image"]),
      category: str(r["category_slug"]) as CategorySlug,
      includes: list(r["includes"]),
      from: str(r["price_from"]),
    }));
  }

  if (payload.stats.length) {
    stats = payload.stats.map((r: Row) => ({
      value: str(r["value"]),
      label: str(r["label"]),
    }));
  }

  if (payload.experience.length) {
    experience = payload.experience.map((r: Row) => ({
      period: str(r["period"]),
      role: str(r["role"]),
      place: str(r["place"]),
      detail: str(r["detail"]),
    }));
  }

  if (payload.testimonials.length) {
    testimonials = payload.testimonials.map((r: Row, i) => ({
      id: str(r["id"], `t${i}`),
      quote: str(r["quote"]),
      name: str(r["name"]),
      role: str(r["role"]),
      rating: num(r["rating"], 5),
    }));
  }

  if (payload.process_steps.length) {
    const toStep = (r: Row): ProcessStep => ({
      step: str(r["step"]),
      title: str(r["title"]),
      detail: str(r["detail"]),
    });
    const main = payload.process_steps.filter((r: Row) => str(r["section_key"], "default") !== "about");
    const about = payload.process_steps.filter((r: Row) => str(r["section_key"]) === "about");
    if (main.length) processSteps = main.map(toStep);
    aboutProcessSteps = about.length ? about.map(toStep) : processSteps;
  }

  if (payload.page_sections.length) {
    pageSections = payload.page_sections.map((r: Row) => ({
      page: str(r["page"]),
      key: str(r["section_key"]),
      label: str(r["label"]),
      eyebrow: str(r["eyebrow"]),
      heading: str(r["heading"]),
      headingAccent: str(r["heading_accent"]),
      intro: str(r["intro"]),
      enabled: r["enabled"] !== false,
    }));
  }
}

/** Enabled sections for a page, in the order set in the content studio. */
export const sectionsFor = (page: string) => pageSections.filter((s) => s.page === page && s.enabled);
/** A single enabled section, or null when it is hidden / deleted. */
export const sectionFor = (page: string, key: string) =>
  pageSections.find((s) => s.page === page && s.key === key && s.enabled) ?? null;

export const photoById = (id: string) => photos.find((p) => p.id === id);
export const photosByCategory = (slug: CategorySlug) =>
  photos.filter((p) => p.category === slug);
export const categoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);
