import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addCanManageUsers() {
  console.log('Adding can_manage_users column to users table...');

  try {
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS can_manage_users BOOLEAN DEFAULT FALSE
    `;
    console.log('✓ Added can_manage_users column');

    // Admins implicitly have this permission, but set it for consistency
    await sql`
      UPDATE users SET can_manage_users = TRUE WHERE role = 'Admin'
    `;
    console.log('✓ Set can_manage_users = TRUE for all Admin users');

    console.log('\ncan_manage_users column added successfully!');
  } catch (error) {
    console.error('Error adding can_manage_users column:', error);
    process.exit(1);
  }
}

addCanManageUsers();
