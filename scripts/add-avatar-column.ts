import { neon } from '@neondatabase/serverless';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function addAvatarColumn() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);

  console.log('Adding avatar_url column to clients table...\n');

  try {
    // Add the column directly
    await sql.unsafe(`
      ALTER TABLE clients
      ADD COLUMN avatar_url TEXT
    `);

    console.log('✓ Successfully added avatar_url column');

  } catch (error: any) {
    if (error.code === '42701') {
      console.log('✓ Column already exists');
    } else {
      console.error('✗ Error:', error);
      throw error;
    }
  }
}

addAvatarColumn().catch(console.error);
