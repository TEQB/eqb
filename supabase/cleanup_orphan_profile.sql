-- Delete the orphaned profile so we can recreate the admin account properly
-- This removes the profile that has no corresponding auth user

DELETE FROM profiles 
WHERE id = 'c0929045-236c-4856-b341-08417535def1';

-- Verify deletion
SELECT 'Profile deleted' as status;
