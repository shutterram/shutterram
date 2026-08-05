-- 1. Editable site copy -------------------------------------------------
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
grant select on public.settings to authenticated;