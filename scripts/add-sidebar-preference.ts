import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addSidebarPreference() {
  console.log('Adding sidebar_open column to users table...');

  try {
    // Add sidebar_open column with default value of false
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS sidebar_open BOOLEAN DEFAULT false
    `;

    console.log('✓ Added sidebar_open column to users table');

    console.log('\n✓ Migration completed successfully!');
  } catch (error) {
    console.error('Error adding sidebar preference:', error);
    process.exit(1);
  }
}

addSidebarPreference();
