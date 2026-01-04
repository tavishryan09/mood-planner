import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function initPlanningUserSettings() {
  console.log('Creating planning user display settings table...');

  try {
    // Create planning_user_display_settings table
    await sql`
      CREATE TABLE IF NOT EXISTS planning_user_display_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        visible BOOLEAN NOT NULL DEFAULT true,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, target_user_id)
      )
    `;

    console.log('✓ Created planning_user_display_settings table');

    // Create index for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_planning_user_display_settings_user_id
      ON planning_user_display_settings(user_id)
    `;

    console.log('✓ Created index on user_id');

    console.log('\n✓ Planning user display settings table initialized successfully!');
  } catch (error) {
    console.error('Error initializing planning user display settings:', error);
    process.exit(1);
  }
}

initPlanningUserSettings();
