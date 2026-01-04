import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function initProjectsColumnPreferences() {
  console.log('Initializing projects column preferences table...');

  try {
    // Create projects_column_preferences table
    await sql`
      CREATE TABLE IF NOT EXISTS projects_column_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        column_settings JSONB NOT NULL DEFAULT '{
          "projectNumber": true,
          "projectName": true,
          "clientName": true,
          "commonName": true,
          "projectValue": true,
          "estimatedBillable": true,
          "billablePercent": true,
          "totalHours": true,
          "hoursThisWeek": true,
          "hoursThisMonth": true,
          "hoursThisQuarter": true
        }'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `;
    console.log('✓ Created projects_column_preferences table');

    // Create index
    await sql`CREATE INDEX IF NOT EXISTS idx_projects_column_preferences_user_id ON projects_column_preferences(user_id)`;
    console.log('✓ Created user_id index');

    // Create update trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_projects_column_preferences_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS trigger_update_projects_column_preferences_updated_at ON projects_column_preferences
    `;

    await sql`
      CREATE TRIGGER trigger_update_projects_column_preferences_updated_at
      BEFORE UPDATE ON projects_column_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_projects_column_preferences_updated_at()
    `;
    console.log('✓ Created update trigger');

    console.log('\n✓ Projects column preferences table initialized successfully!');
  } catch (error) {
    console.error('Error initializing projects column preferences table:', error);
    process.exit(1);
  }
}

initProjectsColumnPreferences();
