import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function checkDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);

  try {
    // Check if clients table exists
    const result = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'clients'
    `;

    if (result.length > 0) {
      console.log('✓ Clients table exists');

      // Get row count
      const count = await sql`SELECT COUNT(*) as count FROM clients`;
      console.log(`✓ Clients table has ${count[0].count} rows`);
    } else {
      console.log('✗ Clients table does not exist');
      console.log('Run: npm run init-db to create the table');
    }
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkDatabase().catch(console.error);
