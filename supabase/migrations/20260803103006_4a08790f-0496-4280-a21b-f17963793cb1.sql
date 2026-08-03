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
end $$;