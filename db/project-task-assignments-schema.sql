-- Schema for project task assignments (many-to-many relationship)
CREATE TABLE IF NOT EXISTS project_task_assignments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON project_task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON project_task_assignments(user_id);
