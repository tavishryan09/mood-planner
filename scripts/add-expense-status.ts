import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function addExpenseStatus() {
  try {
    console.log('Adding status column to expenses table...');

    // Add status column with default value
    await sql`
      ALTER TABLE expenses
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Unsubmitted'
    `;

    console.log('✓ Status column added successfully');

    // Add check constraint for valid status values
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'expenses_status_check'
        ) THEN
          ALTER TABLE expenses
          ADD CONSTRAINT expenses_status_check
          CHECK (status IN (
            'Unsubmitted',
            'Submitted',
            'In Review',
            'Approved',
            'Rejected',
            'Pending Payment',
            'Posted',
            'Paid'
          ));
        END IF;
      END $$;
    `;

    console.log('✓ Status constraint added successfully');

    // Verify the change
    const result = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'expenses' AND column_name = 'status'
    `;

    console.log('\nStatus column details:', result[0]);
    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addExpenseStatus();
