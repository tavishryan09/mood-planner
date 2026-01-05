import { neon } from '@neondatabase/serverless';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function createTable() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);

  console.log('Creating categories table...\n');

  try {
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        color VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✓ Created categories table');

    // Insert some default categories
    await sql`
      INSERT INTO categories (name, color)
      VALUES
        ('Design', 'badge-primary'),
        ('Development', 'badge-secondary'),
        ('Testing', 'badge-accent'),
        ('Marketing', 'badge-info'),
        ('Research', 'badge-success')
      ON CONFLICT (name) DO NOTHING
    `;

    console.log('✓ Added default categories');

    console.log('\n✅ categories table created successfully');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
}

createTable().catch(console.error);
