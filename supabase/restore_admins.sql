-- Script to restore deleted admin accounts
-- Run this to recreate admin accounts that were accidentally deleted

-- WARNING: This will create new admin accounts. You need to provide the admin details below.

DO $$
DECLARE
    admin_email TEXT := 'admin@tech-u.edu.ng'; -- CHANGE THIS to the admin email
    admin_password TEXT := 'Admin123!'; -- CHANGE THIS to a temporary password
    admin_name TEXT := 'Admin User'; -- CHANGE THIS to the admin name
    admin_matric TEXT := 'ADMIN001'; -- CHANGE THIS to admin matric number
    admin_programme_id UUID;
    new_auth_user_id UUID;
    new_profile_id UUID;
BEGIN
    -- Get a valid programme_id (required for profile creation)
    SELECT id INTO admin_programme_id FROM programmes LIMIT 1;
    
    IF admin_programme_id IS NULL THEN
        RAISE EXCEPTION 'No programmes found. Cannot create admin account.';
    END IF;

    RAISE NOTICE 'Creating admin account for: %', admin_email;

    -- Temporarily disable the trigger
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

    -- Create the auth user
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
    VALUES (
        gen_random_uuid(),
        admin_email,
        crypt(admin_password, gen_salt('bf')), -- Hash the password
        NOW(),
        jsonb_build_object(
            'full_name', admin_name,
            'matric_number', admin_matric,
            'programme_id', admin_programme_id,
            'current_level', 100,
            'role', 'admin'
        )
    )
    RETURNING id INTO new_auth_user_id;

    -- Create the profile with super_admin role
    INSERT INTO profiles (
        auth_user_id,
        full_name,
        matric_number,
        programme_id,
        current_level,
        role
    ) VALUES (
        new_auth_user_id,
        admin_name,
        admin_matric,
        admin_programme_id,
        100,
        'super_admin'
    )
    RETURNING id INTO new_profile_id;

    -- Recreate the trigger
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

    RAISE NOTICE 'Admin account created successfully. Email: %, Profile ID: %', admin_email, new_profile_id;
    RAISE NOTICE 'IMPORTANT: Change the password immediately after first login!';
END $$;

-- If you need to restore multiple admins, repeat the block above with different credentials
