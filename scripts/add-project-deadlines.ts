import { neon } from '@neondatabase/serverless';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function addDeadlineColumns() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);

  console.log('Adding deadline columns to projects table...\n');

  try {
    await sql`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS deadline DATE,
      ADD COLUMN IF NOT EXISTS internal_deadline DATE
    `;

    console.log('✅ Successfully added deadline columns');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error adding columns:', error);
    process.exit(1);
  }
}

addDeadlineColumns().catch(console.error);
