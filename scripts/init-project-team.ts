import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function initProjectTeam() {
  console.log('Initializing project team members table...');

  try {
    // Create project_team_members table
    await sql`
      CREATE TABLE IF NOT EXISTS project_team_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, user_id)
      )
    `;
    console.log('✓ Created project_team_members table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_project_team_project_id ON project_team_members(project_id)`;
    console.log('✓ Created project_id index');

    await sql`CREATE INDEX IF NOT EXISTS idx_project_team_user_id ON project_team_members(user_id)`;
    console.log('✓ Created user_id index');

    console.log('\nProject team members table initialized successfully!');
  } catch (error) {
    console.error('Error initializing project team members table:', error);
    process.exit(1);
  }
}

initProjectTeam();
