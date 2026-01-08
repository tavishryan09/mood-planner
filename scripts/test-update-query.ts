import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function testUpdateQuery() {
  try {
    console.log('Testing UPDATE query...\n');

    // First check current value
    const before = await sql`
      SELECT user_id, compact_view
      FROM planning_preferences
      WHERE user_id = 1
    `;
    console.log('Before update:', before[0]);

    // Run the same query the API is using
    const updates = ['compact_view'];
    const values = [1, false];

    const query = `
      INSERT INTO planning_preferences (user_id, ${updates.join(', ')})
      VALUES ($1, ${updates.map((_, i) => `$${i + 2}`).join(', ')})
      ON CONFLICT (user_id)
      DO UPDATE SET
        ${updates.map((col, i) => `${col} = $${i + 2}`).join(', ')},
        updated_at = CURRENT_TIMESTAMP
    `;

    console.log('\nQuery:', query);
    console.log('Values:', values);

    await sql.unsafe(query, values);
    console.log('\nQuery executed successfully');

    // Check after update
    const after = await sql`
      SELECT user_id, compact_view, updated_at
      FROM planning_preferences
      WHERE user_id = 1
    `;
    console.log('After update:', after[0]);

  } catch (error) {
    console.error('Error:', error);
  }
}

testUpdateQuery();
