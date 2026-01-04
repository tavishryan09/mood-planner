import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function initPlanningDB() {
  console.log('Initializing planning tasks database...');

  try {
    // Create planning_tasks table
    await sql`
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
      )
    `;
    console.log('✓ Created planning_tasks table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_planning_tasks_user_id ON planning_tasks(user_id)`;
    console.log('✓ Created user_id index');

    await sql`CREATE INDEX IF NOT EXISTS idx_planning_tasks_project_id ON planning_tasks(project_id)`;
    console.log('✓ Created project_id index');

    await sql`CREATE INDEX IF NOT EXISTS idx_planning_tasks_dates ON planning_tasks(start_date, end_date)`;
    console.log('✓ Created dates index');

    await sql`CREATE INDEX IF NOT EXISTS idx_planning_tasks_task_type ON planning_tasks(task_type)`;
    console.log('✓ Created task_type index');

    // Create update trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_planning_tasks_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS trigger_update_planning_tasks_updated_at ON planning_tasks
    `;

    await sql`
      CREATE TRIGGER trigger_update_planning_tasks_updated_at
      BEFORE UPDATE ON planning_tasks
      FOR EACH ROW
      EXECUTE FUNCTION update_planning_tasks_updated_at()
    `;
    console.log('✓ Created update trigger');

    console.log('\nPlanning tasks database initialized successfully!');
  } catch (error) {
    console.error('Error initializing planning tasks database:', error);
    process.exit(1);
  }
}

initPlanningDB();
