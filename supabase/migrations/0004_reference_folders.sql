-- ============================================================================
-- Reference folders — organize the account reference library into folders,
-- visible across all documents. Run this in the Supabase SQL Editor.
-- ============================================================================

create table if not exists public.reference_folders (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
create index if not exists reference_folders_owner_idx on public.reference_folders (owner_id);

-- Add an optional folder reference to pooled references.
alter table public.reference_pool
  add column if not exists folder_id uuid references public.reference_folders (id) on delete set null;

-- RLS
alter table public.reference_folders enable row level security;
drop policy if exists reffolders_own on public.reference_folders;
create policy reffolders_own on public.reference_folders
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
