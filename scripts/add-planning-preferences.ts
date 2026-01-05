import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addPlanningPreferences() {
  console.log('Creating planning_preferences table...');

  try {
    // Create planning_preferences table
    await sql`
      CREATE TABLE IF NOT EXISTS planning_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        show_instructions BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `;

    console.log('✓ Created planning_preferences table');

    // Create index for faster lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_planning_preferences_user_id
      ON planning_preferences(user_id)
    `;

    console.log('✓ Created index on user_id');

    console.log('\n✓ Planning preferences table initialized successfully!');
  } catch (error) {
    console.error('Error initializing planning preferences:', error);
    process.exit(1);
  }
}

addPlanningPreferences();
