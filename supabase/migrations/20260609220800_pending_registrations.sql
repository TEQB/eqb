CREATE TABLE IF NOT EXISTS pending_registrations (
  email text PRIMARY KEY,
  full_name text NOT NULL,
  matric_number text NOT NULL,
  department_id uuid NOT NULL,
  current_level int NOT NULL,
  created_at timestamptz DEFAULT now()
);
