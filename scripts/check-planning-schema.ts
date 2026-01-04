import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function checkSchema() {
  console.log('Checking planning_tasks table schema...\n');

  const columns = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'planning_tasks'
    ORDER BY ordinal_position
  `;

  console.log('Columns:');
  columns.forEach(col => {
    console.log(`  ${col.column_name}: ${col.data_type}`);
  });
}

checkSchema();
