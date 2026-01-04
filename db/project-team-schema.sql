-- Project team members table (junction table)
CREATE TABLE IF NOT EXISTS project_team_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_team_project_id ON project_team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_user_id ON project_team_members(user_id);
