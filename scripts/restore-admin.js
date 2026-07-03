// Script to restore deleted admin accounts
// Run with: node scripts/restore-admin.js
// Requires: npm install @supabase/supabase-js dotenv

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration - UPDATE THESE
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const ADMIN_EMAIL = 'ifejohn026@gmail.com';
const ADMIN_PASSWORD = 'tempPassword123!'; // Change after login
const ADMIN_NAME = 'Ife John';
const ADMIN_MATRIC = 'ADMIN006'; // must be unique

async function restoreAdmin() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_ROLE_KEY') {
    console.error('ERROR: Please update SUPABASE_URL and SUPABASE_SERVICE_KEY in the script');
    console.error('Or set them as environment variables');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log(`Creating admin account for: ${ADMIN_EMAIL}`);

    // Get a programme_id
    const { data: programmes, error: progError } = await supabase
      .from('programmes')
      .select('id')
      .limit(1);

    if (progError) throw progError;
    if (!programmes || programmes.length === 0) {
      throw new Error('No programmes found in database');
    }

    const programmeId = programmes[0].id;
    console.log(`Using programme_id: ${programmeId}`);

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('matric_number', ADMIN_MATRIC)
      .single();

    if (existingProfile) {
      console.log('Profile already exists with matric:', ADMIN_MATRIC);
      console.log('Profile ID:', existingProfile.id);
      console.log('Current auth_user_id:', existingProfile.auth_user_id);

      // Check if auth user exists
      const { data: users } = await supabase.auth.admin.listUsers();
      const authUserExists = users.users?.find(u => u.id === existingProfile.auth_user_id);

      if (authUserExists) {
        console.log('Auth user already exists. Account is complete.');
        console.log('Email:', authUserExists.email);
        console.log('IMPORTANT: Have the admin reset their password if needed');
        return;
      }

      console.log('Profile exists but auth user does not. Creating auth user...');

      // Create auth user and update profile
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: ADMIN_NAME,
          matric_number: ADMIN_MATRIC,
          programme_id: programmeId,
          current_level: 100,
          role: 'super_admin'
        }
      });

      if (userError) {
        console.error('Failed to create auth user:', userError.message);
        throw userError;
      }

      console.log('Auth user created:', userData.user.id);

      // Update the existing profile with the new auth_user_id
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ auth_user_id: userData.user.id })
        .eq('id', existingProfile.id);

      if (updateError) {
        console.error('Failed to update profile:', updateError.message);
        throw updateError;
      }

      console.log('Profile updated with new auth_user_id');
      console.log('Admin account restored successfully!');
      console.log('Email:', ADMIN_EMAIL);
      console.log('IMPORTANT: Have the admin change their password after first login');
      return;
    }

    // Profile doesn't exist, create everything from scratch
    console.log('No existing profile found. Creating new account...');

    // Create the auth user using Supabase Auth Admin API
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: ADMIN_NAME,
        matric_number: ADMIN_MATRIC,
        programme_id: programmeId,
        current_level: 100,
        role: 'super_admin'
      }
    });

    if (userError) {
      console.error('Failed to create auth user:', userError.message);
      throw userError;
    }

    console.log('Auth user created successfully');
    
    // The trigger should create the profile, but let's verify
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', userData.user.id)
      .single();

    if (!profile) {
      // Manually create profile if trigger didn't fire
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: userData.user.id,
          full_name: ADMIN_NAME,
          matric_number: ADMIN_MATRIC,
          programme_id: programmeId,
          current_level: 100,
          role: 'super_admin'
        });

      if (profileError) throw profileError;
    }

    console.log('Admin account created successfully!');
    console.log('Email:', ADMIN_EMAIL);
    console.log('IMPORTANT: Have the admin change their password after first login');

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

restoreAdmin();
