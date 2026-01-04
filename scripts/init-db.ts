import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);

  // Read the schema file
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  // Split by semicolons and execute each statement
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log('Initializing database...');

  // Execute all statements in a single transaction
  try {
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        business_name VARCHAR(255) NOT NULL,
        business_address TEXT,
        website VARCHAR(255),
        primary_contact VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        avatar VARCHAR(10),
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Created clients table');

    // Add avatar_url column if it doesn't exist (for existing databases)
    await sql.unsafe(`
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS avatar_url TEXT
    `);
    console.log('✓ Added avatar_url column');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_clients_business_name ON clients(business_name)`;
    console.log('✓ Created business_name index');

    await sql`CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email)`;
    console.log('✓ Created email index');

    // Create or replace the update function
    await sql.unsafe(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('✓ Created update function');

    // Drop trigger if exists and create new one
    await sql.unsafe(`DROP TRIGGER IF EXISTS update_clients_updated_at ON clients`);
    await sql.unsafe(`
      CREATE TRIGGER update_clients_updated_at
      BEFORE UPDATE ON clients
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
    console.log('✓ Created update trigger');

    console.log('\nDatabase initialized successfully!');
  } catch (error) {
    console.error('✗ Error during initialization:', error);
    throw error;
  }
}

initDatabase().catch(console.error);
