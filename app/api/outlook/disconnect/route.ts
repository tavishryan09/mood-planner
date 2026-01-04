import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear Outlook tokens from database
    await sql`
      UPDATE users
      SET
        outlook_access_token = NULL,
        outlook_refresh_token = NULL,
        outlook_token_expires_at = NULL,
        outlook_connected = false,
        outlook_email = NULL
      WHERE id = ${payload.userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Outlook:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
