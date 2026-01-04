import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addRowSpan() {
  console.log('Adding row_span column to planning_tasks table...');

  try {
    // Add row_span column with default value of 1
    await sql`
      ALTER TABLE planning_tasks
      ADD COLUMN IF NOT EXISTS row_span INTEGER DEFAULT 1 CHECK (row_span >= 1 AND row_span <= 4)
    `;
    console.log('✓ Added row_span column');

    // Update existing tasks to have row_span = 1
    await sql`
      UPDATE planning_tasks
      SET row_span = 1
      WHERE row_span IS NULL
    `;
    console.log('✓ Updated existing tasks');

    console.log('\nrow_span column added successfully!');
  } catch (error) {
    console.error('Error adding row_span column:', error);
    process.exit(1);
  }
}

addRowSpan();
