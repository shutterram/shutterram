create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create table public.settings (
  id boolean primary key default true check (id),
  name text not null default 'Shutter Ram',
  tagline text not null default '',
  email text not null default '',
  phone text not null default '',
  location text not null default '',
  form_endpoint text not null default '',
  about_short text not null default '',
  about_long text[] not null default '{}',
  budget_ranges text[] not null default '{}',
  hour_options text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.socials (
  id uuid primary key default gen_random_uuid(),
  name text not null, href text not null, icon text not null default 'flickr',
  sort_order int not null default 0, updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, title text not null, label text not null,
  tagline text not null default '', hero text not null default '',
  sort_order int not null default 0, updated_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  photo_key text not null unique, category_slug text not null,
  caption text not null default '', src text not null,
  featured boolean not null default false, featured_order int not null default -1,
  sort_order int not null default 0, updated_at timestamptz not null default now()
);

create table public.edit_samples (
  id uuid primary key default gen_random_uuid(),
  title text not null, note text not null default '', src text not null,
  sort_order int not null default 0, updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, title text not null, subtitle text not null default '',
  description text not null default '', image text not null default '',
  category_slug text not null default '', includes text[] not null default '{}',
  price_from text not null default '', sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.stats (
  id uuid primary key default gen_random_uuid(),
  value text not null, label text not null,
  sort_order int not null default 0, updated_at timestamptz not null default now()
);

create table public.experience (
  id uuid primary key default gen_random_uuid(),
  period text not null, role text not null, place text not null default '',
  detail text not null default '', sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null, name text not null, role text not null default '',
  rating int not null default 5, sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.process_steps (
  id uuid primary key default gen_random_uuid(),
  step text not null, title text not null, detail text not null default '',
  sort_order int not null default 0, updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['settings','socials','categories','photos','edit_samples','services','stats','experience','testimonials','process_steps'] loop
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (public.has_role(auth.uid(), ''admin'')) with check (public.has_role(auth.uid(), ''admin''))', t);
    execute format('create trigger touch_%I before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;create policy "admins manage site images" on storage.objects for all to authenticated
using (bucket_id = 'site-images' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'site-images' and public.has_role(auth.uid(), 'admin'));create or replace function public.claim_admin()
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return false; end if;
  if exists (select 1 from public.user_roles where role = 'admin') then
    return exists (select 1 from public.user_roles where user_id = uid and role = 'admin');
  end if;
  insert into public.user_roles (user_id, role) values (uid, 'admin')
  on conflict do nothing;
  return true;
end $$;

revoke all on function public.claim_admin() from public, anon;
grant execute on function public.claim_admin() to authenticated;-- 1) Remove the privileged one-time admin claim function (admin already assigned)
DROP FUNCTION IF EXISTS public.claim_admin();

-- 2) has_role no longer needs elevated privileges: user_roles has a
--    "read own roles" policy, and every call site checks auth.uid().
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 3) Hide settings.form_endpoint from anonymous readers (column-level grants)
REVOKE SELECT ON public.settings FROM anon;
GRANT SELECT (
  id, name, tagline, email, phone, location, about_short, about_long,
  budget_ranges, hour_options, updated_at
) ON public.settings TO anon;alter table public.edit_samples add column if not exists src_before text not null default '';
update public.edit_samples set src_before = '/placeholders/before.svg', src = '/placeholders/after.svg';ALTER TABLE public.process_steps ADD COLUMN IF NOT EXISTS section_key text NOT NULL DEFAULT 'default';
ALTER TABLE public.socials ADD COLUMN IF NOT EXISTS icon_url text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  section_key text NOT NULL,
  label text NOT NULL,
  eyebrow text NOT NULL DEFAULT '',
  heading text NOT NULL DEFAULT '',
  heading_accent text NOT NULL DEFAULT '',
  intro text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page, section_key)
);

GRANT SELECT ON public.page_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_sections TO authenticated;
GRANT ALL ON public.page_sections TO service_role;

ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON public.page_sections FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write" ON public.page_sections FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_page_sections BEFORE UPDATE ON public.page_sections
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

INSERT INTO public.page_sections (page, section_key, label, eyebrow, heading, heading_accent, intro, sort_order) VALUES
  ('home', 'about', 'Home — About me', 'About Me', 'A quiet eye, fifteen years in.', '', '', 0),
  ('home', 'featured', 'Home — Featured work', 'Featured Work', 'A handful of favourites.', '', 'A rotating selection from recent commissions. Click any frame to open it full screen.', 1),
  ('home', 'editing', 'Home — Power of editing', 'The Power of Editing', 'Same frame. Two different photographs.', '', 'Drag the handle across the image to reveal the unedited capture on one side and the finished, hand-graded frame on the other.', 2),
  ('home', 'services', 'Home — Services', 'Services', 'What I can photograph for you.', '', 'Every engagement is quoted individually — these are the starting points.', 3),
  ('home', 'experience', 'Home — The Experience', 'The Experience', 'Easy from first hello', 'to final frame.', '', 4),
  ('home', 'testimonials', 'Home — Testimonials', '', '', '', '', 5),
  ('home', 'connect', 'Home — Connect with me', 'Connect With Me', 'Follow the work in progress.', '', 'New frames, behind-the-scenes and the occasional 4am street photograph.', 6),
  ('about', 'experience', 'About page — The Experience', 'The Experience', 'How you can work', 'with me.', '', 0),
  ('services', 'experience', 'Services page — The Experience', 'The Experience', 'Easy from first hello', 'to final frame.', '', 0)
ON CONFLICT (page, section_key) DO NOTHING;

INSERT INTO public.process_steps (step, title, detail, sort_order, section_key)
SELECT step, title, detail, sort_order, 'about'
FROM public.process_steps WHERE section_key = 'default';ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS loader_shape text NOT NULL DEFAULT 'square',
  ADD COLUMN IF NOT EXISTS loader_size integer NOT NULL DEFAULT 72,
  ADD COLUMN IF NOT EXISTS loader_pulse_scale numeric NOT NULL DEFAULT 1.8,
  ADD COLUMN IF NOT EXISTS loader_fade text NOT NULL DEFAULT 'out';

GRANT SELECT (loader_shape, loader_size, loader_pulse_scale, loader_fade) ON public.settings TO anon;
GRANT SELECT (loader_shape, loader_size, loader_pulse_scale, loader_fade) ON public.settings TO authenticated;ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS logo_header text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_footer text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_mobile text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_loader text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_favicon text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_invert boolean NOT NULL DEFAULT true;GRANT SELECT (logo_header, logo_footer, logo_mobile, logo_loader, logo_favicon, logo_invert) ON public.settings TO anon, authenticated;-- 1. Editable site copy -------------------------------------------------
create table if not exists public.site_copy (
  id uuid primary key default gen_random_uuid(),
  group_label text not null default 'General',
  key text not null unique,
  label text not null,
  value text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

grant select on public.site_copy to anon;
grant select, insert, update, delete on public.site_copy to authenticated;
grant all on public.site_copy to service_role;

alter table public.site_copy enable row level security;

create policy "public read" on public.site_copy for select to anon, authenticated using (true);
create policy "admin write" on public.site_copy for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create trigger touch_site_copy before update on public.site_copy
  for each row execute function public.touch_updated_at();

insert into public.site_copy (group_label, key, label, value, sort_order) values
  ('Navigation','nav.home','Home link','Home',0),
  ('Navigation','nav.gallery','Gallery link','Gallery',1),
  ('Navigation','nav.services','Services link','Services',2),
  ('Navigation','nav.about','About link','About Me',3),
  ('Navigation','nav.contact','Contact link','Contact',4),
  ('Navigation','nav.book','Book button','Book Your Date',5),
  ('Navigation','nav.menu_open','Open menu label','Menu',6),
  ('Navigation','nav.menu_close','Close menu label','Close',7),
  ('Buttons','btn.view_more','View more','View More',10),
  ('Buttons','btn.view_less','View less','View Less',11),
  ('Buttons','btn.book_date','Hero — book button','Book Your Date',12),
  ('Buttons','btn.request_quote','Request a quote','Request a Quote',13),
  ('Buttons','btn.start_conversation','Start a conversation','Start a Conversation',14),
  ('Buttons','btn.work_with_me','Work with me','Work with me',15),
  ('Buttons','btn.close','Close','Close',16),
  ('Gallery page','gallery.eyebrow','Small label','Previous Works',20),
  ('Gallery page','gallery.title','Heading','The Gallery',21),
  ('Gallery page','gallery.intro','Intro paragraph','Everything worth keeping from the last few years, in one place. Filter by category, or open any frame full screen and step through with the arrow keys.',22),
  ('Gallery page','gallery.jump','Category row label','Jump to a category',23),
  ('Gallery page','gallery.filter_all','“All” filter label','All',24),
  ('About page','about.eyebrow','Small label','About Me',30),
  ('About page','about.title','Heading','I''d rather wait for the real moment.',31),
  ('About page','about.image','Portrait image URL','https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1000&q=80',32),
  ('About page','about.kit_heading','Kit — label','Kit, briefly',33),
  ('About page','about.kit_text','Kit — paragraph','Two mirrorless bodies, three primes, one very tired 24–70, and a pair of lights that only come out when the room refuses to cooperate.',34),
  ('About page','about.hello_heading','Say hello — label','Say hello',35),
  ('Contact page','contact.eyebrow','Small label','Contact',40),
  ('Contact page','contact.title','Heading','Let''s talk about your day.',41),
  ('Contact page','contact.intro','Intro paragraph','Tell me what you have in mind. I reply to every message personally, usually within a day.',42),
  ('Contact page','contact.tab_quote','Quote tab label','Request a Quote',43),
  ('Contact page','contact.tab_message','Message tab label','Send a Message',44),
  ('Contact page','contact.submit_quote','Quote submit button','Send Quote Request',45),
  ('Contact page','contact.submit_message','Message submit button','Send Message',46),
  ('Review page','review.eyebrow','Small label','Private link — clients only',50),
  ('Review page','review.title','Heading','How was your shoot?',51),
  ('Review page','review.intro','Intro paragraph','If you have two minutes, a few honest words go further than anything I could write about my own work. Thank you.',52),
  ('Review page','review.rating_label','Rating label','Your rating',53),
  ('Review page','review.photos_label','Photo upload label','Add photos (optional)',54),
  ('Review page','review.submit','Submit button','Submit Review',55),
  ('Review page','review.thanks','Thank-you message','Thank you — your review has been sent for approval.',56),
  ('Testimonials','testimonial.photos_button','“See photos” button','See photos',60),
  ('Testimonials','testimonial.modal_photos','Modal photo heading','Photos from this shoot',61),
  ('Testimonials','testimonial.read_more','Card hint','Click to read',62),
  ('Footer','footer.nav_heading','Navigation heading','Navigation',70),
  ('Footer','footer.categories_heading','Categories heading','Categories',71),
  ('Footer','footer.contact_heading','Contact heading','Get in touch',72),
  ('Footer','footer.rights','Copyright line','All rights reserved.',73),
  ('System screens','loader.label','Loading screen text','Loading',80),
  ('System screens','error.eyebrow','Error — small label','Something went wrong',81),
  ('System screens','error.title','Error — heading','This page didn''t load',82),
  ('System screens','error.body','Error — paragraph','The frame slipped. Try again, or head back to the homepage.',83),
  ('System screens','error.retry','Error — retry button','Try again',84),
  ('System screens','error.home','Error — home button','Go home',85)
on conflict (key) do nothing;

-- 2. Client reviews (stored alongside testimonials) ----------------------
alter table public.testimonials
  add column if not exists status text not null default 'approved',
  add column if not exists occasion text not null default '',
  add column if not exists email text not null default '',
  add column if not exists images text[] not null default '{}',
  add column if not exists submitted_at timestamptz not null default now();

drop policy if exists "public read" on public.testimonials;
create policy "public read" on public.testimonials for select to anon, authenticated
  using (status = 'approved');

-- 3. Logo placement controls --------------------------------------------
alter table public.settings
  add column if not exists logo_header_height integer not null default 0,
  add column if not exists logo_header_offset_x integer not null default 0,
  add column if not exists logo_header_offset_y integer not null default 0,
  add column if not exists logo_mobile_height integer not null default 0,
  add column if not exists logo_mobile_offset_x integer not null default 0,
  add column if not exists logo_mobile_offset_y integer not null default 0,
  add column if not exists logo_footer_height integer not null default 0,
  add column if not exists logo_footer_offset_x integer not null default 0,
  add column if not exists logo_footer_offset_y integer not null default 0,
  add column if not exists logo_loader_height integer not null default 0,
  add column if not exists logo_loader_offset_x integer not null default 0,
  add column if not exists logo_loader_offset_y integer not null default 0;

grant select (
  logo_header_height, logo_header_offset_x, logo_header_offset_y,
  logo_mobile_height, logo_mobile_offset_x, logo_mobile_offset_y,
  logo_footer_height, logo_footer_offset_x, logo_footer_offset_y,
  logo_loader_height, logo_loader_offset_x, logo_loader_offset_y
) on public.settings to anon;
grant select on public.settings to authenticated;-- Site copy library
CREATE TABLE IF NOT EXISTS public.site_copy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  copy_key text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  group_name text NOT NULL DEFAULT 'General',
  value text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_copy TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_copy TO authenticated;
GRANT ALL ON public.site_copy TO service_role;

ALTER TABLE public.site_copy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read" ON public.site_copy;
CREATE POLICY "public read" ON public.site_copy FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admin write" ON public.site_copy;
CREATE POLICY "admin write" ON public.site_copy FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS touch_site_copy ON public.site_copy;
CREATE TRIGGER touch_site_copy BEFORE UPDATE ON public.site_copy
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Client reviews
ALTER TABLE public.testimonials
  ADD COLUMN IF NOT EXISTS occasion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS images text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

DROP POLICY IF EXISTS "public read" ON public.testimonials;
CREATE POLICY "public read" ON public.testimonials FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR public.has_role(auth.uid(), 'admin'));

-- Logo placement controls
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS logo_header_height integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_header_offset_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_header_offset_y integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_mobile_height integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_mobile_offset_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_mobile_offset_y integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_footer_height integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_footer_offset_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_footer_offset_y integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_loader_height integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_loader_offset_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS logo_loader_offset_y integer NOT NULL DEFAULT 0;

GRANT SELECT (id,name,tagline,email,phone,location,about_short,about_long,budget_ranges,hour_options,loader_shape,loader_size,loader_pulse_scale,loader_fade,logo_header,logo_footer,logo_mobile,logo_loader,logo_favicon,logo_invert,logo_header_height,logo_header_offset_x,logo_header_offset_y,logo_mobile_height,logo_mobile_offset_x,logo_mobile_offset_y,logo_footer_height,logo_footer_offset_x,logo_footer_offset_y,logo_loader_height,logo_loader_offset_x,logo_loader_offset_y,updated_at)
  ON public.settings TO anon;INSERT INTO public.site_copy (key,label,group_label,value,sort_order) VALUES
('footer.blurb','Footer paragraph','Footer','A one-person studio photographing weddings, brands and people who would rather be remembered honestly than perfectly.',47),
('footer.note','Footer small note','Footer','Every frame edited by hand',48)
ON CONFLICT (key) DO NOTHING;DROP POLICY IF EXISTS "public read" ON public.testimonials;

CREATE POLICY "anon read approved" ON public.testimonials
FOR SELECT TO anon
USING (status = 'approved');

CREATE POLICY "auth read approved or admin" ON public.testimonials
FOR SELECT TO authenticated
USING (status = 'approved' OR public.has_role(auth.uid(), 'admin'::app_role));CREATE TABLE public.seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  keywords text NOT NULL DEFAULT '',
  og_title text NOT NULL DEFAULT '',
  og_description text NOT NULL DEFAULT '',
  og_image text NOT NULL DEFAULT '',
  canonical text NOT NULL DEFAULT '',
  robots text NOT NULL DEFAULT 'index, follow',
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_pages TO authenticated;
GRANT ALL ON public.seo_pages TO service_role;

ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON public.seo_pages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write" ON public.seo_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER seo_pages_touch BEFORE UPDATE ON public.seo_pages
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.seo_pages (path, label, title, description, keywords, og_title, og_description, canonical, robots, sort_order) VALUES
('/', 'Home', 'Shutter Ram — Wedding, Portrait & Corporate Photography', 'Shutter Ram is a one-person photography studio covering weddings, corporate brands, portraits and headshots. Clicking today, for a memory that lives forever.', 'wedding photographer, portrait photography, corporate photography, headshots, event photographer', 'Shutter Ram — Wedding, Portrait & Corporate Photography', 'Weddings, brands, portraits and headshots, photographed with a documentary eye.', 'https://shutterram.lovable.app/', 'index, follow', 1),
('/gallery', 'Gallery', 'Photography Portfolio & Gallery | Shutter Ram', 'Browse the Shutter Ram portfolio: wedding days, corporate brand work, portraits, headshots and events, filterable by category.', 'photography portfolio, wedding gallery, portrait gallery', 'Photography Portfolio & Gallery | Shutter Ram', 'Selected wedding, brand, portrait and event photography.', 'https://shutterram.lovable.app/gallery', 'index, follow', 2),
('/services', 'Services', 'Photography Services & Rates | Shutter Ram', 'Wedding, corporate, portrait, headshot, event and product photography services with what is included and starting rates.', 'photography services, wedding packages, headshot rates', 'Photography Services & Rates | Shutter Ram', 'Coverage, deliverables and starting rates for every service.', 'https://shutterram.lovable.app/services', 'index, follow', 3),
('/about', 'About', 'About Ram — The Photographer | Shutter Ram', 'Meet Ram, the photographer behind Shutter Ram: years of documentary and editorial work across weddings, brands and portraits.', 'about photographer, documentary photographer', 'About Ram — The Photographer | Shutter Ram', 'The person behind the camera, and how I like to work.', 'https://shutterram.lovable.app/about', 'index, follow', 4),
('/contact', 'Contact', 'Contact & Book Your Date | Shutter Ram', 'Send Shutter Ram a message or request a tailored photography quote for your wedding, brand shoot, portrait session or event.', 'book photographer, photography quote, contact photographer', 'Contact & Book Your Date | Shutter Ram', 'Message me, or request a tailored quote for your date.', 'https://shutterram.lovable.app/contact', 'index, follow', 5),
('/review', 'Client review page', 'Leave a Review | Shutter Ram', 'A private page for Shutter Ram clients to leave a review of their shoot.', '', 'Leave a Review | Shutter Ram', 'Share a few words about your shoot with Shutter Ram.', 'https://shutterram.lovable.app/review', 'noindex, nofollow', 6);REVOKE SELECT (email) ON public.testimonials FROM anon;
REVOKE SELECT (email) ON public.testimonials FROM authenticated;
GRANT SELECT (id,name,role,occasion,quote,rating,images,status,sort_order) ON public.testimonials TO anon;
GRANT SELECT (id,name,role,occasion,quote,rating,images,status,sort_order) ON public.testimonials TO authenticated;CREATE TABLE public.theme_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  label text NOT NULL,
  group_label text NOT NULL DEFAULT 'General',
  hint text NOT NULL DEFAULT '',
  dark_value text NOT NULL DEFAULT '#000000',
  dark_opacity integer NOT NULL DEFAULT 100,
  light_value text NOT NULL DEFAULT '#ffffff',
  light_opacity integer NOT NULL DEFAULT 100,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.theme_tokens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.theme_tokens TO authenticated;
GRANT ALL ON public.theme_tokens TO service_role;

ALTER TABLE public.theme_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON public.theme_tokens FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write" ON public.theme_tokens FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_theme_tokens BEFORE UPDATE ON public.theme_tokens
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

INSERT INTO public.theme_tokens (token,label,group_label,hint,dark_value,dark_opacity,light_value,light_opacity,sort_order) VALUES
('background','Page background','Surfaces','','#0a0a0a',100,'#fafafa',100,10),
('surface','Panel background','Surfaces','Cards, rails and quiet blocks','#131313',100,'#f0f0f0',100,20),
('surface-2','Panel background (deeper)','Surfaces','','#1c1c1c',100,'#e6e6e6',100,30),
('card','Card background','Surfaces','','#131313',100,'#fafafa',100,40),
('popover','Popup background','Surfaces','','#131313',100,'#fafafa',100,50),
('foreground','Body text','Text','Headings and main copy','#ebebeb',100,'#121212',100,60),
('card-foreground','Card text','Text','','#ebebeb',100,'#121212',100,70),
('popover-foreground','Popup text','Text','','#ebebeb',100,'#121212',100,80),
('muted-foreground','Muted text','Text','Eyebrows, captions, helper text','#97989a',100,'#515354',100,90),
('secondary-foreground','Secondary text','Text','','#ebebeb',100,'#121212',100,100),
('primary','Primary / button fill','Accents','Solid buttons and highlights','#e7e8e9',100,'#151617',100,110),
('primary-foreground','Primary button text','Accents','','#0d0d0d',100,'#f8f8f8',100,120),
('secondary','Secondary fill','Accents','','#202020',100,'#e8e8e8',100,130),
('accent','Accent','Accents','','#b2b8bf',100,'#373b40',100,140),
('accent-foreground','Accent text','Accents','','#0d0d0d',100,'#f8f8f8',100,150),
('muted','Muted fill','Accents','','#202020',100,'#e8e8e8',100,160),
('destructive','Error / delete','Accents','','#b54a46',100,'#b33736',100,170),
('destructive-foreground','Error text','Accents','','#f2f2f2',100,'#f8f8f8',100,180),
('hairline','Hairline rules','Lines & effects','Thin dividers — lower the intensity to soften','#ffffff',10,'#000000',12,190),
('border','Borders','Lines & effects','','#ffffff',12,'#000000',14,200),
('input','Form field lines','Lines & effects','','#ffffff',16,'#000000',18,210),
('ring','Focus ring','Lines & effects','','#96989b',100,'#535558',100,220),
('glow','Hover glow','Lines & effects','Soft light on hover — intensity controls strength','#ffffff',28,'#000000',22,230);CREATE TABLE public.admin_settings (
  id boolean NOT NULL PRIMARY KEY DEFAULT true CHECK (id),
  form_endpoint text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage form endpoint"
ON public.admin_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER touch_admin_settings
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.admin_settings (id, form_endpoint)
SELECT true, COALESCE(s.form_endpoint, '') FROM public.settings s LIMIT 1;

INSERT INTO public.admin_settings (id, form_endpoint)
SELECT true, '' WHERE NOT EXISTS (SELECT 1 FROM public.admin_settings);

ALTER TABLE public.settings DROP COLUMN form_endpoint;

REVOKE SELECT ON public.settings FROM anon, authenticated;
GRANT SELECT ON public.settings TO anon, authenticated;INSERT INTO public.theme_tokens (token, label, group_label, hint, dark_value, dark_opacity, light_value, light_opacity, sort_order)
VALUES ('cursor-glow', 'Cursor glow', 'Lines & effects', 'The soft light that follows the mouse pointer around the site.', '#ffffff', 10, '#000000', 8, 240)
ON CONFLICT (token) DO NOTHING;ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS glow_size integer NOT NULL DEFAULT 544,
  ADD COLUMN IF NOT EXISTS glow_blend text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS glow_softness integer NOT NULL DEFAULT 68;REVOKE SELECT ON public.testimonials FROM anon, authenticated;

GRANT SELECT (id, quote, name, role, rating, sort_order, updated_at, status, occasion, images, submitted_at)
  ON public.testimonials TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS og_image text NOT NULL DEFAULT '/placeholders/og-cover.jpg';
UPDATE public.settings SET og_image = '/placeholders/og-cover.jpg' WHERE og_image IS NULL OR og_image = '';
GRANT SELECT (og_image) ON public.settings TO anon, authenticated;
alter table public.settings
  add column if not exists font_heading text not null default 'Literata',
  add column if not exists font_body text not null default 'Manrope',
  add column if not exists font_scale_desktop numeric not null default 1,
  add column if not exists font_scale_tablet numeric not null default 1,
  add column if not exists font_scale_mobile numeric not null default 1;

create table if not exists public.type_tokens (
  id uuid primary key default gen_random_uuid(),
  role text not null unique,
  label text not null,
  group_label text not null default 'General',
  hint text not null default '',
  selector text not null,
  font_family text not null default '',
  weight text not null default '',
  letter_spacing text not null default '',
  line_height text not null default '',
  text_transform text not null default '',
  size_desktop text not null default '',
  size_tablet text not null default '',
  size_mobile text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

grant select on public.type_tokens to anon;
grant select, insert, update, delete on public.type_tokens to authenticated;
grant all on public.type_tokens to service_role;

alter table public.type_tokens enable row level security;

create policy "public read" on public.type_tokens for select to anon, authenticated using (true);
create policy "admin write" on public.type_tokens for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));

create trigger touch_type_tokens before update on public.type_tokens
  for each row execute function public.touch_updated_at();

insert into public.type_tokens (role, label, group_label, hint, selector, sort_order) values
  ('h1', 'Page heading (H1)', 'Headings', 'Biggest heading on each page. Leave a size blank to keep the built-in responsive size.', 'h1', 10),
  ('h2', 'Section heading (H2)', 'Headings', '', 'h2', 20),
  ('h3', 'Sub heading (H3)', 'Headings', '', 'h3', 30),
  ('h4', 'Small heading (H4)', 'Headings', '', 'h4', 40),
  ('display', 'Anything using the display font', 'Headings', 'Applies to logo wordmark and other display-font text.', '.font-display', 50),
  ('body', 'Body text', 'Body', 'Base text for the whole site.', 'body', 60),
  ('paragraph', 'Paragraphs', 'Body', '', 'p', 70),
  ('eyebrow', 'Small caps label (eyebrow)', 'Body', 'The tiny spaced-out labels above headings.', '.eyebrow', 80),
  ('button', 'Buttons', 'Interface', '', 'button', 90),
  ('link', 'Links', 'Interface', '', 'a', 100),
  ('input', 'Form fields', 'Interface', '', 'input, textarea, select', 110)
on conflict (role) do nothing;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS cover text NOT NULL DEFAULT '';
ALTER TABLE public.type_tokens ADD COLUMN IF NOT EXISTS sample_text text NOT NULL DEFAULT '';

INSERT INTO public.type_tokens (role, label, group_label, hint, selector, sample_text, sort_order)
VALUES
  ('home_about_eyebrow','About — small label','Home page sections','The tiny uppercase label above the heading','#sec-about .eyebrow','About Me',100),
  ('home_about_heading','About — heading','Home page sections','','#sec-about h2','A quiet eye, fifteen years in.',101),
  ('home_about_body','About — paragraph','Home page sections','','#sec-about p:not(.eyebrow)','A one-person studio built on patience and available light.',102),

  ('home_featured_eyebrow','Featured Work — small label','Home page sections','','#sec-featured .eyebrow','Featured Work',110),
  ('home_featured_heading','Featured Work — heading','Home page sections','','#sec-featured h2','A handful of favourites.',111),
  ('home_featured_body','Featured Work — paragraph','Home page sections','','#sec-featured h2 ~ p','A rotating selection from recent commissions.',112),

  ('home_editing_eyebrow','Editing — small label','Home page sections','','#sec-editing .eyebrow','The Power of Editing',120),
  ('home_editing_heading','Editing — heading','Home page sections','','#sec-editing h2','Same frame. Two different photographs.',121),
  ('home_editing_body','Editing — paragraph','Home page sections','','#sec-editing h2 ~ p','Drag the handle across the image to reveal the unedited capture.',122),

  ('home_services_eyebrow','Services — small label','Home page sections','','#sec-services .eyebrow','Services',130),
  ('home_services_heading','Services — heading','Home page sections','','#sec-services h2','What I can photograph for you.',131),
  ('home_services_body','Services — paragraph','Home page sections','','#sec-services h2 ~ p','Every engagement is quoted individually.',132),

  ('home_experience_eyebrow','Experience — small label','Home page sections','','#sec-experience .eyebrow','The Experience',140),
  ('home_experience_heading','Experience — heading','Home page sections','','#sec-experience h2','How a shoot actually runs.',141),
  ('home_experience_body','Experience — paragraph','Home page sections','','#sec-experience h2 ~ p','From the first message to the final gallery.',142),

  ('home_testimonials_eyebrow','Testimonials — small label','Home page sections','','#sec-testimonials .eyebrow','Testimonials',150),
  ('home_testimonials_heading','Testimonials — heading','Home page sections','','#sec-testimonials h2','What people say afterwards.',151),
  ('home_testimonials_quote','Testimonials — quote text','Home page sections','The quote inside each review card','#sec-testimonials blockquote','“He caught the moments we never saw.”',152),

  ('home_connect_eyebrow','Connect — small label','Home page sections','','#sec-connect .eyebrow','Connect With Me',160),
  ('home_connect_heading','Connect — heading','Home page sections','','#sec-connect h2','Follow the work in progress.',161),
  ('home_connect_body','Connect — paragraph','Home page sections','','#sec-connect h2 ~ p','New frames and behind-the-scenes.',162),

  ('category_hero_eyebrow','Category page — small label','Category pages','','#category-hero .eyebrow','Previous Works',170),
  ('category_hero_title','Category page — title','Category pages','','#category-hero h1','Corporate Photography',171),
  ('category_hero_tagline','Category page — tagline','Category pages','','#category-hero p:not(.eyebrow)','Brand imagery with the composure of a boardroom.',172)
ON CONFLICT (role) DO NOTHING;ALTER TABLE public.theme_tokens
  ADD COLUMN IF NOT EXISTS default_dark_value text,
  ADD COLUMN IF NOT EXISTS default_dark_opacity integer,
  ADD COLUMN IF NOT EXISTS default_light_value text,
  ADD COLUMN IF NOT EXISTS default_light_opacity integer;

UPDATE public.theme_tokens
SET default_dark_value = COALESCE(default_dark_value, dark_value),
    default_dark_opacity = COALESCE(default_dark_opacity, dark_opacity),
    default_light_value = COALESCE(default_light_value, light_value),
    default_light_opacity = COALESCE(default_light_opacity, light_opacity);

INSERT INTO public.theme_tokens (token, label, group_label, hint, dark_value, dark_opacity, light_value, light_opacity, sort_order, default_dark_value, default_dark_opacity, default_light_value, default_light_opacity)
SELECT 'nav-surface', 'Mobile menu background', 'Surfaces', 'Background of the full-screen mobile navigation panel.', '#0a0a0a', 100, '#fafafa', 100, 55, '#0a0a0a', 100, '#fafafa', 100
WHERE NOT EXISTS (SELECT 1 FROM public.theme_tokens WHERE token = 'nav-surface');CREATE TABLE public.image_settings (
  path text PRIMARY KEY,
  indexable boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.image_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_settings TO authenticated;
GRANT ALL ON public.image_settings TO service_role;
ALTER TABLE public.image_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.image_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write" ON public.image_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER touch_image_settings BEFORE UPDATE ON public.image_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS in_gallery boolean NOT NULL DEFAULT true;CREATE TABLE public.custom_fonts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family text NOT NULL,
  source text NOT NULL DEFAULT 'google',
  css_url text NOT NULL DEFAULT '',
  weights text[] NOT NULL DEFAULT '{300,400,500,600,700}'::text[],
  styles text[] NOT NULL DEFAULT '{normal}'::text[],
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.custom_fonts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_fonts TO authenticated;
GRANT ALL ON public.custom_fonts TO service_role;

ALTER TABLE public.custom_fonts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON public.custom_fonts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin write" ON public.custom_fonts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER custom_fonts_touch BEFORE UPDATE ON public.custom_fonts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();-- 1. Private flag on any uploaded image (keyed by storage path, like indexable)
ALTER TABLE public.image_settings
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

-- 2. About photo + per-device default grid views
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS about_image text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS grid_home_desktop text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS grid_home_tablet text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS grid_home_mobile text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS grid_gallery_desktop text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS grid_gallery_tablet text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS grid_gallery_mobile text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS grid_category_desktop text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS grid_category_tablet text NOT NULL DEFAULT '2',
  ADD COLUMN IF NOT EXISTS grid_category_mobile text NOT NULL DEFAULT '2';

-- 3. Per-text "invert colours" switches for text sitting on photos
CREATE TABLE IF NOT EXISTS public.text_inverts (
  key text PRIMARY KEY,
  label text NOT NULL DEFAULT '',
  group_label text NOT NULL DEFAULT 'General',
  hint text NOT NULL DEFAULT '',
  inverted boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.text_inverts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.text_inverts TO authenticated;
GRANT ALL ON public.text_inverts TO service_role;
ALTER TABLE public.text_inverts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "text_inverts readable by everyone" ON public.text_inverts
  FOR SELECT USING (true);
CREATE POLICY "text_inverts writable by admins" ON public.text_inverts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_text_inverts BEFORE UPDATE ON public.text_inverts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.text_inverts (key, label, group_label, hint, sort_order) VALUES
  ('hero.title',      'Hero — category title',      'Home hero',      'Large title over the hero photo', 0),
  ('hero.eyebrow',    'Hero — small label',         'Home hero',      'The "01 — Wedding" line', 1),
  ('hero.tagline',    'Hero — tagline paragraph',   'Home hero',      'Sentence under the hero title', 2),
  ('hero.brand',      'Hero — ShutterRam wordmark', 'Home hero',      'The big studio name over the photo', 3),
  ('hero.buttons',    'Hero — buttons',             'Home hero',      'View more / Book your date', 4),
  ('category.cover',  'Category page — cover text', 'Category pages', 'Title and tagline over the cover photo', 5),
  ('gallery.caption', 'Gallery — hover caption',    'Galleries',      'Caption shown when hovering a photo', 6),
  ('service.card',    'Services — card text',       'Services',       'Title and subtitle over a service photo', 7),
  ('beforeafter.labels', 'Before / After labels',   'Editing samples','The BEFORE and AFTER tags on the slider', 8)
ON CONFLICT (key) DO NOTHING;

-- 4. Shareable category / gallery links
CREATE TABLE IF NOT EXISTS public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  scope text NOT NULL DEFAULT 'category',
  category_slug text NOT NULL DEFAULT '',
  include_private boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.share_links TO authenticated;
GRANT ALL ON public.share_links TO service_role;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "share_links managed by admins" ON public.share_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER touch_share_links BEFORE UPDATE ON public.share_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Token lookup for visitors: returns a single row only for an exact token match,
-- so the link list itself is never readable by the public.
CREATE OR REPLACE FUNCTION public.resolve_share_link(_token text)
RETURNS TABLE (scope text, category_slug text, include_private boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.scope, s.category_slug, s.include_private
  FROM public.share_links s
  WHERE s.token = _token
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.resolve_share_link(text) TO anon, authenticated;CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  visitor_id text NOT NULL DEFAULT '',
  referrer text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX page_views_created_at_idx ON public.page_views (created_at DESC);
CREATE INDEX page_views_path_idx ON public.page_views (path);

GRANT INSERT ON public.page_views TO anon;
GRANT INSERT, SELECT ON public.page_views TO authenticated;
GRANT ALL ON public.page_views TO service_role;

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a page view"
  ON public.page_views FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read page views"
  ON public.page_views FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS share_token text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS page_views_share_token_idx ON public.page_views (share_token) WHERE share_token <> '';ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS device_type text NOT NULL DEFAULT '';
ALTER TABLE public.share_links ADD COLUMN IF NOT EXISTS og_image text NOT NULL DEFAULT '';
ALTER TABLE public.share_links ADD COLUMN IF NOT EXISTS path text NOT NULL DEFAULT '';CREATE OR REPLACE FUNCTION public.share_link_og_image(_token text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.og_image FROM public.share_links s WHERE s.token = _token LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.share_link_og_image(text) TO anon, authenticated;ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS show_view_label boolean NOT NULL DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS show_in_hero boolean NOT NULL DEFAULT true;
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT '';
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT '';
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS city text NOT NULL DEFAULT '';
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS browser text NOT NULL DEFAULT '';
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS os text NOT NULL DEFAULT '';
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT '';
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT '';
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS screen_size text NOT NULL DEFAULT '';
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.record_view_duration(_id uuid, _seconds integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.page_views
  SET duration_seconds = LEAST(GREATEST(_seconds, 0), 7200)
  WHERE id = _id AND duration_seconds = 0;
$$;

GRANT EXECUTE ON FUNCTION public.record_view_duration(uuid, integer) TO anon, authenticated, service_role;REVOKE ALL ON FUNCTION public.resolve_share_link(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.share_link_og_image(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_view_duration(uuid, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.resolve_share_link(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.share_link_og_image(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_view_duration(uuid, integer) TO service_role;