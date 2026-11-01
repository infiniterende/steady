-- Private bucket for journal photos. Objects live under <user id>/<day>/<file>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('journal', 'journal', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Each user may only read, add and delete objects inside their own folder.
drop policy if exists "journal photos: owner read" on storage.objects;
create policy "journal photos: owner read" on storage.objects
  for select to authenticated
  using (bucket_id = 'journal' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "journal photos: owner insert" on storage.objects;
create policy "journal photos: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'journal' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "journal photos: owner delete" on storage.objects;
create policy "journal photos: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'journal' and (storage.foldername(name))[1] = auth.uid()::text);
