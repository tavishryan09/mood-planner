import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addOutlookEventId() {
  try {
    console.log('Adding outlook_event_id column to planning_tasks table...');

    // Add outlook_event_id column to planning_tasks
    await sql`
      ALTER TABLE planning_tasks
      ADD COLUMN IF NOT EXISTS outlook_event_id TEXT
    `;

    console.log('Successfully added outlook_event_id column to planning_tasks');

    console.log('Adding outlook_event_id column to milestone_tasks table...');

    // Add outlook_event_id column to milestone_tasks
    await sql`
      ALTER TABLE milestone_tasks
      ADD COLUMN IF NOT EXISTS outlook_event_id TEXT
    `;

    console.log('Successfully added outlook_event_id column to milestone_tasks');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding outlook_event_id columns:', error);
    process.exit(1);
  }
}

addOutlookEventId();
