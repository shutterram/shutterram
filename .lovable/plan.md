## Shutter Ram — Photographer Portfolio

**Brand:** Shutter Ram — "Capturing your tomorrow's memories today"
**Look:** dark classic. Near-black base, layered greys, off-white text, soft cool-silver accent (no gold, no vibrant colors). Large editorial serif display type for headings, clean sans for body. Generous whitespace, thin hairline dividers, slow fades — images carry the color, the UI stays monochrome.

### Pages

```text
/                 Home (all sections below)
/gallery          Previous Works — full gallery, category filters
/gallery/$category Category gallery (wedding, corporate, portrait, headshots, ...)
/Services Page    A page displaying all my services types
/about            About Me
/contact          Contact + Request a Quote
```

### Header

Fixed, fully transparent over the hero, no border. On scroll past ~80px it fades in a dark blurred background with a hairline bottom border and slightly reduced height. Logo top, nav center under the logo (Home, Gallery, About Me, Contact Me), mobile slide-in menu.

### Home sections

1. **Hero** — full-viewport image slider, one slide per category (Wedding, Corporate, Portrait, Headshots, Events, Product). Each slide: full-bleed photo with dark gradient scrim, category title, one-line tagline, "View More" button linking to that category gallery. Auto-advance with pause on hover, arrows, slide counter, crossfade transitions.
2. **About Me** — short paragraph, portrait image, signature-style name, link to full About page.
3. **Featured Work(this is different from gallery page)** — filter pills (All, Wedding, Corporate, Headshots, Portraits, Events). Horizontal carousel of photos; clicking one opens a full-screen lightbox with prev/next arrows, keyboard navigation, and caption.
4. **The Power of Editing** — pick from 5 thumbnails; the selected image shows a draggable before/after comparison draggable slider on the image itself(this is not changing the entire image in display, its same image, but it reveals edited and unedited parts as the slider is dragged across the image), with Before/After labels.
5. **Services** — grid of service cards, each with image, title, subtitle, "View More" (to that category gallery) and "Request a Quote" (jumps to the quote form pre-filled with that service).
6. **Connect With Me** — Instagram, Flickr, Facebook, X/Twitter icon links.
7. **Footer** — socials, site navigation, placeholder phone and email, copyright.

### Contact page

Two forms one by one: **Message** (name, email, subject, message) and **Request a Quote** (name, email, phone, service type, event date, budget range, details). Both validated with Zod, inline errors, and a success confirmation toast.

### Forms → email to you

Submissions get emailed to your inbox so you can reply directly from there. This needs Lovable Cloud plus a sender domain you own — the setup dialog for that comes after you approve this plan. Emails are sent from your domain with the submitter's address as reply-to, so hitting Reply goes straight back to the client. Each submission is also saved so nothing is lost if an email bounces. 

If you'd rather not set up a domain right now, I can ship everything else first and wire the emails in afterwards.

I will use an external third party for reciving emails instead of lovable cloud plus

### Gallery page

Contains a my entire gallery. if possible, it should be fetchable from my flickr account, so i dont have the burden of uploading each photo. or provide me an admin panel hidden from the main client facing site, so i can add and remove or adjust photos and categories of each photos.

Ofcourse these should be filterable too, with categories.

Also add a Services page

To display a each service section wise, like, a photo on the left, title, description, view more, and request a quote buttons.

&nbsp;

### Images

High-quality placeholder stock photos (Unsplash URLs) throughout, organized in a single data file so you can swap in your own shots by replacing URLs in one place.

### Technical notes

- TanStack Start file routes; each page gets its own SEO head metadata (title, description, og/twitter tags).
- Dark palette defined as oklch design tokens in `src/styles.css`; no hardcoded colors in components.
- Reusable components: `SiteHeader`, `HeroSlider`, `Lightbox`, `BeforeAfterSlider`, `FilterPills`, `ServiceCard`, `SocialLinks`, `SiteFooter`.
- Category/service/photo content lives in `src/data/portfolio.ts`.
- Form validation via Zod on both client and server; server route inserts the submission and sends the notification email.