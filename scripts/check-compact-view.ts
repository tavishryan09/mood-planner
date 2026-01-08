import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function checkCompactView() {
  try {
    // Check if column exists
    const columns = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'planning_preferences'
      ORDER BY ordinal_position
    `;

    console.log('Planning preferences table columns:');
    console.log(columns);

    // Check current data
    const prefs = await sql`
      SELECT user_id, show_instructions, compact_view
      FROM planning_preferences
    `;

    console.log('\nCurrent preferences data:');
    console.log(prefs);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkCompactView();
