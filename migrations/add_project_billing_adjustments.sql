-- Add billing adjustment columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS currently_billed DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS adjustment_date DATE;

-- Note: adjusted_value will be calculated on-the-fly as projectValue - currentlyBilled
