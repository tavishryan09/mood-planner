import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addBillingRate() {
  console.log('Adding billing_rate column to users table...');

  try {
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS billing_rate DECIMAL(10, 2) DEFAULT 0.00
    `;
    console.log('✓ Added billing_rate column');

    console.log('\nBilling rate column added successfully!');
  } catch (error) {
    console.error('Error adding billing_rate column:', error);
    process.exit(1);
  }
}

addBillingRate();
