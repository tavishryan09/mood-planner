import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function initExpensesDB() {
  console.log('Initializing expenses database...');

  try {
    // Create expenses table
    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        expense_date DATE NOT NULL,
        category VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Created expenses table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id)`;
    console.log('✓ Created user_id index');

    await sql`CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id)`;
    console.log('✓ Created project_id index');

    await sql`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date)`;
    console.log('✓ Created expense_date index');

    await sql`CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category)`;
    console.log('✓ Created category index');

    // Create update trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_expenses_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS trigger_update_expenses_updated_at ON expenses
    `;

    await sql`
      CREATE TRIGGER trigger_update_expenses_updated_at
      BEFORE UPDATE ON expenses
      FOR EACH ROW
      EXECUTE FUNCTION update_expenses_updated_at()
    `;
    console.log('✓ Created update trigger');

    console.log('\nExpenses database initialized successfully!');
  } catch (error) {
    console.error('Error initializing expenses database:', error);
    process.exit(1);
  }
}

initExpensesDB();
