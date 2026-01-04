import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function initDashboardWidgetSettings() {
  console.log('Initializing dashboard widget settings table...');

  try {
    // Create dashboard_widget_settings table
    await sql`
      CREATE TABLE IF NOT EXISTS dashboard_widget_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        widget_id VARCHAR(50) NOT NULL,
        widget_name VARCHAR(100) NOT NULL,
        width VARCHAR(10) NOT NULL CHECK (width IN ('full', '1/2', '1/3', '1/4')),
        display_order INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, widget_id)
      )
    `;
    console.log('✓ Created dashboard_widget_settings table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_dashboard_widget_settings_user_id ON dashboard_widget_settings(user_id)`;
    console.log('✓ Created user_id index');

    await sql`CREATE INDEX IF NOT EXISTS idx_dashboard_widget_settings_order ON dashboard_widget_settings(user_id, display_order)`;
    console.log('✓ Created display_order index');

    // Create update trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_dashboard_widget_settings_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS trigger_update_dashboard_widget_settings_updated_at ON dashboard_widget_settings
    `;

    await sql`
      CREATE TRIGGER trigger_update_dashboard_widget_settings_updated_at
      BEFORE UPDATE ON dashboard_widget_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_dashboard_widget_settings_updated_at()
    `;
    console.log('✓ Created update trigger');

    // Initialize default widget settings for all users
    const users = await sql`SELECT id FROM users ORDER BY id`;

    const defaultWidgets = [
      { id: 'projects', name: 'My Current Projects', width: '1/3', order: 0 },
      { id: 'tasks', name: 'My Upcoming Tasks', width: '1/3', order: 1 },
      { id: 'milestones', name: 'Upcoming Deadlines/Milestones', width: '1/3', order: 2 },
      { id: 'team-tasks', name: 'Tasks by Team Member', width: 'full', order: 3 }
    ];

    for (const user of users) {
      for (const widget of defaultWidgets) {
        // Check if setting already exists
        const existing = await sql`
          SELECT id FROM dashboard_widget_settings
          WHERE user_id = ${user.id} AND widget_id = ${widget.id}
        `;

        if (existing.length === 0) {
          await sql`
            INSERT INTO dashboard_widget_settings (user_id, widget_id, widget_name, width, display_order)
            VALUES (${user.id}, ${widget.id}, ${widget.name}, ${widget.width}, ${widget.order})
          `;
        }
      }
    }
    console.log('✓ Initialized default widget settings for all users');

    console.log('\nDashboard widget settings initialized successfully!');
  } catch (error) {
    console.error('Error initializing dashboard widget settings:', error);
    process.exit(1);
  }
}

initDashboardWidgetSettings();
