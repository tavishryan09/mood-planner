import { neon, NeonQueryFunction } from '@neondatabase/serverless';

// Lazy-load database connection to avoid build-time errors
let _sql: NeonQueryFunction<false, false> | null = null;

function getSQL(): NeonQueryFunction<false, false> {
  if (!_sql) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _sql = neon(databaseUrl);
  }
  return _sql;
}

// Export a Proxy that lazily initializes the connection
export const sql = new Proxy({} as NeonQueryFunction<false, false>, {
  apply(target, thisArg, args) {
    return getSQL().apply(thisArg, args as any);
  },
  get(target, prop) {
    return (getSQL() as any)[prop];
  }
});

// Example query function
// Note: This function is deprecated. Use sql template literals instead.
// Example: await sql`SELECT * FROM users WHERE id = ${userId}`
export async function query(text: string, params?: unknown[]) {
  // @ts-expect-error - Legacy function for backwards compatibility
  return await sql(text, params);
}
