import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function checkConstraints() {
  try {
    const constraints = await sql`
      SELECT
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'planning_preferences'::regclass
    `;

    console.log('Constraints on planning_preferences table:');
    console.log(constraints);

    const indexes = await sql`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'planning_preferences'
    `;

    console.log('\nIndexes on planning_preferences table:');
    console.log(indexes);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkConstraints();
