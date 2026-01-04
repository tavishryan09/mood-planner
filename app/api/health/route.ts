import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: {
      DATABASE_URL: !!process.env.DATABASE_URL ? 'Set' : 'Missing',
      JWT_SECRET: !!process.env.JWT_SECRET ? 'Set' : 'Missing',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'Missing',
      MICROSOFT_CLIENT_ID: !!process.env.MICROSOFT_CLIENT_ID ? 'Set' : 'Missing',
      MICROSOFT_CLIENT_SECRET: !!process.env.MICROSOFT_CLIENT_SECRET ? 'Set' : 'Missing',
      MICROSOFT_REDIRECT_URI: process.env.MICROSOFT_REDIRECT_URI || 'Missing',
    }
  };

  // Test database connection
  try {
    const result = await sql`SELECT NOW() as current_time`;
    checks.database = {
      status: 'Connected',
      currentTime: result[0].current_time
    };
  } catch (error) {
    checks.database = {
      status: 'Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Test user table
  try {
    const users = await sql`SELECT COUNT(*) as count FROM users`;
    checks.users = {
      status: 'OK',
      count: users[0].count
    };
  } catch (error) {
    checks.users = {
      status: 'Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Check for admin user
  try {
    const adminUser = await sql`
      SELECT id, name, email, role
      FROM users
      WHERE email = 'tavishryan@gmail.com'
    `;
    checks.adminUser = {
      status: adminUser.length > 0 ? 'Found' : 'Not Found',
      exists: adminUser.length > 0,
      ...(adminUser.length > 0 && {
        id: adminUser[0].id,
        name: adminUser[0].name,
        email: adminUser[0].email,
        role: adminUser[0].role
      })
    };
  } catch (error) {
    checks.adminUser = {
      status: 'Error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  return NextResponse.json(checks, { status: 200 });
}
