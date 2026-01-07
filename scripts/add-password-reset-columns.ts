import { sql } from '@/lib/db';

async function addPasswordResetColumns() {
  try {
    console.log('Adding password reset columns...');

    // Add password_reset_token and password_reset_expires columns
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_reset_token TEXT,
      ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP
    `;

    console.log('Successfully added password reset columns');
    process.exit(0);
  } catch (error) {
    console.error('Error adding password reset columns:', error);
    process.exit(1);
  }
}

addPasswordResetColumns();
