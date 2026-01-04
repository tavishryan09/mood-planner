import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addPTOToConstraint() {
  try {
    console.log('Updating task_type constraint to include PTO...');

    // Drop the old constraint
    await sql`
      ALTER TABLE planning_tasks
      DROP CONSTRAINT IF EXISTS planning_tasks_task_type_check
    `;

    console.log('✓ Dropped old constraint');

    // Add new constraint with PTO included
    await sql`
      ALTER TABLE planning_tasks
      ADD CONSTRAINT planning_tasks_task_type_check
      CHECK (task_type IN ('Project Task', 'Out of Office', 'Unavailable', 'PTO'))
    `;

    console.log('✓ Added new constraint with PTO');
    console.log('\n✅ Successfully updated task_type constraint!');
  } catch (error) {
    console.error('Error updating constraint:', error);
    throw error;
  }
}

addPTOToConstraint()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
