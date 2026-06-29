-- Restrict pending bucket uploads to allowed MIME types
DROP POLICY IF EXISTS "authenticated_upload_pending" ON storage.objects;
CREATE POLICY "authenticated_upload_pending"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pending'
  AND content_type IN ('application/pdf', 'image/jpeg', 'image/png')
);

-- Restrict approved bucket uploads to same MIME types
DROP POLICY IF EXISTS "authenticated_upload_approved" ON storage.objects;
CREATE POLICY "authenticated_upload_approved"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'approved'
  AND content_type IN ('application/pdf', 'image/jpeg', 'image/png')
);
