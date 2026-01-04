import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function initInternalTaskTypes() {
  console.log('Initializing internal task types table...');

  try {
    // Create internal_task_types table
    await sql`
      CREATE TABLE IF NOT EXISTS internal_task_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Created internal_task_types table');

    // Insert default internal task types
    await sql`
      INSERT INTO internal_task_types (name)
      VALUES ('Admin'), ('Marketing')
      ON CONFLICT (name) DO NOTHING
    `;
    console.log('✓ Inserted default internal task types');

    // Create index
    await sql`CREATE INDEX IF NOT EXISTS idx_internal_task_types_name ON internal_task_types(name)`;
    console.log('✓ Created name index');

    // Create update trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_internal_task_types_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS trigger_update_internal_task_types_updated_at ON internal_task_types
    `;

    await sql`
      CREATE TRIGGER trigger_update_internal_task_types_updated_at
      BEFORE UPDATE ON internal_task_types
      FOR EACH ROW
      EXECUTE FUNCTION update_internal_task_types_updated_at()
    `;
    console.log('✓ Created update trigger');

    console.log('\n✓ Internal task types table initialized successfully!');
  } catch (error) {
    console.error('Error initializing internal task types table:', error);
    process.exit(1);
  }
}

initInternalTaskTypes();
