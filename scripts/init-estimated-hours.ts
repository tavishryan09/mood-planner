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

  await sql`
    CREATE TABLE IF NOT EXISTS user_estimated_hours (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      estimated_hours DECIMAL(10, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, project_id)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_user_estimated_hours_user_id ON user_estimated_hours(user_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_user_estimated_hours_project_id ON user_estimated_hours(project_id)
  `;

  console.log('Migration complete: user_estimated_hours table created');
}

run().catch(e => { console.error(e); process.exit(1); });
