-- Add compact_view column to planning_preferences table
ALTER TABLE planning_preferences
ADD COLUMN IF NOT EXISTS compact_view BOOLEAN DEFAULT FALSE;
