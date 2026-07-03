-- Change available_levels default from 4-year to 5-year (add 500)
-- Backfill programmes that currently have the old default to also include 500

-- 1. Change the default for new inserts
ALTER TABLE programmes ALTER COLUMN available_levels SET DEFAULT '{100,200,300,400,500}';

-- 2. Backfill: extend programmes still on the old 4-year default to include 500
--    Leave anything that already differs (e.g. has 600/700 for extended programmes,
--    or already includes 500, or has some other custom set) untouched.
UPDATE programmes
SET available_levels = ARRAY[100, 200, 300, 400, 500]
WHERE available_levels = ARRAY[100, 200, 300, 400];