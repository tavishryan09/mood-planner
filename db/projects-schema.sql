-- Projects table schema
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  project_number VARCHAR(50) UNIQUE,
  project_name VARCHAR(255) NOT NULL,
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  common_name VARCHAR(255),
  project_value DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on client_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_projects_updated_at();
