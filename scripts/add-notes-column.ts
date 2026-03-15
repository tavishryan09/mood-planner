import { neon } from '@neondatabase/serverless';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not set');
  }
  const sql = neon(databaseUrl);
  await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT`;
  console.log('Migration complete: notes column added to projects table');
}

run().catch(e => { console.error(e); process.exit(1); });
