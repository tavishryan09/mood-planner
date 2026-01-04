-- Milestone Tasks table
CREATE TABLE IF NOT EXISTS milestone_tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  task_description TEXT,
  task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('Deadline', 'Internal Deadline', 'Milestone')),
  task_date DATE NOT NULL,
  row_index INTEGER NOT NULL CHECK (row_index IN (0, 1)),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_date, row_index)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_project_id ON milestone_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_task_date ON milestone_tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_task_type ON milestone_tasks(task_type);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_milestone_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_milestone_tasks_updated_at
  BEFORE UPDATE ON milestone_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_milestone_tasks_updated_at();
