-- THEParents: foundation schema (Phase 1).
-- Run in the Supabase SQL editor, or with `supabase db push`.
-- Money is stored as integer minor units with an explicit currency code.
-- Payments, subscriptions, refunds, charity allocations and audit logs arrive in later migrations.

create extension if not exists pgcrypto;

create type public.app_role as enum ('reader', 'contributor', 'moderator', 'admin');
create type public.article_status as enum ('draft', 'pending_review', 'published', 'rejected', 'archived');

-- Admin-configurable values (allowance, fee, membership price). Nothing is hardcoded in app code.
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (key, value) values
  ('free_publications_per_user', '2'),
  ('article_fee_minor', '2000'),
  ('currency', '"VND"'),
  ('membership_price_minor', 'null');  -- null = not set by the project owner yet

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  bio text check (char_length(bio) <= 500),
  avatar_url text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'vi', 'zh-CN', 'fr')),
  country text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_username_lower_idx on public.profiles (lower(username));

-- Roles live in their own table. No client policy allows writing here, so users cannot promote themselves.
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  primary key (user_id, role)
);

create function public.has_role(uid uuid, r public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = uid and role = r);
$$;

-- One row per user. free_used is only changed by server code (service role) when an article is approved for publication,
-- so editing, logging out or logging in again can never create extra free publications.
create table public.user_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  free_granted integer not null check (free_granted >= 0),
  free_used integer not null default 0 check (free_used >= 0),
  created_at timestamptz not null default now(),
  check (free_used <= free_granted)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  names jsonb not null,  -- {"en": "...", "vi": "...", "zh-CN": "...", "fr": "..."}
  sort_order integer not null default 0
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete restrict,
  slug text not null unique,
  title text not null check (char_length(title) between 3 and 200),
  subtitle text,
  summary text,
  body text not null default '',
  cover_image_url text,
  category_id uuid references public.categories (id),
  language text not null check (language in ('en', 'vi', 'zh-CN', 'fr')),
  status public.article_status not null default 'draft',
  moderation_feedback text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(body, ''))
  ) stored
);
create index articles_status_published_idx on public.articles (status, published_at desc);
create index articles_author_idx on public.articles (author_id, updated_at desc);
create index articles_search_idx on public.articles using gin (search);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);
create table public.article_tags (
  article_id uuid not null references public.articles (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (article_id, tag_id)
);
create table public.article_references (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  position integer not null,
  citation text not null,
  url text
);

create table public.bookmarks (
  user_id uuid not null references auth.users (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)  -- prevents duplicate bookmarks
);

-- New user: profile + default role + free allowance copied from site_settings at signup time.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  allowance integer;
begin
  select (value)::text::integer into allowance from public.site_settings where key = 'free_publications_per_user';

  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)));

  insert into public.user_roles (user_id, role) values (new.id, 'contributor');
  insert into public.user_entitlements (user_id, free_granted) values (new.id, coalesce(allowance, 2));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger articles_touch before update on public.articles for each row execute function public.touch_updated_at();

-- Row Level Security: enabled everywhere; tables with no policy are unreachable from the browser.
alter table public.site_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_entitlements enable row level security;
alter table public.categories enable row level security;
alter table public.articles enable row level security;
alter table public.tags enable row level security;
alter table public.article_tags enable row level security;
alter table public.article_references enable row level security;
alter table public.bookmarks enable row level security;

create policy "settings are public to read" on public.site_settings for select using (true);
-- (no write policy: only the service role / admin server code changes settings)

create policy "public profiles or own profile" on public.profiles for select
  using (is_public or id = auth.uid());
create policy "update own profile" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy "read own roles" on public.user_roles for select using (user_id = auth.uid());
create policy "read own entitlement" on public.user_entitlements for select using (user_id = auth.uid());

create policy "categories are public" on public.categories for select using (true);
create policy "tags are public" on public.tags for select using (true);

create policy "read published or own articles" on public.articles for select
  using (status = 'published' or author_id = auth.uid()
         or public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin'));
create policy "create own draft" on public.articles for insert
  with check (author_id = auth.uid() and status = 'draft');
-- Authors can edit only their own drafts/rejected articles and keep them as drafts.
-- Moving to pending_review / published happens in server code that checks entitlement, payment and moderation.
create policy "edit own draft" on public.articles for update
  using (author_id = auth.uid() and status in ('draft', 'rejected'))
  with check (author_id = auth.uid() and status = 'draft');
create policy "delete own draft" on public.articles for delete
  using (author_id = auth.uid() and status = 'draft');

create policy "read tags of visible articles" on public.article_tags for select
  using (exists (select 1 from public.articles a where a.id = article_id));
create policy "read references of visible articles" on public.article_references for select
  using (exists (select 1 from public.articles a where a.id = article_id));

create policy "own bookmarks: read" on public.bookmarks for select using (user_id = auth.uid());
create policy "own bookmarks: add" on public.bookmarks for insert with check (user_id = auth.uid());
create policy "own bookmarks: remove" on public.bookmarks for delete using (user_id = auth.uid());

insert into public.categories (slug, names, sort_order) values
  ('science', '{"en":"Science","vi":"Khoa học","zh-CN":"科学","fr":"Sciences"}', 1),
  ('technology', '{"en":"Technology and Programming","vi":"Công nghệ và Lập trình","zh-CN":"科技与编程","fr":"Technologie et programmation"}', 2),
  ('education', '{"en":"Education","vi":"Giáo dục","zh-CN":"教育","fr":"Éducation"}', 3),
  ('environment', '{"en":"Environment","vi":"Môi trường","zh-CN":"环境","fr":"Environnement"}', 4),
  ('health', '{"en":"Health and Well-being","vi":"Sức khỏe và Đời sống","zh-CN":"健康与生活","fr":"Santé et bien-être"}', 5),
  ('history', '{"en":"History","vi":"Lịch sử","zh-CN":"历史","fr":"Histoire"}', 6),
  ('culture', '{"en":"Culture and Languages","vi":"Văn hóa và Ngôn ngữ","zh-CN":"文化与语言","fr":"Culture et langues"}', 7),
  ('economics', '{"en":"Economics and Finance","vi":"Kinh tế và Tài chính","zh-CN":"经济与金融","fr":"Économie et finance"}', 8),
  ('society', '{"en":"Society and Psychology","vi":"Xã hội và Tâm lý","zh-CN":"社会与心理","fr":"Société et psychologie"}', 9),
  ('space', '{"en":"Space and Astronomy","vi":"Vũ trụ và Thiên văn","zh-CN":"太空与天文","fr":"Espace et astronomie"}', 10),
  ('engineering', '{"en":"Engineering and Automation","vi":"Kỹ thuật và Tự động hóa","zh-CN":"工程与自动化","fr":"Ingénierie et automatisation"}', 11),
  ('general', '{"en":"General Knowledge","vi":"Kiến thức chung","zh-CN":"常识","fr":"Culture générale"}', 12);
