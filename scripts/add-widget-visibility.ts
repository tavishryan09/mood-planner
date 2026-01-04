import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addWidgetVisibility() {
  console.log('Adding visible column to dashboard_widget_settings table...');

  try {
    // Add visible column with default true
    await sql`
      ALTER TABLE dashboard_widget_settings
      ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT true NOT NULL
    `;
    console.log('✓ Added visible column to dashboard_widget_settings table');

    // Set all existing widgets to visible
    await sql`
      UPDATE dashboard_widget_settings
      SET visible = true
      WHERE visible IS NULL
    `;
    console.log('✓ Set all existing widgets to visible');

    console.log('\nWidget visibility column added successfully!');
  } catch (error) {
    console.error('Error adding widget visibility:', error);
    process.exit(1);
  }
}

addWidgetVisibility();
