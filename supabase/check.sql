SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
SELECT 'trigger_found' as status;
