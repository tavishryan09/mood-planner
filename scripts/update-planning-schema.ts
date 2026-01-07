import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function updatePlanningSchema() {
  console.log('Updating planning tasks schema...');

  try {
    // Drop the old table
    await sql`DROP TABLE IF EXISTS planning_tasks CASCADE`;
    console.log('✓ Dropped old planning_tasks table');

    // Create new planning_tasks table with simpler structure
    await sql`
      CREATE TABLE planning_tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        task_description TEXT NOT NULL,
        task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('Project Task', 'Out of Office', 'Unavailable')),
        task_date DATE NOT NULL,
        row_index INTEGER NOT NULL CHECK (row_index >= 0 AND row_index < 20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, task_date, row_index)
      )
    `;
    console.log('✓ Created new planning_tasks table');

    // Create indexes
    await sql`CREATE INDEX idx_planning_tasks_user_id ON planning_tasks(user_id)`;
    console.log('✓ Created user_id index');

    await sql`CREATE INDEX idx_planning_tasks_project_id ON planning_tasks(project_id)`;
    console.log('✓ Created project_id index');

    await sql`CREATE INDEX idx_planning_tasks_date ON planning_tasks(task_date)`;
    console.log('✓ Created task_date index');

    await sql`CREATE INDEX idx_planning_tasks_row_index ON planning_tasks(row_index)`;
    console.log('✓ Created row_index index');

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

    console.log('\nPlanning tasks schema updated successfully!');
  } catch (error) {
    console.error('Error updating planning tasks schema:', error);
    process.exit(1);
  }
}

updatePlanningSchema();
