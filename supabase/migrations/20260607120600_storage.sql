-- Storage buckets
insert into storage.buckets (id, name, public)
values ('pending', 'pending', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('approved', 'approved', true)
on conflict (id) do nothing;

-- Storage policies
CREATE POLICY "authenticated_upload_pending"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pending');

CREATE POLICY "service_role_all_storage"
ON storage.objects
TO service_role
USING (true)
WITH CHECK (true);
