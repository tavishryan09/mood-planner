-- Dashboard widget settings table
CREATE TABLE IF NOT EXISTS dashboard_widget_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  widget_id VARCHAR(50) NOT NULL,
  widget_name VARCHAR(100) NOT NULL,
  width VARCHAR(10) NOT NULL CHECK (width IN ('full', '1/2', '1/3', '1/4')),
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, widget_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_widget_settings_user_id ON dashboard_widget_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widget_settings_order ON dashboard_widget_settings(user_id, display_order);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dashboard_widget_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dashboard_widget_settings_updated_at
  BEFORE UPDATE ON dashboard_widget_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_widget_settings_updated_at();
