import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a database connection
export const sql = neon(process.env.DATABASE_URL);

// Example query function
export async function query(text: string, params?: unknown[]) {
  return await sql(text, params);
}
