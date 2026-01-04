import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addExpenseReceipt() {
  console.log('Adding receipt_image column to expenses table...');

  try {
    // Add receipt_image column (stores base64 encoded image)
    await sql`
      ALTER TABLE expenses
      ADD COLUMN IF NOT EXISTS receipt_image TEXT
    `;
    console.log('✓ Added receipt_image column');

    // Add receipt_filename column to store original filename
    await sql`
      ALTER TABLE expenses
      ADD COLUMN IF NOT EXISTS receipt_filename VARCHAR(255)
    `;
    console.log('✓ Added receipt_filename column');

    console.log('\nExpense receipt columns added successfully!');
  } catch (error) {
    console.error('Error adding expense receipt columns:', error);
    process.exit(1);
  }
}

addExpenseReceipt();
