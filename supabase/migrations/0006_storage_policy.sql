-- ============================================================================
-- Storage policies for the `figures` bucket.
-- Run in Supabase SQL Editor AFTER creating the public `figures` bucket.
-- Allows logged-in users to upload; anyone to read (bucket is public).
-- ============================================================================

-- Authenticated users can upload to the figures bucket.
drop policy if exists "figures_insert" on storage.objects;
create policy "figures_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'figures');

-- Authenticated users can update/delete their own uploads.
drop policy if exists "figures_update" on storage.objects;
create policy "figures_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'figures' and owner = auth.uid());

drop policy if exists "figures_delete" on storage.objects;
create policy "figures_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'figures' and owner = auth.uid());

-- Public read (bucket is public, but this makes it explicit).
drop policy if exists "figures_read" on storage.objects;
create policy "figures_read" on storage.objects
  for select to public
  using (bucket_id = 'figures');
