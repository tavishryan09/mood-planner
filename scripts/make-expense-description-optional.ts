import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function makeExpenseDescriptionOptional() {
  try {
    console.log('Making expense description column nullable...');

    await sql`
      ALTER TABLE expenses
      ALTER COLUMN description DROP NOT NULL
    `;

    console.log('Successfully made expense description optional');
  } catch (error) {
    console.error('Error making description optional:', error);
    throw error;
  }
}

makeExpenseDescriptionOptional()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
