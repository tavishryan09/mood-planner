import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function setTaskDescriptionDefault() {
  try {
    console.log('Setting task_description to task_type for null values...');

    // Update existing null task_description values to be the task_type
    await sql`
      UPDATE planning_tasks
      SET task_description = task_type
      WHERE task_description IS NULL
    `;

    console.log('✅ Successfully set default task_description values');

    console.log('Creating trigger to auto-set task_description on insert/update...');

    // Create a function to automatically set task_description to task_type if it's null
    await sql`
      CREATE OR REPLACE FUNCTION set_task_description_default()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.task_description IS NULL THEN
          NEW.task_description = NEW.task_type;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Drop trigger if it exists
    await sql`
      DROP TRIGGER IF EXISTS trigger_set_task_description_default ON planning_tasks
    `;

    // Create trigger that runs before insert or update
    await sql`
      CREATE TRIGGER trigger_set_task_description_default
      BEFORE INSERT OR UPDATE ON planning_tasks
      FOR EACH ROW
      EXECUTE FUNCTION set_task_description_default()
    `;

    console.log('✅ Successfully created trigger');
    console.log('\nNow task_description will automatically be set to task_type when null');
  } catch (error) {
    console.error('Error setting task_description defaults:', error);
    throw error;
  }
}

setTaskDescriptionDefault()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
