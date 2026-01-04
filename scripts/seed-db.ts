import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function seedDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);

  console.log('Seeding database with sample clients...');

  try {
    // Insert sample clients
    await sql`
      INSERT INTO clients (business_name, business_address, website, primary_contact, email, phone, avatar)
      VALUES
        ('Acme Corporation', '123 Main St, New York, NY 10001', 'www.acme.com', 'John Smith', 'john@acme.com', '(555) 123-4567', 'AC'),
        ('TechStart Inc', '456 Tech Ave, San Francisco, CA 94102', 'www.techstart.io', 'Sarah Johnson', 'sarah@techstart.io', '(555) 234-5678', 'TS'),
        ('Global Solutions', '789 Business Blvd, Austin, TX 78701', 'www.globalsolutions.com', 'Michael Chen', 'michael@globalsolutions.com', '(555) 345-6789', 'GS')
      ON CONFLICT DO NOTHING
    `;

    console.log('✓ Successfully seeded database with sample clients');

    // Show count
    const count = await sql`SELECT COUNT(*) as count FROM clients`;
    console.log(`✓ Database now has ${count[0].count} clients`);
  } catch (error) {
    console.error('✗ Error seeding database:', error);
    throw error;
  }
}

seedDatabase().catch(console.error);
