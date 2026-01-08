import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function testUpsert() {
  try {
    console.log('Testing different UPSERT variations...\n');

    // Check current value
    const before = await sql`
      SELECT user_id, compact_view, updated_at
      FROM planning_preferences
      WHERE user_id = 1
    `;
    console.log('Before:', before[0]);

    // Try a simple UPDATE instead
    console.log('\n=== Test 1: Simple UPDATE ===');
    await sql`
      UPDATE planning_preferences
      SET compact_view = false, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = 1
    `;

    const after1 = await sql`
      SELECT user_id, compact_view, updated_at
      FROM planning_preferences
      WHERE user_id = 1
    `;
    console.log('After simple UPDATE:', after1[0]);

  } catch (error) {
    console.error('Error:', error);
  }
}

testUpsert();
