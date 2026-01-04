import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addTaskCompleted() {
  console.log('Adding completed column to planning_tasks table...');

  try {
    // Add completed column
    await sql`
      ALTER TABLE planning_tasks
      ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE
    `;
    console.log('✓ Added completed column');

    // Create index for quick filtering
    await sql`CREATE INDEX IF NOT EXISTS idx_planning_tasks_completed ON planning_tasks(completed)`;
    console.log('✓ Created completed index');

    console.log('\nCompleted column added successfully!');
  } catch (error) {
    console.error('Error adding completed column:', error);
    process.exit(1);
  }
}

addTaskCompleted();
