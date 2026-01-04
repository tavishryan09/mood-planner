import { neon } from '@neondatabase/serverless';

// Get database URL - will be undefined during build, which is fine
const databaseUrl = process.env.DATABASE_URL;

// Create database connection
// This will be null during build time, but will work at runtime
export const sql = databaseUrl ? neon(databaseUrl) : (() => {
  throw new Error('DATABASE_URL environment variable is not set');
}) as any;

// Example query function
// Note: This function is deprecated. Use sql template literals instead.
// Example: await sql`SELECT * FROM users WHERE id = ${userId}`
export async function query(text: string, params?: unknown[]) {
  // @ts-expect-error - Legacy function for backwards compatibility
  return await sql(text, params);
}
