SELECT 'faculties' as tbl, count(*)::text as cnt FROM faculties
UNION ALL
SELECT 'programmes', count(*)::text FROM programmes
UNION ALL
SELECT 'courses', count(*)::text FROM courses
UNION ALL
SELECT 'general_courses', count(*)::text FROM courses WHERE scope = 'general'
UNION ALL
SELECT 'platform_settings', count(*)::text FROM platform_settings;
