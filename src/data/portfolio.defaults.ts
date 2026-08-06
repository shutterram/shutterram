// ---------------------------------------------------------------------------
// Shutter Ram — all site content lives here.
// Swap any `u("...")` id for your own image URL to replace a photo.
// ---------------------------------------------------------------------------

const u = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Same photo, rendered "straight out of camera": flat, cool, low contrast. */
export const unedited = (url: string) =>
  `${url}&sat=-55&con=-22&bri=-8&gam=-12`;

export interface SiteInfo {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  location: string;
  formEndpoint: string;
  socials: { name: string; href: string; icon: string; iconUrl?: string }[];
}

export const defaultSite: SiteInfo = {
  name: "Shutter Ram",
  tagline: "Clicking today — for a memory that lives forever",
  email: "hello@shutterram.com",
  phone: "+1 (555) 014-2280",
  location: "Based in New York — available across New Jersey, New York and further",
  /**
   * Third-party form endpoint (Formspree, Basin, Getform, FormSubmit…).
   * Paste your endpoint URL here and submissions get emailed to you.
   * While it is empty, forms fall back to opening a pre-filled email draft.
   */
  formEndpoint: "",
  socials: [
    { name: "Instagram", href: "https://instagram.com/", icon: "instagram" },
    { name: "Flickr", href: "https://flickr.com/", icon: "flickr" },
    { name: "Facebook", href: "https://facebook.com/", icon: "facebook" },
    { name: "Twitter", href: "https://x.com/", icon: "twitter" },
  ],
};

export interface LoaderConfig {
  /** "square" or "circle" */
  shape: string;
  /** Size in px of the inner box that holds the logo. */
  size: number;
  /** How much larger the pulsing outline grows (1 = no growth). */
  pulseScale: number;
  /** "out" = fades 100 -> 0 while growing, "in" = fades 0 -> 100. */
  fade: string;
}

export interface GlowConfig {
  /** Diameter of the cursor light in px. */
  size: number;
  /** CSS mix-blend-mode used to blend the light with the page. */
  blend: string;
  /** How far out the light fades, 0–100 (higher = softer, wider falloff). */
  softness: number;
}

export const defaultGlow: GlowConfig = {
  size: 544,
  blend: "normal",
  softness: 68,
};

export const defaultLoader: LoaderConfig = {
  shape: "square",
  size: 72,
  pulseScale: 1.8,
  fade: "out",
};

export interface LogoSet {
  /** Logo used in the desktop/mobile site header. */
  header: string;
  /** Logo used in the footer lockup. */
  footer: string;
  /** Logo used at the top of the mobile navigation drawer. */
  mobile: string;
  /** Logo shown inside the loading screen. */
  loader: string;
  /** Browser tab icon. */
  favicon: string;
  /** Invert logo colours (on for dark artwork on this dark theme). */
  invert: boolean;
  /** Per-slot size (px height, 0 = use the built-in size) and nudge. */
  layout: Record<LogoSlot, LogoPlacement>;
}

export type LogoSlot = "header" | "footer" | "mobile" | "loader";

export interface LogoPlacement {
  height: number;
  offsetX: number;
  offsetY: number;
}

export const emptyPlacement: LogoPlacement = { height: 0, offsetX: 0, offsetY: 0 };

export const defaultLogos: LogoSet = {
  header: "",
  footer: "",
  mobile: "",
  loader: "",
  favicon: "",
  invert: true,
  layout: {
    header: { ...emptyPlacement },
    footer: { ...emptyPlacement },
    mobile: { ...emptyPlacement },
    loader: { ...emptyPlacement },
  },
};

/** Built-in fallbacks for every editable label on the site. */
export const defaultCopy: Record<string, string> = {
  "nav.home": "Home",
  "nav.gallery": "Gallery",
  "nav.services": "Services",
  "nav.about": "About Me",
  "nav.contact": "Contact",
  "nav.book": "Book Your Date",
  "nav.menu_open": "Menu",
  "nav.menu_close": "Close",
  "btn.view_more": "View More",
  "btn.view_less": "View Less",
  "btn.book_date": "Book Your Date",
  "btn.request_quote": "Request a Quote",
  "btn.start_conversation": "Start a Conversation",
  "btn.work_with_me": "Work with me",
  "btn.close": "Close",
  "gallery.eyebrow": "Previous Works",
  "gallery.title": "The Gallery",
  "gallery.intro":
    "Everything worth keeping from the last few years, in one place. Filter by category, or open any frame full screen and step through with the arrow keys.",
  "gallery.jump": "Jump to a category",
  "gallery.filter_all": "All",
  "about.eyebrow": "About Me",
  "about.title": "I'd rather wait for the real moment.",
  "about.image":
    "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1000&q=80",
  "about.kit_heading": "Kit, briefly",
  "about.kit_text":
    "Two mirrorless bodies, three primes, one very tired 24\u201370, and a pair of lights that only come out when the room refuses to cooperate.",
  "about.hello_heading": "Say hello",
  "contact.eyebrow": "Contact",
  "contact.title": "Let's talk about your day.",
  "contact.intro":
    "Tell me what you have in mind. I reply to every message personally, usually within a day.",
  "contact.tab_quote": "Request a Quote",
  "contact.tab_message": "Send a Message",
  "contact.submit_quote": "Send Quote Request",
  "contact.submit_message": "Send Message",
  "theme.to_light": "Switch to light mode",
  "theme.to_dark": "Switch to dark mode",
  "review.eyebrow": "Review link — clients only",
  "review.title": "How was your shoot?",
  "review.intro":
    "If you have two minutes, a few honest words go further than anything I could write about my own work. Thank you.",
  "review.rating_label": "Your rating",
  "review.photos_label": "Add photos (optional)",
  "review.submit": "Submit Review",
  "review.thanks": "Thank you \u2014 your review has been sent for approval.",
  "testimonial.photos_button": "See photos",
  "testimonial.modal_photos": "Photos from this shoot",
  "testimonial.read_more": "Click to read",
  "footer.nav_heading": "Navigation",
  "footer.categories_heading": "Categories",
  "footer.contact_heading": "Get in touch",
  "footer.rights": "All rights reserved.",
  "footer.blurb":
    "A one-person studio photographing weddings, brands and people who would rather be remembered honestly than perfectly.",
  "footer.note": "Every frame edited by hand",
  "loader.label": "Loading",
  "error.eyebrow": "Something went wrong",
  "error.title": "This page didn't load",
  "error.body": "The frame slipped. Try again, or head back to the homepage.",
  "error.retry": "Try again",
  "error.home": "Go home",
};

export type CategorySlug = string;

export interface Category {
  slug: CategorySlug;
  title: string;
  label: string;
  tagline: string;
  hero: string;
  /** Optional cover photo for the category page header (falls back to `hero`). */
  cover?: string;
}

export const defaultCategories: Category[] = [
  {
    slug: "wedding",
    title: "Wedding Photography",
    label: "Wedding",
    tagline: "The vows, the tears, the first dance — kept exactly as they felt.",
    hero: u("1519741497674-611481863552", 2000),
  },
  {
    slug: "corporate",
    title: "Corporate Photography",
    label: "Corporate",
    tagline: "Brand imagery with the composure of a boardroom and the eye of an artist.",
    hero: u("1497366811353-6870744d04b2", 2000),
  },
  {
    slug: "portrait",
    title: "Portrait Photography",
    label: "Portrait",
    tagline: "Quiet light, honest expression — a portrait that still looks like you.",
    hero: u("1544005313-94ddf0286df2", 2000),
  },
  {
    slug: "headshots",
    title: "Headshots Photography",
    label: "Headshots",
    tagline: "One frame that opens doors. Clean, confident, unmistakably yours.",
    hero: u("1560250097-0b93528c311a", 2000),
  },
  {
    slug: "events",
    title: "Event Photography",
    label: "Events",
    tagline: "From the first handshake to the last song, nothing slips past the lens.",
    hero: u("1492684223066-81342ee5ff30", 2000),
  },
  {
    slug: "product",
    title: "Product Photography",
    label: "Product",
    tagline: "Considered light on considered objects. Detail worth lingering over.",
    hero: u("1523275335684-37898b6baf30", 2000),
  },
];

export interface Photo {
  id: string;
  src: string;
  category: CategorySlug;
  caption: string;
  /** When false, the photo is hidden from the all-work gallery but still shows on its category page. */
  inGallery?: boolean;
}

export const defaultPhotos: Photo[] = [
  { id: "w1", category: "wedding", caption: "First look — Hudson Valley", src: u("1519741497674-611481863552") },
  { id: "w2", category: "wedding", caption: "The vows", src: u("1465495976277-4387d4b0b4c6") },
  { id: "w3", category: "wedding", caption: "Golden hour portraits", src: u("1511285560929-80b456fea0bc") },
  { id: "w4", category: "wedding", caption: "Reception, last dance", src: u("1522673607200-164d1b6ce486") },
  { id: "w5", category: "wedding", caption: "Details in lace", src: u("1583939003579-730e3918a45a") },
  { id: "w6", category: "wedding", caption: "Confetti exit", src: u("1519225421980-715cb0215aed") },

  { id: "c1", category: "corporate", caption: "Quarterly summit keynote", src: u("1497366811353-6870744d04b2") },
  { id: "c2", category: "corporate", caption: "Studio floor, mid-build", src: u("1497366216548-37526070297c") },
  { id: "c3", category: "corporate", caption: "Leadership sit-down", src: u("1521737711867-e3b97375f902") },
  { id: "c4", category: "corporate", caption: "Open plan, late shift", src: u("1524758631624-e2822e304c36") },
  { id: "c5", category: "corporate", caption: "Panel discussion", src: u("1531058020387-3be344556be6") },

  { id: "p1", category: "portrait", caption: "Window light study", src: u("1494790108377-be9c29b29330") },
  { id: "p2", category: "portrait", caption: "Winter series, no. 3", src: u("1506794778202-cad84cf45f1d") },
  { id: "p3", category: "portrait", caption: "Editorial, monochrome", src: u("1438761681033-6461ffad8d80") },
  { id: "p4", category: "portrait", caption: "On the rooftop", src: u("1552058544-f2b08422138a") },
  { id: "p5", category: "portrait", caption: "Available light", src: u("1517841905240-472988babdf9") },
  { id: "p6", category: "portrait", caption: "Studio no. 12", src: u("1573496359142-b8d87734a5a2") },

  { id: "h1", category: "headshots", caption: "Corporate headshot — grey seamless", src: u("1560250097-0b93528c311a") },
  { id: "h2", category: "headshots", caption: "Actor headshot", src: u("1519085360753-af0119f7cbe7") },
  { id: "h3", category: "headshots", caption: "Founder portrait", src: u("1507003211169-0a1dd7228f2d") },
  { id: "h4", category: "headshots", caption: "Team session", src: u("1500048993953-d23a436266cf") },
  { id: "h5", category: "headshots", caption: "Natural light headshot", src: u("1524504388940-b1c1722653e1") },

  { id: "e1", category: "events", caption: "Gala, main hall", src: u("1492684223066-81342ee5ff30") },
  { id: "e2", category: "events", caption: "Crowd at midnight", src: u("1493809842364-78817add7ffb") },
  { id: "e3", category: "events", caption: "Awards night", src: u("1511632765486-a01980e01a18") },
  { id: "e4", category: "events", caption: "Backstage", src: u("1454165804606-c3d57bc86b40") },
  { id: "e5", category: "events", caption: "Street festival", src: u("1517457373958-b7bdd4587205") },

  { id: "d1", category: "product", caption: "Chronograph, low key", src: u("1523275335684-37898b6baf30") },
  { id: "d2", category: "product", caption: "Ceramics on linen", src: u("1600880292203-757bb62b4baf") },
  { id: "d3", category: "product", caption: "Glassware study", src: u("1542744173-8e7e53415bb0") },
  { id: "d4", category: "product", caption: "Leather goods", src: u("1543269865-cbf427effbad") },
  { id: "d5", category: "product", caption: "Fragrance, hard light", src: u("1556761175-b413da4baf72") },
];

/** Curated subset shown in the home page Featured Work carousel. */
export const defaultFeaturedIds = [
  "w1", "p1", "c1", "h1", "e1", "d1", "w3", "p3", "c3", "h2", "e3", "d3", "w5", "p6", "e5",
];

export interface EditSample {
  id: string;
  title: string;
  note: string;
  /** The finished, edited frame. */
  src: string;
  /** The straight-out-of-camera frame shown on the left of the slider. */
  srcBefore: string;
}

/** Placeholder frames — replace both images from the studio. */
const BEFORE_PLACEHOLDER = "/placeholders/before.svg";
const AFTER_PLACEHOLDER = "/placeholders/after.svg";

export const defaultEditSamples: EditSample[] = [
  { id: "ed1", title: "Golden Hour Wedding", note: "Warmth recovered, skin tones balanced, sky graded back in.", src: AFTER_PLACEHOLDER, srcBefore: BEFORE_PLACEHOLDER },
  { id: "ed2", title: "Studio Portrait", note: "Dodge and burn, blemish work, subtle contrast curve.", src: AFTER_PLACEHOLDER, srcBefore: BEFORE_PLACEHOLDER },
  { id: "ed3", title: "Corporate Feature", note: "Colour cast removed, background cleaned, sharpening pass.", src: AFTER_PLACEHOLDER, srcBefore: BEFORE_PLACEHOLDER },
  { id: "ed4", title: "Evening Event", note: "Noise reduction, mixed lighting neutralised, highlight rescue.", src: AFTER_PLACEHOLDER, srcBefore: BEFORE_PLACEHOLDER },
  { id: "ed5", title: "Product Still Life", note: "Reflections tamed, dust removed, deep blacks restored.", src: AFTER_PLACEHOLDER, srcBefore: BEFORE_PLACEHOLDER },
];

export interface Service {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  category: CategorySlug;
  includes: string[];
  from: string;
}

export const defaultServices: Service[] = [
  {
    slug: "wedding",
    title: "Wedding Photography",
    subtitle: "Full-day documentary coverage",
    description:
      "From the morning stillness to the final song, I shoot weddings the way they actually unfold — unhurried, unposed, and generous with the small moments most people miss.",
    image: u("1465495976277-4387d4b0b4c6"),
    category: "wedding",
    includes: ["Up to 12 hours coverage", "Second shooter", "400+ edited images", "Online gallery + print rights"],
    from: "from $2,400",
  },
  {
    slug: "corporate",
    title: "Corporate & Brand",
    subtitle: "Imagery your marketing team can live on",
    description:
      "Conferences, office culture, leadership portraits and campaign work — a consistent visual language across every asset your brand publishes.",
    image: u("1497366216548-37526070297c"),
    category: "corporate",
    includes: ["Half or full day", "On-site direction", "Brand-matched grading", "Commercial licence"],
    from: "from $850 / half day",
  },
  {
    slug: "portrait",
    title: "Portrait Sessions",
    subtitle: "Personal, editorial, family",
    description:
      "A relaxed 90-minute session, on location or in studio. We talk, we walk, we shoot — and you end up with portraits that look like a good day rather than a photoshoot.",
    image: u("1506794778202-cad84cf45f1d"),
    category: "portrait",
    includes: ["90-minute session", "Two locations", "35 edited images", "Wardrobe guidance"],
    from: "from $420",
  },
  {
    slug: "headshots",
    title: "Professional Headshots",
    subtitle: "Individual and team",
    description:
      "Fast, comfortable and repeatable. Ideal for teams that need everyone looking like they belong to the same company without looking like a passport queue.",
    image: u("1519085360753-af0119f7cbe7"),
    category: "headshots",
    includes: ["15 min per person", "Studio or on-site setup", "2 retouched selects each", "Same-week delivery"],
    from: "from $180 / person",
  },
  {
    slug: "events",
    title: "Event Coverage",
    subtitle: "Galas, launches, conferences",
    description:
      "Discreet coverage that keeps pace with the room. Rapid same-night selects available for press and social while the event is still worth talking about.",
    image: u("1454165804606-c3d57bc86b40"),
    category: "events",
    includes: ["4–8 hours coverage", "Same-night preview set", "Speaker + candid coverage", "Full edited gallery in 5 days"],
    from: "from $700",
  },
  {
    slug: "product",
    title: "Product & Still Life",
    subtitle: "E-commerce and campaign",
    description:
      "Controlled studio light, clean cut-outs, and hero shots built for the page they will live on. Consistency across a hundred SKUs, or one image worth the whole campaign.",
    image: u("1543269865-cbf427effbad"),
    category: "product",
    includes: ["Studio day rate", "Styling + prop sourcing", "Retouched hero images", "Web-ready exports"],
    from: "from $650 / day",
  },
];

export const defaultBudgetRanges = [
  "Under $500",
  "$500 – $1,000",
  "$1,000 – $2,500",
  "$2,500 – $5,000",
  "$5,000+",
  "Not sure yet",
];

export const defaultAboutShort =
  "I'm Ram — a photographer of about fifteen years, most of them spent chasing light in places I had no business being awake for. I work quietly at weddings, patiently in studios, and quickly at events, and I care far more about how a photograph feels in ten years than how it performs in ten minutes. Shutter Ram is a one-person studio, which means the person you meet is the person behind the camera and the person editing every frame you receive.";

export const defaultAboutLong = [
  "I picked up my first camera at nineteen, mostly to have something to do with my hands. Fifteen years later it is still the same instinct: a way of paying closer attention than everyday life usually allows.",
  "My work sits somewhere between documentary and editorial. I would rather wait for a real expression than manufacture a good one, but I am not precious about it — if a family needs directing, I direct. If a founder needs three minutes to stop performing, we take five.",
  "Technically, I shoot with a light kit and a preference for available light. Everything is edited by me, frame by frame, in a consistent tonal language: deep blacks, restrained colour, nothing that will look dated in a decade.",
  "Outside of client work I photograph empty streets before sunrise, print far too much of it, and drink coffee that has usually gone cold.",
];


// ---------------------------------------------------------------------------
// Stats / experience / testimonials
// ---------------------------------------------------------------------------

export interface Stat {
  value: string;
  label: string;
}

export const defaultStats: Stat[] = [
  { value: "15", label: "Years shooting" },
  { value: "10,000+", label: "Hours shot" },
  { value: "60+", label: "Clients" },
  { value: "1,200+", label: "Projects delivered" },
];

export interface ExperienceItem {
  period: string;
  role: string;
  place: string;
  detail: string;
}

export const defaultExperience: ExperienceItem[] = [
  {
    period: "2021 — Present",
    role: "Lead Photographer",
    place: "Shutter Ram Studio",
    detail:
      "Running a one-person studio end to end: shooting, grading and delivering weddings, brand campaigns and editorial portraits for clients across three continents.",
  },
  {
    period: "2018 — 2021",
    role: "Senior Brand Photographer",
    place: "Northline Creative",
    detail:
      "Built and maintained the visual language for a roster of hospitality and fashion brands — campaign shoots, product libraries and founder portraiture.",
  },
  {
    period: "2015 — 2018",
    role: "Wedding & Event Photographer",
    place: "Freelance",
    detail:
      "Two hundred-plus weddings across coastlines, cathedrals and back gardens. Learned to read a room faster than a light meter.",
  },
  {
    period: "2011 — 2015",
    role: "Assistant & Second Shooter",
    place: "Various studios",
    detail:
      "Carried bags, set lights, and quietly learned the craft from photographers far better than I was.",
  },
];

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  rating: number;
  /** What was photographed (shown in the review pop-up). */
  occasion?: string;
  /** Client-supplied photographs, shown in the review pop-up. */
  images?: string[];
}

export const defaultTestimonials: Testimonial[] = [
  {
    id: "t1",
    quote:
      "Ram spent the whole day almost invisible, and then handed us photographs that made our parents cry. Not one of them feels posed.",
    name: "Ava & Daniel",
    role: "Wedding — Hudson Valley",
    rating: 5,
  },
  {
    id: "t2",
    quote:
      "Our entire brand library came from one two-day shoot. Twelve months later we are still publishing from that set.",
    name: "Marcus Rowe",
    role: "Head of Brand, Northline",
    rating: 5,
  },
  {
    id: "t3",
    quote:
      "I hate having my photo taken. Ram somehow made it a conversation, and I now use that headshot everywhere.",
    name: "Priya Anand",
    role: "Founder, Corva Labs",
    rating: 5,
  },
  {
    id: "t4",
    quote:
      "Same-night previews were up on our socials before the gala had ended. Professional from the first email to the final gallery.",
    name: "Helena Voss",
    role: "Events Director, Meridian Foundation",
    rating: 5,
  },
];

export const defaultHourOptions = [
  "Up to 2 hours",
  "Half day (4 hours)",
  "Full day (8 hours)",
  "Full day+ (10–12 hours)",
  "Multi-day",
  "Not sure yet",
];

// ---------------------------------------------------------------------------
// The experience of working together (client journey)
// ---------------------------------------------------------------------------

export interface ProcessStep {
  step: string;
  title: string;
  detail: string;
}

export const defaultProcessSteps: ProcessStep[] = [
  {
    step: "01",
    title: "Connect",
    detail: "Tell me the date, the place and what matters most. We talk it through — no scripts, no sales call.",
  },
  {
    step: "02",
    title: "Plan",
    detail: "We shape coverage, locations and a timeline that leaves room for the moments worth waiting for.",
  },
  {
    step: "03",
    title: "Shoot",
    detail: "You stay present. I stay out of the way, working quietly while the day happens on its own terms.",
  },
  {
    step: "04",
    title: "Keep",
    detail: "Every frame hand-graded and delivered in a private gallery, ready to print, share and revisit for decades.",
  },
];

// ---------------------------------------------------------------------------
// Page sections — order / visibility / wording, editable in the content studio.
// ---------------------------------------------------------------------------

export interface SectionConfig {
  page: string;
  key: string;
  label: string;
  eyebrow: string;
  heading: string;
  headingAccent: string;
  intro: string;
  enabled: boolean;
}

export const defaultPageSections: SectionConfig[] = [
  { page: "home", key: "about", label: "Home — About me", eyebrow: "About Me", heading: "A quiet eye, fifteen years in.", headingAccent: "", intro: "", enabled: true },
  { page: "home", key: "featured", label: "Home — Featured work", eyebrow: "Featured Work", heading: "A handful of favourites.", headingAccent: "", intro: "A rotating selection from recent commissions. Click any frame to open it full screen.", enabled: true },
  { page: "home", key: "editing", label: "Home — Power of editing", eyebrow: "The Power of Editing", heading: "Same frame. Two different photographs.", headingAccent: "", intro: "Drag the handle across the image to reveal the unedited capture on one side and the finished, hand-graded frame on the other.", enabled: true },
  { page: "home", key: "services", label: "Home — Services", eyebrow: "Services", heading: "What I can photograph for you.", headingAccent: "", intro: "Every engagement is quoted individually — these are the starting points.", enabled: true },
  { page: "home", key: "experience", label: "Home — The Experience", eyebrow: "The Experience", heading: "Easy from first hello", headingAccent: "to final frame.", intro: "", enabled: true },
  { page: "home", key: "testimonials", label: "Home — Testimonials", eyebrow: "", heading: "", headingAccent: "", intro: "", enabled: true },
  { page: "home", key: "connect", label: "Home — Connect with me", eyebrow: "Connect With Me", heading: "Follow the work in progress.", headingAccent: "", intro: "New frames, behind-the-scenes and the occasional 4am street photograph.", enabled: true },
  { page: "about", key: "experience", label: "About page — The Experience", eyebrow: "The Experience", heading: "How you can work", headingAccent: "with me.", intro: "", enabled: true },
  { page: "services", key: "experience", label: "Services page — The Experience", eyebrow: "The Experience", heading: "Easy from first hello", headingAccent: "to final frame.", intro: "", enabled: true },
];
