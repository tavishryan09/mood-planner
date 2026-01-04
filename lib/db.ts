import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a database connection
export const sql = neon(process.env.DATABASE_URL);

// Example query function
// Note: This function is deprecated. Use sql template literals instead.
// Example: await sql`SELECT * FROM users WHERE id = ${userId}`
export async function query(text: string, params?: unknown[]) {
  // @ts-expect-error - Legacy function for backwards compatibility
  return await sql(text, params);
}
