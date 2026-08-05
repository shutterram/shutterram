
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
