import { neon } from '@neondatabase/serverless';
import * as path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function createAdminUser() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);

  console.log('Creating initial admin user...\n');

  // Admin user details
  const name = 'Tavish Ryan';
  const email = 'tavishryan@gmail.com';
  const password = 'Password123!';
  const role = 'Admin';

  try {
    // Hash the password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert admin user (or update if exists)
    const result = await sql`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (${name}, ${email}, ${password_hash}, ${role})
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, name, email, role, created_at
    `;

    console.log('✓ Admin user created/updated successfully!');
    console.log('\nAdmin User Details:');
    console.log(`  Name: ${result[0].name}`);
    console.log(`  Email: ${result[0].email}`);
    console.log(`  Role: ${result[0].role}`);
    console.log(`  ID: ${result[0].id}`);
    console.log(`\nLogin Credentials:`);
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log('\n⚠️  Please change this password after first login!');
  } catch (error) {
    console.error('✗ Error creating admin user:', error);
    throw error;
  }
}

createAdminUser().catch(console.error);
