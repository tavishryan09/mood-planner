import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function initMilestoneTasks() {
  console.log('Initializing milestone tasks table...');

  try {
    // Create milestone_tasks table
    await sql`
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
      )
    `;
    console.log('✓ Created milestone_tasks table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_milestone_tasks_project_id ON milestone_tasks(project_id)`;
    console.log('✓ Created project_id index');

    await sql`CREATE INDEX IF NOT EXISTS idx_milestone_tasks_task_date ON milestone_tasks(task_date)`;
    console.log('✓ Created task_date index');

    await sql`CREATE INDEX IF NOT EXISTS idx_milestone_tasks_task_type ON milestone_tasks(task_type)`;
    console.log('✓ Created task_type index');

    // Create update trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_milestone_tasks_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS trigger_update_milestone_tasks_updated_at ON milestone_tasks
    `;

    await sql`
      CREATE TRIGGER trigger_update_milestone_tasks_updated_at
      BEFORE UPDATE ON milestone_tasks
      FOR EACH ROW
      EXECUTE FUNCTION update_milestone_tasks_updated_at()
    `;
    console.log('✓ Created update trigger');

    console.log('\n✓ Milestone tasks table initialized successfully!');
  } catch (error) {
    console.error('Error initializing milestone tasks table:', error);
    process.exit(1);
  }
}

initMilestoneTasks();
