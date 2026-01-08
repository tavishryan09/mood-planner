import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addCompactView() {
  console.log('Adding compact_view column to planning_preferences table...');

  try {
    await sql`
      ALTER TABLE planning_preferences
      ADD COLUMN IF NOT EXISTS compact_view BOOLEAN DEFAULT FALSE
    `;
    console.log('✓ Added compact_view column');

    console.log('\nCompact view column added successfully!');
  } catch (error) {
    console.error('Error adding compact_view column:', error);
    process.exit(1);
  }
}

addCompactView();
