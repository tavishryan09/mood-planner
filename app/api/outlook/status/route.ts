import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    const user = await sql`
      SELECT
        outlook_connected,
        outlook_email,
        outlook_sync_enabled
      FROM users
      WHERE id = ${payload.userId}
    `;

    if (!user[0]) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      connected: user[0].outlook_connected || false,
      email: user[0].outlook_email,
      syncEnabled: user[0].outlook_sync_enabled !== false,
    });
  } catch (error) {
    console.error('Error fetching Outlook status:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
