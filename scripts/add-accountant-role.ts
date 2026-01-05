import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addAccountantRole() {
  console.log('Adding Accountant role to users table...');

  try {
    // Drop the old constraint
    await sql`
      ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_role_check
    `;
    console.log('✓ Dropped old role constraint');

    // Add new constraint with Accountant role
    await sql`
      ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('Admin', 'Manager', 'Designer', 'Accountant'))
    `;
    console.log('✓ Added new role constraint with Accountant role');

    console.log('\nAccountant role added successfully!');
  } catch (error) {
    console.error('Error adding Accountant role:', error);
    process.exit(1);
  }
}

addAccountantRole();
