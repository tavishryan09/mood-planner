import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addProjectBilling() {
  console.log('Adding billing rate fields to projects table...');

  try {
    // Add billing_rate column to projects table
    await sql`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS billing_rate DECIMAL(10, 2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS use_team_rates BOOLEAN DEFAULT false
    `;
    console.log('✓ Added billing_rate and use_team_rates columns to projects table');

    // Create project_team_rates table for per-team-member billing rates
    await sql`
      CREATE TABLE IF NOT EXISTS project_team_rates (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        billing_rate DECIMAL(10, 2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, user_id)
      )
    `;
    console.log('✓ Created project_team_rates table');

    console.log('\nProject billing tables updated successfully!');
  } catch (error) {
    console.error('Error updating project billing tables:', error);
    process.exit(1);
  }
}

addProjectBilling();
