-- Allow admins to upload directly to the approved bucket
CREATE POLICY "admins_upload_approved"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'approved'
  AND is_super_admin()
);
