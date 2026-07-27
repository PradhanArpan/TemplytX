-- ============================================================================
-- Phase 3: Labels (replaces single-folder model with many-to-many tags).
-- Run this in the Supabase SQL Editor. Safe to run once.
-- ============================================================================

-- Reuse the existing reference_folders table as "labels" (already per-owner
-- with RLS). We add a many-to-many join so a reference can carry many labels.
create table if not exists public.reference_label_links (
  reference_id uuid not null references public.reference_pool (id) on delete cascade,
  label_id     uuid not null references public.reference_folders (id) on delete cascade,
  owner_id     uuid not null references auth.users (id) on delete cascade,
  primary key (reference_id, label_id)
);
create index if not exists ref_label_links_owner_idx on public.reference_label_links (owner_id);
create index if not exists ref_label_links_label_idx on public.reference_label_links (label_id);

alter table public.reference_label_links enable row level security;
drop policy if exists ref_label_links_own on public.reference_label_links;
create policy ref_label_links_own on public.reference_label_links
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Per-document reference working-set: which references are pulled into a doc.
-- (A new document starts with none; a reference joins when cited or added.)
create table if not exists public.document_references (
  document_id  uuid not null references public.documents (id) on delete cascade,
  reference_id uuid not null references public.reference_pool (id) on delete cascade,
  owner_id     uuid not null references auth.users (id) on delete cascade,
  primary key (document_id, reference_id)
);
create index if not exists doc_refs_owner_idx on public.document_references (owner_id);
create index if not exists doc_refs_doc_idx on public.document_references (document_id);

alter table public.document_references enable row level security;
drop policy if exists doc_refs_own on public.document_references;
create policy doc_refs_own on public.document_references
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
