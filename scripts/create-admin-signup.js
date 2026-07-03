// Alternative script to create admin using regular signup flow
// Run with: node scripts/create-admin-signup.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL = 'ifeoluwa.bankole05@gmail.com';
const ADMIN_PASSWORD = 'bankole1234';
const ADMIN_NAME = 'Ife Banks';
const ADMIN_MATRIC = 'ADMIN005'; // must be unique

async function createAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Use service role client for admin operations
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('Creating admin account using signup flow...');

    // Get programme_id
    const { data: programmes } = await supabase
      .from('programmes')
      .select('id')
      .limit(1);

    if (!programmes || programmes.length === 0) {
      throw new Error('No programmes found');
    }

    const programmeId = programmes[0].id;

    // Sign up the user (this creates auth user properly)
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      options: {
        data: {
          full_name: ADMIN_NAME,
          matric_number: ADMIN_MATRIC,
          programme_id: programmeId,
          current_level: 100,
          role: 'super_admin'
        }
      }
    });

    if (signUpError) {
      console.error('Signup error:', signUpError);
      throw signUpError;
    }

    console.log('Auth user created:', authData.user?.id);

    // The trigger should create the profile, but let's verify
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (!profile) {
      console.log('Trigger did not create profile, creating manually...');
      
      // Create profile manually
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: authData.user.id,
          full_name: ADMIN_NAME,
          matric_number: ADMIN_MATRIC,
          programme_id: programmeId,
          current_level: 100,
          role: 'super_admin'
        });

      if (profileError) throw profileError;
    }

    // Update role to super_admin if needed
    await supabase
      .from('profiles')
      .update({ role: 'super_admin' })
      .eq('auth_user_id', authData.user.id);

    console.log('Admin account created successfully!');
    console.log('Email:', ADMIN_EMAIL);
    console.log('User ID:', authData.user.id);

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

createAdmin();
