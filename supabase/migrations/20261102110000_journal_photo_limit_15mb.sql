-- Raise the per-photo limit on the journal bucket from 8 MB to 15 MB.
update storage.buckets set file_size_limit = 15728640 where id = 'journal';
