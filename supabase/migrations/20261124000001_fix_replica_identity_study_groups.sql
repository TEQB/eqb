-- Fix replica identity for study_groups tables to enable proper realtime
-- Tables with PRIMARY KEY should have REPLICA IDENTITY DEFAULT (or FULL)
-- for PostgreSQL logical replication to work correctly with Supabase Realtime

ALTER TABLE study_group_messages REPLICA IDENTITY DEFAULT;
ALTER TABLE study_group_members REPLICA IDENTITY DEFAULT;
