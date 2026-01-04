import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addShowAllProjectsPreference() {
  console.log('Adding show_all_projects preference column...');

  try {
    // Add show_all_projects column to dashboard_widget_settings
    await sql`
      ALTER TABLE dashboard_widget_settings
      ADD COLUMN IF NOT EXISTS show_all_projects BOOLEAN DEFAULT false
    `;
    console.log('✓ Added show_all_projects column');

    console.log('\nShow all projects preference column added successfully!');
  } catch (error) {
    console.error('Error adding show_all_projects preference:', error);
    process.exit(1);
  }
}

addShowAllProjectsPreference();
