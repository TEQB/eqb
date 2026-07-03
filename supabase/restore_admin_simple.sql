-- Simple script to link an existing profile to a new auth user
-- This uses Supabase's internal auth.signup_user function

DO $$
DECLARE
    target_profile_id UUID := 'c0929045-236c-4856-b341-08417535def1'; -- The profile ID from your output
    admin_email TEXT := 'oladebojohn@gmail.com';
    admin_password TEXT := 'John1@fadot';
    new_auth_user_id UUID;
    signup_result JSONB;
BEGIN
    RAISE NOTICE 'Creating auth user for profile: %', target_profile_id;
    
    -- Generate a new UUID for the auth user
    new_auth_user_id := gen_random_uuid();
    
    -- Use Supabase's internal signup function
    -- This handles password hashing properly
    SELECT auth.signup_user(
        new_auth_user_id::text,
        admin_email,
        admin_password,
        admin_email,
        jsonb_build_object(
            'full_name', 'Oladebo John',
            'matric_number', 'ADMIN004',
            'role', 'super_admin'
        )
    ) INTO signup_result;
    
    RAISE NOTICE 'Auth user created: %', new_auth_user_id;
    RAISE NOTICE 'Signup result: %', signup_result;
    
    -- Update the profile with the new auth_user_id
    UPDATE profiles
    SET auth_user_id = new_auth_user_id
    WHERE id = target_profile_id;
    
    RAISE NOTICE 'Profile updated with new auth_user_id';
    RAISE NOTICE 'Done! User can now login with: %', admin_email;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE NOTICE 'Detail: %', SQLSTATE;
END $$;
