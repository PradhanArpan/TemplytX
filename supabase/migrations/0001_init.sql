-- TemplytX — initial schema
-- Solo ownership (owner_id per document), RLS scoped to the owner.
-- Deliberately shaped so a future `document_members` table can add sharing
-- WITHOUT altering these tables: access goes through has_document_access(),
-- so later we extend that one function instead of rewriting every policy.

-- ---------------------------------------------------------------------------
-- profiles: 1:1 with auth.users, created on signup by trigger
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  institution text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- templates: submission targets (IEEE, Springer, Elsevier, APA, thesis).
-- Global/read-only to users; seeded by us. No owner.
-- ---------------------------------------------------------------------------
create table public.templates (
  id             text primary key,          -- e.g. 'tpl-ieee'
  name           text not null,
  publisher      text not null,
  citation_style text not null,
  layout_spec    jsonb not null default '{}'::jsonb,
  rules          jsonb not null default '[]'::jsonb,
  is_active      boolean not null default true
);

-- ---------------------------------------------------------------------------
-- documents: the block model lives in `blocks` (jsonb). One owner in V1.
-- ---------------------------------------------------------------------------
create table public.documents (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references auth.users (id) on delete cascade,
  title              text not null default 'Untitled',
  target_template_id text references public.templates (id),
  status             text not null default 'draft'
                       check (status in ('draft','checked','ready')),
  readiness_score    int check (readiness_score between 0 and 100),
  blocks             jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index documents_owner_id_idx on public.documents (owner_id);

-- ---------------------------------------------------------------------------
-- references: bibliography entries as CSL-JSON, ordered per document
-- ---------------------------------------------------------------------------
create table public.document_references (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  csl_json    jsonb not null,
  position    int  not null default 0
);
create index document_references_document_id_idx
  on public.document_references (document_id);

-- ---------------------------------------------------------------------------
-- compliance_runs: history of on-demand checks (score + issue snapshot)
-- ---------------------------------------------------------------------------
create table public.compliance_runs (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  ran_at      timestamptz not null default now(),
  score       int not null check (score between 0 and 100),
  results     jsonb not null default '[]'::jsonb
);
create index compliance_runs_document_id_idx
  on public.compliance_runs (document_id);

-- ---------------------------------------------------------------------------
-- Access helper: the ONE place document access is decided.
-- Today: owner only. Future sharing = extend this function (add a members
-- lookup) and every policy below inherits it. No policy rewrites needed.
-- ---------------------------------------------------------------------------
create or replace function public.has_document_access(doc_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.documents d
    where d.id = doc_id and d.owner_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Keep updated_at fresh on documents
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_touch_updated_at
  before update on public.documents
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table public.profiles            enable row level security;
alter table public.templates           enable row level security;
alter table public.documents           enable row level security;
alter table public.document_references enable row level security;
alter table public.compliance_runs     enable row level security;

-- profiles: a user sees and edits only their own row
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid());

-- templates: readable by any authenticated user; no client writes
create policy templates_select_all on public.templates
  for select to authenticated using (true);

-- documents: full control for the owner (V1). Sharing later widens the USING
-- clauses to has_document_access() for select; writes can stay owner-scoped.
create policy documents_select on public.documents
  for select using (owner_id = auth.uid());
create policy documents_insert on public.documents
  for insert with check (owner_id = auth.uid());
create policy documents_update on public.documents
  for update using (owner_id = auth.uid());
create policy documents_delete on public.documents
  for delete using (owner_id = auth.uid());

-- child tables: access routed through has_document_access() so future
-- sharing is a one-function change, not a per-table rewrite
create policy references_all on public.document_references
  for all using (public.has_document_access(document_id))
  with check (public.has_document_access(document_id));

create policy compliance_runs_select on public.compliance_runs
  for select using (public.has_document_access(document_id));
create policy compliance_runs_insert on public.compliance_runs
  for insert with check (public.has_document_access(document_id));
