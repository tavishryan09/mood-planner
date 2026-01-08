import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function checkUser() {
  try {
    const users = await sql`
      SELECT id, name, email, role
      FROM users
      ORDER BY id
    `;

    console.log('All users:');
    console.log(users);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUser();
