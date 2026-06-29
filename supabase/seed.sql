-- Seed data for University Past Questions Platform

-- 1. Faculty of Science
INSERT INTO faculties (name, slug)
VALUES ('Faculty of Science', 'faculty-of-science');

-- 2. Departments
INSERT INTO departments (faculty_id, name, slug, available_levels)
VALUES
  ((SELECT id FROM faculties WHERE slug = 'faculty-of-science'), 'Computer Science', 'computer-science', '{100,200,300,400}'),
  ((SELECT id FROM faculties WHERE slug = 'faculty-of-science'), 'Electrical Engineering', 'electrical-engineering', '{100,200,300,400,500}');

-- 3. Courses under Computer Science
INSERT INTO courses (department_id, code, title, level, scope)
VALUES
  ((SELECT id FROM departments WHERE slug = 'computer-science'), 'CSC 101', 'Introduction to Computer Science', 100, 'departmental'),
  ((SELECT id FROM departments WHERE slug = 'computer-science'), 'CSC 201', 'Data Structures and Algorithms', 200, 'departmental'),
  ((SELECT id FROM departments WHERE slug = 'computer-science'), 'CSC 301', 'Database Systems', 300, 'departmental');

-- 4. General courses (no department_id — scope = 'general')
INSERT INTO courses (code, title, level, scope)
VALUES
  ('GST 101', 'Use of English', 100, 'general'),
  ('ENT 201', 'Entrepreneurship', 200, 'general');
