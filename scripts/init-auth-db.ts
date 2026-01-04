import { neon } from '@neondatabase/serverless';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function initAuthDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);

  console.log('Initializing authentication database...\n');

  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Manager', 'Designer')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Created users table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    console.log('✓ Created email index');

    await sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`;
    console.log('✓ Created role index');

    // Create trigger (uses existing update_updated_at_column function)
    await sql.unsafe(`DROP TRIGGER IF EXISTS update_users_updated_at ON users`);
    await sql.unsafe(`
      CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
    console.log('✓ Created update trigger');

    console.log('\nAuthentication database initialized successfully!');
  } catch (error) {
    console.error('✗ Error during initialization:', error);
    throw error;
  }
}

initAuthDatabase().catch(console.error);
