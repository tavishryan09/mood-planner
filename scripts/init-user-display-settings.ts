import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function initUserDisplaySettings() {
  console.log('Initializing user display settings table...');

  try {
    // Create user_display_settings table
    await sql`
      CREATE TABLE IF NOT EXISTS user_display_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        visible BOOLEAN DEFAULT true,
        display_order INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, target_user_id)
      )
    `;
    console.log('✓ Created user_display_settings table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_user_display_settings_user_id ON user_display_settings(user_id)`;
    console.log('✓ Created user_id index');

    await sql`CREATE INDEX IF NOT EXISTS idx_user_display_settings_target_user_id ON user_display_settings(target_user_id)`;
    console.log('✓ Created target_user_id index');

    await sql`CREATE INDEX IF NOT EXISTS idx_user_display_settings_order ON user_display_settings(display_order)`;
    console.log('✓ Created display_order index');

    // Create update trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_user_display_settings_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS trigger_update_user_display_settings_updated_at ON user_display_settings
    `;

    await sql`
      CREATE TRIGGER trigger_update_user_display_settings_updated_at
      BEFORE UPDATE ON user_display_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_user_display_settings_updated_at()
    `;
    console.log('✓ Created update trigger');

    // Initialize default settings for all users
    const users = await sql`SELECT id FROM users ORDER BY id`;

    for (const currentUser of users) {
      // For each user, create settings for all other users (including themselves)
      for (let i = 0; i < users.length; i++) {
        const targetUser = users[i];

        // Check if setting already exists
        const existing = await sql`
          SELECT id FROM user_display_settings
          WHERE user_id = ${currentUser.id} AND target_user_id = ${targetUser.id}
        `;

        if (existing.length === 0) {
          await sql`
            INSERT INTO user_display_settings (user_id, target_user_id, visible, display_order)
            VALUES (${currentUser.id}, ${targetUser.id}, true, ${i})
          `;
        }
      }
    }
    console.log('✓ Initialized default settings for all users');

    console.log('\nUser display settings initialized successfully!');
  } catch (error) {
    console.error('Error initializing user display settings:', error);
    process.exit(1);
  }
}

initUserDisplaySettings();
