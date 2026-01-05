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

  console.log('Creating project_milestones table...\n');

  try {
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS project_milestones (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        milestone_name VARCHAR(255) NOT NULL,
        description TEXT,
        due_date DATE NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✓ Created project_milestones table');

    // Create index
    await sql`
      CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id)
    `;

    console.log('✓ Created index on project_id');

    console.log('\n✅ project_milestones table created successfully');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
}

createTable().catch(console.error);
