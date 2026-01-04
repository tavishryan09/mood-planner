import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function initDashboardLayout() {
  console.log('Initializing dashboard layouts table...');

  try {
    // Create dashboard_layouts table
    await sql`
      CREATE TABLE IF NOT EXISTS dashboard_layouts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        widget_id VARCHAR(100) NOT NULL,
        position_x INTEGER NOT NULL DEFAULT 0,
        position_y INTEGER NOT NULL DEFAULT 0,
        width INTEGER NOT NULL DEFAULT 6,
        height INTEGER NOT NULL DEFAULT 4,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, widget_id)
      )
    `;
    console.log('✓ Created dashboard_layouts table');

    // Create index
    await sql`CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user_id ON dashboard_layouts(user_id)`;
    console.log('✓ Created user_id index');

    // Create trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_dashboard_layouts_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;
    console.log('✓ Created trigger function');

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS trigger_update_dashboard_layouts_updated_at ON dashboard_layouts
    `;
    await sql`
      CREATE TRIGGER trigger_update_dashboard_layouts_updated_at
      BEFORE UPDATE ON dashboard_layouts
      FOR EACH ROW
      EXECUTE FUNCTION update_dashboard_layouts_updated_at()
    `;
    console.log('✓ Created trigger');

    console.log('\nDashboard layouts table initialized successfully!');
  } catch (error) {
    console.error('Error initializing dashboard layouts table:', error);
    process.exit(1);
  }
}

initDashboardLayout();
