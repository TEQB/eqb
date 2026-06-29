-- Storage bucket for solution file attachments
insert into storage.buckets (id, name, public)
values ('solutions', 'solutions', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload solutions
CREATE POLICY "authenticated_upload_solutions"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'solutions'
  AND content_type IN ('application/pdf', 'image/jpeg', 'image/png')
);

-- Allow anyone to read solution files
CREATE POLICY "anyone_read_solutions"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'solutions');
