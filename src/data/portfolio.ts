// ---------------------------------------------------------------------------
// Shutter Ram — all site content lives here.
// Swap any `u("...")` id for your own image URL to replace a photo.
// ---------------------------------------------------------------------------

const u = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Same photo, rendered "straight out of camera": flat, cool, low contrast. */
export const unedited = (url: string) =>
  `${url}&sat=-55&con=-22&bri=-8&gam=-12`;

export const site = {
  name: "Shutter Ram",
  tagline: "Capturing your tomorrow's memories today",
  email: "hello@shutterram.com",
  phone: "+1 (555) 014-2280",
  location: "Available worldwide — based in New York",
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
} as const;

export type CategorySlug =
  | "wedding"
  | "corporate"
  | "portrait"
  | "headshots"
  | "events"
  | "product";

export interface Category {
  slug: CategorySlug;
  title: string;
  label: string;
  tagline: string;
  hero: string;
}

export const categories: Category[] = [
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
}

export const photos: Photo[] = [
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
  { id: "e2", category: "events", caption: "Crowd at midnight", src: u("1470229722913-7ea0d1e5b1fe") },
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
export const featuredIds = [
  "w1", "p1", "c1", "h1", "e1", "d1", "w3", "p3", "c3", "h2", "e3", "d3", "w5", "p6", "e5",
];

export interface EditSample {
  id: string;
  title: string;
  note: string;
  src: string;
}

export const editSamples: EditSample[] = [
  { id: "ed1", title: "Golden Hour Wedding", note: "Warmth recovered, skin tones balanced, sky graded back in.", src: u("1519741497674-611481863552", 1800) },
  { id: "ed2", title: "Studio Portrait", note: "Dodge and burn, blemish work, subtle contrast curve.", src: u("1494790108377-be9c29b29330", 1800) },
  { id: "ed3", title: "Corporate Feature", note: "Colour cast removed, background cleaned, sharpening pass.", src: u("1521737711867-e3b97375f902", 1800) },
  { id: "ed4", title: "Evening Event", note: "Noise reduction, mixed lighting neutralised, highlight rescue.", src: u("1511632765486-a01980e01a18", 1800) },
  { id: "ed5", title: "Product Still Life", note: "Reflections tamed, dust removed, deep blacks restored.", src: u("1600880292203-757bb62b4baf", 1800) },
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

export const services: Service[] = [
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

export const budgetRanges = [
  "Under $500",
  "$500 – $1,000",
  "$1,000 – $2,500",
  "$2,500 – $5,000",
  "$5,000+",
  "Not sure yet",
];

export const aboutShort =
  "I'm Ram — a photographer of about fifteen years, most of them spent chasing light in places I had no business being awake for. I work quietly at weddings, patiently in studios, and quickly at events, and I care far more about how a photograph feels in ten years than how it performs in ten minutes. Shutter Ram is a one-person studio, which means the person you meet is the person behind the camera and the person editing every frame you receive.";

export const aboutLong = [
  "I picked up my first camera at nineteen, mostly to have something to do with my hands. Fifteen years later it is still the same instinct: a way of paying closer attention than everyday life usually allows.",
  "My work sits somewhere between documentary and editorial. I would rather wait for a real expression than manufacture a good one, but I am not precious about it — if a family needs directing, I direct. If a founder needs three minutes to stop performing, we take five.",
  "Technically, I shoot with a light kit and a preference for available light. Everything is edited by me, frame by frame, in a consistent tonal language: deep blacks, restrained colour, nothing that will look dated in a decade.",
  "Outside of client work I photograph empty streets before sunrise, print far too much of it, and drink coffee that has usually gone cold.",
];

export const photoById = (id: string) => photos.find((p) => p.id === id);
export const photosByCategory = (slug: CategorySlug) => photos.filter((p) => p.category === slug);
export const categoryBySlug = (slug: string) => categories.find((c) => c.slug === slug);
