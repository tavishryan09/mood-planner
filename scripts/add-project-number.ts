import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addProjectNumber() {
  console.log('Adding project_number column to projects table...');

  try {
    // Add project_number column if it doesn't exist
    await sql`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS project_number VARCHAR(50) UNIQUE
    `;
    console.log('✓ Added project_number column');

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Error adding project_number column:', error);
    process.exit(1);
  }
}

addProjectNumber();
