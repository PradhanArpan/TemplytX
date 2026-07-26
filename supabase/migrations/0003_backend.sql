-- ============================================================================
-- TemplytX backend schema (current model)
-- Run this in the Supabase SQL Editor. Safe to run once on a fresh project.
-- Solo ownership: every row belongs to one user (auth.uid()); Row-Level
-- Security ensures users only ever see their own data. Sharing-ready: a
-- future document_members table can extend access without altering this.
-- ============================================================================

-- --- profiles: one per user, auto-created on signup -------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  institution text,
  created_at  timestamptz not null default now()
);

-- --- documents: the whole document as JSON (blocks, authors, refs) ----------
-- We store the rich structures as jsonb so the app's model and the database
-- stay in lockstep without brittle per-field columns.
create table if not exists public.documents (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users (id) on delete cascade,
  title              text not null default 'Untitled',
  authors            jsonb not null default '[]'::jsonb,
  target_template_id text,
  status             text not null default 'draft',
  readiness_score    int,
  blocks             jsonb not null default '[]'::jsonb,
  doc_references      jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists documents_owner_idx on public.documents (owner_id);

-- --- reference_pool: account-level reference library (like Mendeley) --------
create table if not exists public.reference_pool (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  data       jsonb not null,        -- the Reference object
  created_at timestamptz not null default now()
);
create index if not exists reference_pool_owner_idx on public.reference_pool (owner_id);

-- --- uploaded_templates: user's own templates (metadata; file later) --------
create table if not exists public.uploaded_templates (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  type       text not null,
  file_name  text,
  size_bytes int,
  created_at timestamptz not null default now()
);
create index if not exists uploaded_templates_owner_idx on public.uploaded_templates (owner_id);

-- --- keep updated_at fresh on documents -------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists documents_touch on public.documents;
create trigger documents_touch before update on public.documents
  for each row execute function public.touch_updated_at();

-- --- auto-create a profile row on signup ------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row-Level Security: users see and change ONLY their own rows
-- ============================================================================
alter table public.profiles            enable row level security;
alter table public.documents           enable row level security;
alter table public.reference_pool      enable row level security;
alter table public.uploaded_templates  enable row level security;

-- profiles
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- documents
drop policy if exists documents_own on public.documents;
create policy documents_own on public.documents
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- reference_pool
drop policy if exists refpool_own on public.reference_pool;
create policy refpool_own on public.reference_pool
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- uploaded_templates
drop policy if exists uptpl_own on public.uploaded_templates;
create policy uptpl_own on public.uploaded_templates
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
