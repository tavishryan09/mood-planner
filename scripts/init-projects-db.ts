import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function initProjectsDB() {
  console.log('Initializing projects database...');

  try {
    // Create projects table
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        project_number VARCHAR(50) UNIQUE,
        project_name VARCHAR(255) NOT NULL,
        client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        common_name VARCHAR(255),
        project_value DECIMAL(12, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Created projects table');

    // Create index on client_id
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id)`;
    console.log('✓ Created client_id index');

    // Create update trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_projects_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS trigger_update_projects_updated_at ON projects
    `;

    await sql`
      CREATE TRIGGER trigger_update_projects_updated_at
      BEFORE UPDATE ON projects
      FOR EACH ROW
      EXECUTE FUNCTION update_projects_updated_at()
    `;
    console.log('✓ Created update trigger');

    console.log('\nProjects database initialized successfully!');
  } catch (error) {
    console.error('Error initializing projects database:', error);
    process.exit(1);
  }
}

initProjectsDB();
