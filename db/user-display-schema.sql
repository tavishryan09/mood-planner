-- User display settings table
CREATE TABLE IF NOT EXISTS user_display_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visible BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_user_display_settings_user_id ON user_display_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_display_settings_order ON user_display_settings(display_order);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_display_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_display_settings_updated_at
  BEFORE UPDATE ON user_display_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_display_settings_updated_at();
