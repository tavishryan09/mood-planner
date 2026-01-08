import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function debugColumn() {
  try {
    // Try different variations of the query
    console.log('=== Test 1: Select with snake_case ===');
    const test1 = await sql`
      SELECT user_id, show_instructions, compact_view
      FROM planning_preferences
      WHERE user_id = 1
    `;
    console.log(test1);

    console.log('\n=== Test 2: Select with AS aliases ===');
    const test2 = await sql`
      SELECT
        user_id,
        show_instructions as "showInstructions",
        compact_view as "compactView"
      FROM planning_preferences
      WHERE user_id = 1
    `;
    console.log(test2);

    console.log('\n=== Test 3: Raw column names ===');
    const test3 = await sql`
      SELECT *
      FROM planning_preferences
      WHERE user_id = 1
    `;
    console.log(test3);

  } catch (error) {
    console.error('Error:', error);
  }
}

debugColumn();
