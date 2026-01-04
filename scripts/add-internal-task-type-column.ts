import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addInternalTaskTypeColumn() {
  console.log('Adding internal_task_type_id column to planning_tasks...');

  try {
    // First, update the task_type CHECK constraint to include 'Internal'
    await sql`
      ALTER TABLE planning_tasks
      DROP CONSTRAINT IF EXISTS planning_tasks_task_type_check
    `;
    console.log('✓ Dropped old task_type constraint');

    await sql`
      ALTER TABLE planning_tasks
      ADD CONSTRAINT planning_tasks_task_type_check
      CHECK (task_type IN ('Project Task', 'Out of Office', 'Unavailable', 'PTO', 'Internal'))
    `;
    console.log('✓ Added new task_type constraint with Internal');

    // Add internal_task_type_id column
    await sql`
      ALTER TABLE planning_tasks
      ADD COLUMN IF NOT EXISTS internal_task_type_id INTEGER REFERENCES internal_task_types(id) ON DELETE SET NULL
    `;
    console.log('✓ Added internal_task_type_id column');

    // Create index
    await sql`
      CREATE INDEX IF NOT EXISTS idx_planning_tasks_internal_task_type_id
      ON planning_tasks(internal_task_type_id)
    `;
    console.log('✓ Created internal_task_type_id index');

    console.log('\n✓ Successfully added internal task type support to planning_tasks!');
  } catch (error) {
    console.error('Error adding internal task type column:', error);
    process.exit(1);
  }
}

addInternalTaskTypeColumn();
