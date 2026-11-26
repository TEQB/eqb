-- Allow the new 'e-admin' role on group members
ALTER TABLE study_group_members DROP CONSTRAINT IF EXISTS study_group_members_role_check;
ALTER TABLE study_group_members ADD CONSTRAINT study_group_members_role_check
  CHECK (role IN ('admin', 'member', 'e-admin'));

-- Auto-add all super admins to every study group as "e-admin" members
CREATE OR REPLACE FUNCTION add_eadmins_to_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO study_group_members (group_id, profile_id, role)
  SELECT NEW.id, p.id, 'e-admin'
  FROM profiles p
  WHERE p.role = 'super_admin'
  ON CONFLICT (group_id, profile_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_eadmins_on_group_create ON study_groups;
CREATE TRIGGER trg_eadmins_on_group_create
  AFTER INSERT ON study_groups
  FOR EACH ROW EXECUTE FUNCTION add_eadmins_to_group();

-- Backfill: add e-admins to all existing active groups
INSERT INTO study_group_members (group_id, profile_id, role)
SELECT g.id, p.id, 'e-admin'
FROM study_groups g
CROSS JOIN profiles p
WHERE p.role = 'super_admin' AND g.is_active = true
ON CONFLICT (group_id, profile_id) DO NOTHING;
