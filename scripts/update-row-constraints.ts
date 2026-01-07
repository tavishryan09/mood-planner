import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function updateRowConstraints() {
  console.log('Updating row index constraints to allow dynamic row counts...');

  try {
    // Update planning_tasks constraint
    console.log('Dropping old planning_tasks_row_index_check constraint...');
    await sql`
      ALTER TABLE planning_tasks
      DROP CONSTRAINT IF EXISTS planning_tasks_row_index_check
    `;
    console.log('✓ Dropped old planning_tasks constraint');

    console.log('Adding new planning_tasks_row_index_check constraint (0-19)...');
    await sql`
      ALTER TABLE planning_tasks
      ADD CONSTRAINT planning_tasks_row_index_check
      CHECK (row_index >= 0 AND row_index < 20)
    `;
    console.log('✓ Added new planning_tasks constraint');

    // Update milestone_tasks constraint
    console.log('Dropping old milestone_tasks_row_index_check constraint...');
    await sql`
      ALTER TABLE milestone_tasks
      DROP CONSTRAINT IF EXISTS milestone_tasks_row_index_check
    `;
    console.log('✓ Dropped old milestone_tasks constraint');

    console.log('Adding new milestone_tasks_row_index_check constraint (0-19)...');
    await sql`
      ALTER TABLE milestone_tasks
      ADD CONSTRAINT milestone_tasks_row_index_check
      CHECK (row_index >= 0 AND row_index < 20)
    `;
    console.log('✓ Added new milestone_tasks constraint');

    console.log('\n✅ Row index constraints updated successfully!');
    console.log('Tasks can now be placed in rows 0-19');
  } catch (error) {
    console.error('Error updating row constraints:', error);
    process.exit(1);
  }
}

updateRowConstraints();
