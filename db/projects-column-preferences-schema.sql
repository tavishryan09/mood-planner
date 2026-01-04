-- Projects column preferences table
CREATE TABLE IF NOT EXISTS projects_column_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  column_settings JSONB NOT NULL DEFAULT '{
    "projectNumber": true,
    "projectName": true,
    "clientName": true,
    "commonName": true,
    "projectValue": true,
    "estimatedBillable": true,
    "billablePercent": true,
    "totalHours": true,
    "hoursThisWeek": true,
    "hoursThisMonth": true,
    "hoursThisQuarter": true
  }'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_projects_column_preferences_user_id ON projects_column_preferences(user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_projects_column_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_projects_column_preferences_updated_at
  BEFORE UPDATE ON projects_column_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_column_preferences_updated_at();
