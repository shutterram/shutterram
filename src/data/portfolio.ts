// ---------------------------------------------------------------------------
// Shutter Ram — live site content.
//
// Values below start as the built-in defaults (see ./portfolio.defaults.ts) and
// are replaced at runtime with whatever is stored in the database, so the admin
// panel can edit every piece of copy and every image on the site.
// ---------------------------------------------------------------------------

import type { CSSProperties } from "react";
import type { SiteContentPayload, Row } from "@/lib/site-content.functions";
import type { ThemeToken } from "@/lib/theme-css";
import {
  defaultTypography,
  type SiteFont,
  type TypeToken,
  type Typography,
} from "@/lib/type-css";
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
  defaultGlow,
  defaultLogos,
  defaultCopy,
  emptyPlacement,
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
  GlowConfig,
  LogoSet,
  LogoSlot,
  LogoPlacement,
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
  GlowConfig,
  LogoSet,
  LogoSlot,
  LogoPlacement,
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
export let glow: GlowConfig = defaultGlow;
export let logos: LogoSet = defaultLogos;
export let copyMap: Record<string, string> = { ...defaultCopy };
export let themeTokens: ThemeToken[] = [];
export let typeTokens: TypeToken[] = [];
export let siteFonts: SiteFont[] = [];
export let typography: Typography = defaultTypography;
export let aboutImage: string =
  "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1000&q=80";
/** Studio switches for text that sits on top of a photo. */
export interface OverlayTextSetting {
  inverted: boolean;
  shadowDark: boolean;
  shadowLight: boolean;
}
export let textInverts: Record<string, OverlayTextSetting> = {};
/** Per-image drop-shadow switches, keyed by the served image path. */
export interface ImageGlow {
  dark: boolean;
  light: boolean;
  colorDark: string;
  colorLight: string;
  strengthDark: number;
  strengthLight: number;
  spread: number;
}
export let imageShadows: Record<string, ImageGlow> = {};
/** Default column counts per page and device, set in the studio. */
export type GridPage = "home" | "gallery" | "category";
export type GridDevice = "desktop" | "tablet" | "mobile";
export type GridDefaults = Record<GridPage, Record<GridDevice, string>>;
const blankGrid: GridDefaults = {
  home: { desktop: "2", tablet: "2", mobile: "2" },
  gallery: { desktop: "2", tablet: "2", mobile: "2" },
  category: { desktop: "2", tablet: "2", mobile: "2" },
};
export let gridDefaults: GridDefaults = blankGrid;
/** Studio switch: show the little "View" caption next to the grid pickers. */
export let showViewLabel = true;
/** Non-null when the visitor opened a private share link. */
export let shareContext: { scope: string; category_slug: string } | null = null;

/**
 * Classes for text that sits on top of a photo: flips the colour when the
 * studio marks it as inverted, and adds a soft drop shadow in whichever
 * mode (dark / light) the studio switched the shadow on for.
 */
export function invertClass(key: string): string {
  const s = textInverts[key];
  if (!s) return "";
  return [
    s.inverted ? "text-flip" : "",
    s.shadowDark ? "text-shade-dark" : "",
    s.shadowLight ? "text-shade-light" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Studio glow settings for one specific image, or null when it has none. */
export function imageGlowOf(src: string | null | undefined): ImageGlow | null {
  if (!src) return null;
  const served = src.split("/api/public/img/")[1]?.split("?")[0];
  const key = served ?? src.trim().slice(0, 400);
  const s = key ? imageShadows[key] : undefined;
  if (!s || (!s.dark && !s.light)) return null;
  return s;
}

/**
 * Class for the wide, blurred glow that sits behind text overlaying one
 * specific image. Pair it with {@link imageGlowStyle} for colour + intensity.
 */
export function imageShadowClass(src: string | null | undefined): string {
  return imageGlowOf(src) ? "text-glow" : "";
}

/** Colour / intensity / spread variables for the per-image text glow. */
export function imageGlowStyle(src: string | null | undefined): CSSProperties {
  const s = imageGlowOf(src);
  if (!s) return {};
  return {
    ["--tg-color-dark" as string]: s.colorDark,
    ["--tg-color-light" as string]: s.colorLight,
    ["--tg-alpha-dark" as string]: s.dark ? s.strengthDark : 0,
    ["--tg-alpha-light" as string]: s.light ? s.strengthLight : 0,
    ["--tg-spread" as string]: `${s.spread}px`,
  } as CSSProperties;
}

/** Editable label lookup — falls back to the built-in wording. */
export function t(key: string, fallback?: string): string {
  const value = copyMap[key];
  return value !== undefined && value !== "" ? value : (fallback ?? defaultCopy[key] ?? "");
}

/** Size / nudge for a logo slot, as inline styles. */
export function logoStyle(slot: LogoSlot): CSSProperties {
  const p: LogoPlacement = logos.layout?.[slot] ?? emptyPlacement;
  const style: CSSProperties = {};
  if (p.height > 0) style.height = `${p.height}px`;
  if (p.offsetX || p.offsetY) style.transform = `translate(${p.offsetX}px, ${p.offsetY}px)`;
  return style;
}

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
      // The form endpoint is admin-only and never sent to the browser.
      formEndpoint: "",
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
    glow = {
      size: num(s["glow_size"], defaultGlow.size) || defaultGlow.size,
      blend: str(s["glow_blend"], defaultGlow.blend) || defaultGlow.blend,
      softness: Math.max(10, Math.min(100, num(s["glow_softness"], defaultGlow.softness))),
    };
    logos = {
      header: str(s["logo_header"]),
      footer: str(s["logo_footer"]),
      mobile: str(s["logo_mobile"]),
      loader: str(s["logo_loader"]),
      favicon: str(s["logo_favicon"]),
      invert: s["logo_invert"] !== false,
      layout: {
        header: {
          height: num(s["logo_header_height"]),
          offsetX: num(s["logo_header_offset_x"]),
          offsetY: num(s["logo_header_offset_y"]),
        },
        mobile: {
          height: num(s["logo_mobile_height"]),
          offsetX: num(s["logo_mobile_offset_x"]),
          offsetY: num(s["logo_mobile_offset_y"]),
        },
        footer: {
          height: num(s["logo_footer_height"]),
          offsetX: num(s["logo_footer_offset_x"]),
          offsetY: num(s["logo_footer_offset_y"]),
        },
        loader: {
          height: num(s["logo_loader_height"]),
          offsetX: num(s["logo_loader_offset_x"]),
          offsetY: num(s["logo_loader_offset_y"]),
        },
      },
    };
    typography = {
      heading: str(s["font_heading"], defaultTypography.heading),
      body: str(s["font_body"], defaultTypography.body),
      scaleDesktop: num(s["font_scale_desktop"], 1) || 1,
      scaleTablet: num(s["font_scale_tablet"], 1) || 1,
      scaleMobile: num(s["font_scale_mobile"], 1) || 1,
    };
    aboutImage = str(s["about_image"], aboutImage) || aboutImage;
    const col = (v: unknown) => {
      const raw = str(v, "2");
      return raw === "1" || raw === "2" || raw === "3" ? raw : "2";
    };
    gridDefaults = {
      home: {
        desktop: col(s["grid_home_desktop"]),
        tablet: col(s["grid_home_tablet"]),
        mobile: col(s["grid_home_mobile"]),
      },
      gallery: {
        desktop: col(s["grid_gallery_desktop"]),
        tablet: col(s["grid_gallery_tablet"]),
        mobile: col(s["grid_gallery_mobile"]),
      },
      category: {
        desktop: col(s["grid_category_desktop"]),
        tablet: col(s["grid_category_tablet"]),
        mobile: col(s["grid_category_mobile"]),
      },
    };
    showViewLabel = s["show_view_label"] !== false;
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
      cover: str(r["cover"]),
      showInHero: r["show_in_hero"] !== false,
    }));
  }

  if (payload.photos.length) {
    photos = payload.photos.map((r: Row) => ({
      id: str(r["photo_key"]),
      category: str(r["category_slug"]) as CategorySlug,
      caption: str(r["caption"]),
      src: str(r["src"]) || "/placeholders/photo.svg",
      inGallery: r["in_gallery"] !== false,
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
      occasion: str(r["occasion"]),
      images: list(r["images"]),
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

  if (payload.site_copy.length) {
    const next = { ...defaultCopy };
    for (const r of payload.site_copy) {
      const key = str(r["key"]);
      if (key) next[key] = str(r["value"]);
    }
    copyMap = next;
  }

  themeTokens = (payload.theme_tokens ?? []).map((r: Row) => ({
    token: str(r["token"]),
    label: str(r["label"]),
    group: str(r["group_label"], "General"),
    hint: str(r["hint"]),
    darkValue: str(r["dark_value"], "#000000"),
    darkOpacity: num(r["dark_opacity"], 100),
    lightValue: str(r["light_value"], "#ffffff"),
    lightOpacity: num(r["light_opacity"], 100),
  }));

  typeTokens = (payload.type_tokens ?? []).map((r: Row) => ({
    role: str(r["role"]),
    label: str(r["label"]),
    group: str(r["group_label"], "General"),
    hint: str(r["hint"]),
    selector: str(r["selector"]),
    fontFamily: str(r["font_family"]),
    weight: str(r["weight"]),
    letterSpacing: str(r["letter_spacing"]),
    lineHeight: str(r["line_height"]),
    textTransform: str(r["text_transform"]),
    sizeDesktop: str(r["size_desktop"]),
    sizeTablet: str(r["size_tablet"]),
    sizeMobile: str(r["size_mobile"]),
    sampleText: str(r["sample_text"]),
  }));

  textInverts = Object.fromEntries(
    (payload.text_inverts ?? []).map((r: Row) => [
      str(r["key"]),
      {
        inverted: r["inverted"] === true,
        shadowDark: r["shadow_dark"] === true,
        shadowLight: r["shadow_light"] === true,
      },
    ]),
  );
  imageShadows = Object.fromEntries(
    (payload.image_shadows ?? []).map((r: Row) => [
      str(r["path"]),
      {
        dark: r["shadow_dark"] === true,
        light: r["shadow_light"] === true,
        colorDark: str(r["glow_color_dark"], "#000000"),
        colorLight: str(r["glow_color_light"], "#ffffff"),
        strengthDark: Number(r["glow_strength_dark"] ?? 55),
        strengthLight: Number(r["glow_strength_light"] ?? 55),
        spread: Number(r["glow_spread"] ?? 140),
      },
    ]),
  );
  shareContext = payload.share ?? null;

  siteFonts = (payload.custom_fonts ?? []).map((r: Row) => ({
    id: str(r["id"]),
    family: str(r["family"]),
    source: str(r["source"], "google"),
    cssUrl: str(r["css_url"]),
    weights: list(r["weights"]),
    styles: list(r["styles"]),
  }));
}

/** Enabled sections for a page, in the order set in the content studio. */
export const sectionsFor = (page: string) => pageSections.filter((s) => s.page === page && s.enabled);
/** A single enabled section, or null when it is hidden / deleted. */
export const sectionFor = (page: string, key: string) =>
  pageSections.find((s) => s.page === page && s.key === key && s.enabled) ?? null;

export const photoById = (id: string) => photos.find((p) => p.id === id);
export const photosByCategory = (slug: CategorySlug) =>
  photos.filter((p) => p.category === slug);
/** Categories that should appear as slides in the home hero. */
export const heroCategories = () => {
  const shown = categories.filter((c) => c.showInHero !== false);
  return shown.length ? shown : categories;
};

export const categoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);
