import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addOutlookIntegration() {
  try {
    console.log('Adding Outlook integration columns to users table...');

    // Add columns for Microsoft OAuth tokens
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS outlook_access_token TEXT,
      ADD COLUMN IF NOT EXISTS outlook_refresh_token TEXT,
      ADD COLUMN IF NOT EXISTS outlook_token_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS outlook_connected BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS outlook_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS outlook_sync_enabled BOOLEAN DEFAULT true
    `;

    console.log('✓ Outlook integration columns added successfully');

    // Verify the changes
    const result = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name LIKE 'outlook%'
      ORDER BY column_name
    `;

    console.log('\nOutlook columns added:');
    result.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addOutlookIntegration();
