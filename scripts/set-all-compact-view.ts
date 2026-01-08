import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function setAllCompactView() {
  try {
    console.log('Setting compact_view to TRUE for all users...\n');

    // Update all users to have compact_view = true
    await sql`
      UPDATE planning_preferences
      SET compact_view = true
    `;

    // Verify the update
    const prefs = await sql`
      SELECT user_id, show_instructions, compact_view
      FROM planning_preferences
      ORDER BY user_id
    `;

    console.log('Updated preferences:');
    console.log(prefs);

  } catch (error) {
    console.error('Error:', error);
  }
}

setAllCompactView();
