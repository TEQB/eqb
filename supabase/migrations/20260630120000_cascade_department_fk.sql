-- Add CASCADE to profiles.department_id so departments can be deleted
-- without blocking on foreign key constraints
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_department_id_fkey,
  ADD CONSTRAINT profiles_department_id_fkey
    FOREIGN KEY (department_id)
    REFERENCES departments(id)
    ON DELETE CASCADE;

-- Also add CASCADE to profiles current_level referencing departments
-- (for cases where level validity is department-scoped)
-- Note: this column doesn't appear to have an FK, so this is a no-op
-- included for documentation only if needed later