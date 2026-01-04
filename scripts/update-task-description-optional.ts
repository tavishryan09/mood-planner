import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function updateTaskDescriptionOptional() {
  try {
    console.log('Making task_description column optional...');

    await sql`
      ALTER TABLE planning_tasks
      ALTER COLUMN task_description DROP NOT NULL
    `;

    console.log('✅ Successfully updated task_description to be optional');
  } catch (error) {
    console.error('Error updating schema:', error);
    throw error;
  }
}

updateTaskDescriptionOptional()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
