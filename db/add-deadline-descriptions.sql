-- Add description columns for project deadlines and internal deadlines

-- Add deadline_description column
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS deadline_description TEXT;

-- Add internal_deadline_description column
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS internal_deadline_description TEXT;
