import { neon } from '@neondatabase/serverless';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function createTable() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);

  console.log('Creating project_task_assignments table...\n');

  try {
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS project_task_assignments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(task_id, user_id)
      )
    `;

    console.log('✓ Created project_task_assignments table');

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON project_task_assignments(task_id)
    `;

    console.log('✓ Created index on task_id');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON project_task_assignments(user_id)
    `;

    console.log('✓ Created index on user_id');

    console.log('\n✅ project_task_assignments table created successfully');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
}

createTable().catch(console.error);
