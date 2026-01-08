import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function testApiResponse() {
  try {
    // Simulate what the API does for user 2
    const userId = 2;

    console.log(`Testing API response for user ${userId}...\n`);

    // This is what fetchPlanningPreferences does
    const result = await sql`
      SELECT
        show_instructions as "showInstructions",
        compact_view as "compactView"
      FROM planning_preferences
      WHERE user_id = ${userId}
    `;

    console.log('Query result:');
    console.log(JSON.stringify(result, null, 2));

    if (result.length === 0) {
      console.log('\nNo preferences found, would return defaults:');
      console.log({ showInstructions: true, compactView: false });
    } else {
      console.log('\nWould return:');
      console.log(result[0]);
    }

    // Now update compact_view to true for testing
    console.log('\n--- Setting compact_view to TRUE for user 2 ---');
    await sql`
      UPDATE planning_preferences
      SET compact_view = true
      WHERE user_id = ${userId}
    `;

    // Verify the update
    const updated = await sql`
      SELECT
        show_instructions as "showInstructions",
        compact_view as "compactView"
      FROM planning_preferences
      WHERE user_id = ${userId}
    `;

    console.log('After update:');
    console.log(updated[0]);

  } catch (error) {
    console.error('Error:', error);
  }
}

testApiResponse();
