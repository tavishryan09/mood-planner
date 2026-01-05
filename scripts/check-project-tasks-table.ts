import { neon } from '@neondatabase/serverless';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function checkTable() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);

  console.log('Checking if project_tasks table exists...\n');

  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'project_tasks'
      );
    `;

    console.log('Query result:', result);

    if (result[0].exists) {
      console.log('✅ project_tasks table exists');

      // Check table structure
      const columns = await sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'project_tasks'
        ORDER BY ordinal_position;
      `;

      console.log('\nTable columns:');
      columns.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('❌ project_tasks table does NOT exist');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error checking table:', error);
    process.exit(1);
  }
}

checkTable().catch(console.error);
