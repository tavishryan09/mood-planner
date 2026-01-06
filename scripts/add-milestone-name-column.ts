import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

import { sql } from '@/lib/db';

async function addMilestoneNameColumn() {
  try {
    console.log('Adding milestone_name column to milestone_tasks table...');

    // Add the milestone_name column if it doesn't exist
    await sql`
      ALTER TABLE milestone_tasks
      ADD COLUMN IF NOT EXISTS milestone_name TEXT
    `;

    console.log('Successfully added milestone_name column!');
  } catch (error) {
    console.error('Error adding milestone_name column:', error);
    throw error;
  }
}

addMilestoneNameColumn()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
