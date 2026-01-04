import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addRowIndex() {
  console.log('Adding row_index column to planning_tasks table...');

  try {
    // Add row_index column
    await sql`
      ALTER TABLE planning_tasks
      ADD COLUMN IF NOT EXISTS row_index INTEGER NOT NULL DEFAULT 0
      CHECK (row_index >= 0 AND row_index <= 3)
    `;
    console.log('✓ Added row_index column');

    // Create index on row_index
    await sql`CREATE INDEX IF NOT EXISTS idx_planning_tasks_row_index ON planning_tasks(row_index)`;
    console.log('✓ Created row_index index');

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

addRowIndex();
