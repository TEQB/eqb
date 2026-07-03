-- Script to delete a student while preserving their uploads and activities
-- This reassigns all their data to a "deleted_user" placeholder before deletion

-- Variables to customize
DO $$
DECLARE
    target_email TEXT := 'john.oladebo@tech-u.edu.ng';
    target_profile_id UUID;
    target_auth_user_id UUID;
    deleted_profile_id UUID;
    deleted_auth_user_id UUID;
BEGIN
    -- 1. Find the target student by email from auth.users
    SELECT id INTO target_auth_user_id
    FROM auth.users
    WHERE email = target_email
    LIMIT 1;

    IF target_auth_user_id IS NULL THEN
        RAISE NOTICE 'No auth user found for email: %', target_email;
        RETURN;
    END IF;

    -- Get the profile using auth_user_id
    SELECT id INTO target_profile_id
    FROM profiles
    WHERE auth_user_id = target_auth_user_id
    LIMIT 1;

    IF target_profile_id IS NULL THEN
        RAISE NOTICE 'No profile found for auth_user_id: %', target_auth_user_id;
        RETURN;
    END IF;

    RAISE NOTICE 'Found profile: %, auth_user_id: %', target_profile_id, target_auth_user_id;

    -- 2. Ensure a "deleted_user" placeholder exists
    SELECT id, auth_user_id INTO deleted_profile_id, deleted_auth_user_id
    FROM profiles
    WHERE matric_number = 'DELETED_USER'
    LIMIT 1;

    IF deleted_profile_id IS NULL THEN
        -- Get a valid programme_id
        DECLARE
            valid_programme_id UUID;
        BEGIN
            SELECT id INTO valid_programme_id FROM programmes LIMIT 1;
            
            IF valid_programme_id IS NULL THEN
                RAISE EXCEPTION 'No programmes found in database. Cannot create deleted_user placeholder.';
            END IF;

            -- Temporarily disable the trigger to avoid FK violation
            DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

            -- Create a deleted user placeholder in auth
            INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
            VALUES (
                gen_random_uuid(),
                'deleted_user@system.local',
                '', -- empty password
                NOW(),
                jsonb_build_object(
                    'full_name', 'Deleted User',
                    'matric_number', 'DELETED_USER',
                    'programme_id', valid_programme_id,
                    'current_level', 100,
                    'role', 'student'
                )
            )
            RETURNING id INTO deleted_auth_user_id;

            -- Manually create the profile
            INSERT INTO profiles (
                auth_user_id,
                full_name,
                matric_number,
                programme_id,
                current_level,
                role
            ) VALUES (
                deleted_auth_user_id,
                'Deleted User',
                'DELETED_USER',
                valid_programme_id,
                100,
                'student'
            )
            RETURNING id INTO deleted_profile_id;

            -- Recreate the trigger
            CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION handle_new_user();

            RAISE NOTICE 'Created deleted_user placeholder: %', deleted_profile_id;
        END;
    ELSE
        RAISE NOTICE 'Using existing deleted_user placeholder: %', deleted_profile_id;
    END IF;

    -- 3. Reassign all references to preserve data
    
    -- Reassign solutions
    UPDATE solutions SET submitted_by = deleted_profile_id WHERE submitted_by = target_profile_id;
    RAISE NOTICE 'Reassigned solutions';

    -- Reassign solution votes
    UPDATE solution_votes SET voter_id = deleted_profile_id WHERE voter_id = target_profile_id;
    RAISE NOTICE 'Reassigned solution votes';

    -- Reassign solution ratings
    UPDATE solution_ratings SET rater_id = deleted_profile_id WHERE rater_id = target_profile_id;
    RAISE NOTICE 'Reassigned solution ratings';

    -- Reassign flags
    UPDATE flags SET flagged_by = deleted_profile_id WHERE flagged_by = target_profile_id;
    RAISE NOTICE 'Reassigned flags';

    -- Reassign feedback messages
    UPDATE feedback_messages SET profile_id = deleted_profile_id WHERE profile_id = target_profile_id;
    RAISE NOTICE 'Reassigned feedback messages';

    -- Reassign past_questions (uploaded_by has ON DELETE SET NULL, but we reassign to preserve attribution)
    UPDATE past_questions SET uploaded_by = deleted_profile_id WHERE uploaded_by = target_profile_id;
    RAISE NOTICE 'Reassigned past_questions';

    -- 4. Delete from pending_registrations if exists
    DELETE FROM pending_registrations WHERE email = target_email;
    RAISE NOTICE 'Deleted from pending_registrations';

    -- 5. Delete from pending_otps if exists
    DELETE FROM pending_otps WHERE email = target_email;
    RAISE NOTICE 'Deleted from pending_otps';

    -- 6. Delete the profile
    DELETE FROM profiles WHERE id = target_profile_id;
    RAISE NOTICE 'Deleted profile';

    -- 7. Delete from auth.users
    DELETE FROM auth.users WHERE id = target_auth_user_id;
    RAISE NOTICE 'Deleted auth user';

    RAISE NOTICE 'Successfully deleted student % while preserving all data', target_email;
END $$;
