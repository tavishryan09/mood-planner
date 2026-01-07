import { sql } from '../lib/db';

async function addArchivedColumn() {
  try {
    console.log('Adding archived column to projects table...');

    await sql`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE
    `;

    console.log('✓ Successfully added archived column to projects table');
    process.exit(0);
  } catch (error) {
    console.error('Error adding archived column:', error);
    process.exit(1);
  }
}

addArchivedColumn();
