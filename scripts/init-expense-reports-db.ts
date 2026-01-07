import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function initExpenseReportsDB() {
  console.log('Initializing expense reports database...');

  try {
    // Create expense_reports table
    await sql`
      CREATE TABLE IF NOT EXISTS expense_reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        report_name VARCHAR(255) NOT NULL,
        submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Submitted',
        total_amount DECIMAL(12, 2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Created expense_reports table');

    // Create expense_report_items junction table
    await sql`
      CREATE TABLE IF NOT EXISTS expense_report_items (
        id SERIAL PRIMARY KEY,
        expense_report_id INTEGER NOT NULL REFERENCES expense_reports(id) ON DELETE CASCADE,
        expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(expense_report_id, expense_id)
      )
    `;
    console.log('✓ Created expense_report_items table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_expense_reports_user_id ON expense_reports(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_expense_reports_status ON expense_reports(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_expense_reports_date ON expense_reports(submission_date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_expense_report_items_report_id ON expense_report_items(expense_report_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_expense_report_items_expense_id ON expense_report_items(expense_id)`;
    console.log('✓ Created indexes');

    // Add status constraint
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'expense_reports_status_check'
        ) THEN
          ALTER TABLE expense_reports
          ADD CONSTRAINT expense_reports_status_check
          CHECK (status IN ('Submitted', 'In Review', 'Approved', 'Rejected', 'Paid'));
        END IF;
      END $$;
    `;
    console.log('✓ Added status constraint');

    // Create trigger for updated_at
    await sql`
      CREATE OR REPLACE FUNCTION update_expense_reports_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'expense_reports_updated_at_trigger'
        ) THEN
          CREATE TRIGGER expense_reports_updated_at_trigger
          BEFORE UPDATE ON expense_reports
          FOR EACH ROW
          EXECUTE FUNCTION update_expense_reports_updated_at();
        END IF;
      END $$;
    `;
    console.log('✓ Created updated_at trigger');

    console.log('Expense reports database initialization complete!');
  } catch (error) {
    console.error('Error initializing expense reports database:', error);
    throw error;
  }
}

initExpenseReportsDB()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
