-- Planning Tasks table
CREATE TABLE IF NOT EXISTS planning_tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  task_description TEXT NOT NULL,
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('Project Task', 'Out of Office', 'Unavailable')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_planning_tasks_user_id ON planning_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_planning_tasks_project_id ON planning_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_planning_tasks_dates ON planning_tasks(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_planning_tasks_task_type ON planning_tasks(task_type);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_planning_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_planning_tasks_updated_at
  BEFORE UPDATE ON planning_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_planning_tasks_updated_at();
