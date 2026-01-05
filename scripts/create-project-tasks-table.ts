import { neon } from '@neondatabase/serverless';
import * as path from 'path';
import * as fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function createTable() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);

  console.log('Creating project_tasks table...\n');

  try {
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS project_tasks (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        task_name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'completed', 'blocked')),
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✓ Created project_tasks table');

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id)
    `;

    console.log('✓ Created index on project_id');

    await sql`
      CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON project_tasks(assigned_to)
    `;

    console.log('✓ Created index on assigned_to');

    console.log('\n✅ project_tasks table created successfully');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
}

createTable().catch(console.error);
