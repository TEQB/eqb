SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
