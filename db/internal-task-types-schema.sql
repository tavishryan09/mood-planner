-- Internal Task Types table
CREATE TABLE IF NOT EXISTS internal_task_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default internal task types
INSERT INTO internal_task_types (name)
VALUES ('Admin'), ('Marketing')
ON CONFLICT (name) DO NOTHING;

-- Index
CREATE INDEX IF NOT EXISTS idx_internal_task_types_name ON internal_task_types(name);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_internal_task_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_internal_task_types_updated_at
  BEFORE UPDATE ON internal_task_types
  FOR EACH ROW
  EXECUTE FUNCTION update_internal_task_types_updated_at();
