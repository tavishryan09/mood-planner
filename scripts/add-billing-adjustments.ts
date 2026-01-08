import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addBillingAdjustments() {
  console.log('Adding billing adjustment columns to projects table...');

  try {
    await sql`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS currently_billed DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS adjustment_date DATE
    `;
    console.log('✓ Added currently_billed and adjustment_date columns');

    console.log('\nBilling adjustment columns added successfully!');
  } catch (error) {
    console.error('Error adding billing adjustment columns:', error);
    process.exit(1);
  }
}

addBillingAdjustments();
