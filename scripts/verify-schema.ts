import { neon } from '@neondatabase/serverless';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function verifySchema() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = neon(databaseUrl);

  console.log('Checking clients table schema...\n');

  try {
    // Get column information
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'clients'
      ORDER BY ordinal_position
    `;

    console.log('Columns in clients table:');
    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });

    // Check if avatar_url exists
    const hasAvatarUrl = columns.some((col: any) => col.column_name === 'avatar_url');

    if (hasAvatarUrl) {
      console.log('\n✓ avatar_url column exists');
    } else {
      console.log('\n✗ avatar_url column is missing');
    }

    // Try to fetch clients
    console.log('\nTrying to fetch clients...');
    const clients = await sql`
      SELECT
        id,
        business_name as "businessName",
        business_address as "businessAddress",
        website,
        primary_contact as "primaryContact",
        email,
        phone,
        avatar,
        avatar_url as "avatarUrl",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM clients
      ORDER BY created_at DESC
    `;
    console.log(`✓ Successfully fetched ${clients.length} clients`);

  } catch (error) {
    console.error('✗ Error:', error);
    throw error;
  }
}

verifySchema().catch(console.error);
