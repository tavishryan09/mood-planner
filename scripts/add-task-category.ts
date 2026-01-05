import { neon } from '@neondatabase/serverless';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function addCategoryColumn() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);

  console.log('Adding category column to project_tasks table...\n');

  try {
    await sql`
      ALTER TABLE project_tasks
      ADD COLUMN IF NOT EXISTS category VARCHAR(100)
    `;

    console.log('✅ Successfully added category column');
    process.exit(0);
  } catch (error: any) {
    if (error.code === '42701') {
      console.log('✓ Column already exists');
      process.exit(0);
    } else {
      console.error('❌ Error adding column:', error);
      process.exit(1);
    }
  }
}

addCategoryColumn().catch(console.error);
