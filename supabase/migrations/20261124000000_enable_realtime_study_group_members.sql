-- Enable realtime for study_group_members table
-- This allows mobile/web clients to receive real-time updates when members join/leave groups
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE study_group_members;
  END IF;
END $$;
